// generateDetailedRoutes.js (CommonJS)
// Usage: node generateDetailedRoutes.js
// Requires: npm install @turf/turf

const fs = require('fs');
const turf = require('@turf/turf');

const ZONE_FILE = './zone.json';           // input OSM JSON (Overpass)
const OUTPUT_FILE = './flight_paths_detailed.json';
const NODE_COUNT = 10;                     // number of nodes to generate (you can replace with your fixed nodes)
const ROUTES_PER_PAIR = 3;                 // how many candidate routes per node pair
const WAYPOINTS_PER_ROUTE = 16;            // target waypoint count per route (before densifying)
const SAMPLES_PER_SEGMENT = 6;             // densify check samples per segment to test collision
const CLEARANCE = 6;                       // meters above building top as safety margin
const MAX_ATTEMPTS = 6;                    // attempts to fix a route (raise/offset) before giving up
const EARTH_METERS_PER_DEG = 111320;       // approx conversion for lon/lat deg <-> meters (latitude)

if (!fs.existsSync(ZONE_FILE)) {
  console.error(`Zone file not found: ${ZONE_FILE}`);
  process.exit(1);
}

// --- 1) Parse buildings from OSM JSON (zone.json) ---
const zone = JSON.parse(fs.readFileSync(ZONE_FILE, 'utf8'));

function buildBuildingsFromOSM(zone) {
  const elements = zone.elements;
  const nodeMap = {};
  elements.filter(e => e.type === 'node').forEach(n => { nodeMap[n.id] = n; });

  const buildings = elements
    .filter(e => e.type === 'way' && e.tags && e.tags.building && Array.isArray(e.nodes))
    .map(w => {
      const coords = w.nodes
        .map(id => nodeMap[id])
        .filter(Boolean)
        .map(n => [n.lon, n.lat]); // lon,lat for turf
      if (coords.length < 3) return null;
      // close polygon
      if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) coords.push(coords[0]);

      // height extraction
      let h = 0;
      if (w.tags.height) h = parseFloat(String(w.tags.height).replace('m','')) || 0;
      if ((!h || h === 0) && w.tags.ele) h = parseFloat(String(w.tags.ele)) || h;
      if ((!h || h === 0) && w.tags['building:levels']) {
        const lv = parseInt(w.tags['building:levels']);
        if (!isNaN(lv)) h = lv * 3;
      }
      if (!h || h === 0) h = 10; // fallback small building
      return { polygon: turf.polygon([coords]), height: h, rawNodes: coords };
    })
    .filter(Boolean);

  return buildings;
}

const buildings = buildBuildingsFromOSM(zone);
console.log(`Parsed ${buildings.length} building footprints from zone.json`);

// union bbox for sampling region
function getSamplingBBox(buildings) {
  if (!buildings.length) return null;
  const all = [];
  buildings.forEach(b => {
    const coords = b.polygon.geometry.coordinates[0];
    coords.forEach(c => all.push(turf.point(c)));
  });
  const fc = turf.featureCollection(all);
  return turf.bbox(fc); // [minX,minY,maxX,maxY]
}

const bbox = getSamplingBBox(buildings);
if (!bbox) {
  console.error('No buildings bounding box found. Aborting.');
  process.exit(1);
}
const [minLng, minLat, maxLng, maxLat] = bbox;

// --- Helper: safe turf.point creation ---
function safePointFromLonLat(lon, lat) {
  if (typeof lon !== 'number' || typeof lat !== 'number' || Number.isNaN(lon) || Number.isNaN(lat)) {
    return null;
  }
  return turf.point([lon, lat]);
}

// --- 2) Sample or use existing 10 nodes (avoid inside building footprint at low altitude) ---
function pointInsideAnyBuilding(lon, lat) {
  const pt = safePointFromLonLat(lon, lat);
  if (!pt) return false;
  return buildings.some(b => turf.booleanPointInPolygon(pt, b.polygon));
}

function sampleNodes(count) {
  const nodes = [];
  let attempts = 0;
  while (nodes.length < count && attempts < count * 500) {
    attempts++;
    const lon = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);
    // pick altitude between 20..120 m
    const alt = 20 + Math.random() * 100;
    // if point inside building footprint, allow only if alt > building.height + clearance
    const hit = buildings.find(b => {
      const pt = safePointFromLonLat(lon, lat);
      return pt && turf.booleanPointInPolygon(pt, b.polygon);
    });
    if (hit) {
      if (alt <= hit.height + CLEARANCE) continue; // skip
    }
    nodes.push({ id: `N${nodes.length+1}`, lat, lon, alt });
  }
  if (nodes.length < count) throw new Error('Failed to sample enough nodes');
  return nodes;
}

const nodes = sampleNodes(NODE_COUNT);
console.log(`Sampled ${nodes.length} nodes.`);

// --- 3) Geometry helpers ---
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = Math.PI/180;
  const dLat = (lat2-lat1)*toRad;
  const dLon = (lon2-lon1)*toRad;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// sample linear segment at t in [0,1]
function interpSeg(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
    alt: a.alt + (b.alt - a.alt) * t
  };
}

// check collision for a segment (2D intersection + altitude check) by sampling
function segmentCollides(a, b) {
  for (let i=0;i<=SAMPLES_PER_SEGMENT;i++){
    const t = i / SAMPLES_PER_SEGMENT;
    const p = interpSeg(a,b,t);
    const pt = safePointFromLonLat(p.lon, p.lat);
    if (!pt) continue; // skip invalid sample (shouldn't happen)
    for (let bld of buildings) {
      if (turf.booleanPointInPolygon(pt, bld.polygon)) {
        if (p.alt <= bld.height + CLEARANCE) return true;
      }
    }
  }
  return false;
}

// 2D line intersects polygon (regardless of altitude)
function lineIntersectsPolygon2D(a, b, polygon) {
  const line = turf.lineString([[a.lon, a.lat], [b.lon, b.lat]]);
  return turf.booleanIntersects(line, polygon);
}

// --- 4) Build zig-zag (axis-aligned) waypoint generator ---
function buildZigZagWaypoints(a, b, count, variant = 0) {
  const pts = [];
  let cur = { lat: a.lat, lon: a.lon, alt: a.alt };
  const totalSteps = count;
  for (let step = 1; step <= totalSteps; step++) {
    const frac = step / (totalSteps + 1);
    const straight = interpSeg(a, b, frac);
    let next;
    if (step % 2 === 1) {
      next = { lat: straight.lat, lon: cur.lon, alt: straight.alt };
    } else {
      next = { lat: cur.lat, lon: straight.lon, alt: straight.alt };
    }

    const zigAmplitude = (variant === 1) ? 20 : 8;
    const wave = Math.sin(frac * Math.PI * (2 + variant)) * zigAmplitude;
    next.alt = Math.max(10, next.alt + wave);

    pts.push(next);
    cur = next;
  }
  pts.push({ lat: b.lat, lon: b.lon, alt: b.alt });
  pts.unshift({ lat: a.lat, lon: a.lon, alt: a.alt });
  return pts;
}

// densify path to many waypoints by splitting segments into smaller steps
function densifyWaypoints(pts, targetPerRoute = 40) {
  const out = [];
  let totalLen = 0;
  const segLens = [];
  for (let i=0;i<pts.length-1;i++){
    const l = haversineMeters(pts[i].lat, pts[i].lon, pts[i+1].lat, pts[i+1].lon);
    segLens.push(l);
    totalLen += l;
  }
  if (totalLen === 0) return pts;
  for (let i=0;i<pts.length-1;i++){
    const a = pts[i], b = pts[i+1];
    const segCount = Math.max(1, Math.round((segLens[i]/totalLen) * targetPerRoute));
    for (let s=0;s<segCount;s++){
      const t = s / segCount;
      out.push(interpSeg(a,b,t));
    }
  }
  out.push(pts[pts.length-1]);
  return out;
}

// attempt to fix route by raising alt or offsetting laterally
function fixRouteIfCollides(pts) {
  if (!routeCollides(pts)) return pts;
  let maxH = 0;
  for (let i=0;i<pts.length;i++){
    const p = pts[i];
    const pt = safePointFromLonLat(p.lon, p.lat);
    if (!pt) continue;
    buildings.forEach(bld => {
      if (turf.booleanPointInPolygon(pt, bld.polygon)) {
        if (bld.height > maxH) maxH = bld.height;
      }
    });
  }
  const raise = maxH + CLEARANCE + 10;
  const raised = pts.map(p => ({ lat: p.lat, lon: p.lon, alt: Math.max(p.alt, raise) }));
  if (!routeCollides(raised)) return raised;

  const offseted = pts.map((p, idx) => {
    if (idx === 0 || idx === pts.length-1) return p;
    const offsetMeters = 20 + Math.random()*30;
    const perp = 1 / EARTH_METERS_PER_DEG * offsetMeters;
    return { lat: p.lat + (Math.random()-0.5)*perp, lon: p.lon + (Math.random()-0.5)*perp, alt: Math.max(p.alt, raise) };
  });
  if (!routeCollides(offseted)) return offseted;

  return null;
}

// route collision check uses sampling
function routeCollides(samples) {
  for (let i=0;i<samples.length-1;i++){
    if (segmentCollides(samples[i], samples[i+1])) return true;
  }
  for (let p of samples) {
    const pt = safePointFromLonLat(p.lon, p.lat);
    if (!pt) continue;
    for (let bld of buildings) {
      if (turf.booleanPointInPolygon(pt, bld.polygon)) {
        if (p.alt <= bld.height + CLEARANCE) return true;
      }
    }
  }
  return false;
}

// --- 5) Generate routes for each node pair ---
const routes = [];
for (let i = 0; i < nodes.length; i++) {
  for (let j = i+1; j < nodes.length; j++) {
    const A = nodes[i], B = nodes[j];
    let created = 0;
    let attempt = 0;
    while (created < ROUTES_PER_PAIR && attempt < MAX_ATTEMPTS*ROUTES_PER_PAIR) {
      const variant = (attempt % ROUTES_PER_PAIR); // 0..ROUTES_PER_PAIR-1
      const base = buildZigZagWaypoints(A, B, WAYPOINTS_PER_ROUTE, variant);
      let dense = densifyWaypoints(base, Math.max(40, WAYPOINTS_PER_ROUTE*3));
      if (routeCollides(dense)) {
        const fixed = fixRouteIfCollides(dense);
        if (fixed) {
          dense = fixed;
        } else {
          attempt++;
          continue;
        }
      }
      const lengthMeters = dense.reduce((acc, p, idx, arr) => {
        if (idx === 0) return 0;
        const prev = arr[idx-1];
        return acc + haversineMeters(prev.lat, prev.lon, p.lat, p.lon) + Math.abs(p.alt - prev.alt);
      }, 0);
      routes.push({
        from: A.id,
        to: B.id,
        variant,
        length_m: Math.round(lengthMeters),
        waypoints: dense
      });
      created++;
      attempt++;
    }
  }
}

console.log(`Generated routes: ${routes.length}`);

// --- 7) Output JSON ---
const out = { nodes, routes, meta: { NODE_COUNT, ROUTES_PER_PAIR, WAYPOINTS_PER_ROUTE } };
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2), 'utf8');
console.log(`Wrote detailed flight paths to ${OUTPUT_FILE}`);