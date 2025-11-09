// generateDetailedRoutes_grounded.js
// Usage: node generateDetailedRoutes_grounded.js
// Requires: npm install @turf/turf

const fs = require('fs');
const turf = require('@turf/turf');

const ZONE_FILE = './zone.json';
const OUTPUT_FILE = './flight_paths_detailed.json';
const NODE_COUNT = 6;
const WAYPOINTS_PER_ROUTE = 30;
const CLEARANCE = 6;

if (!fs.existsSync(ZONE_FILE)) {
  console.error(`Zone file not found: ${ZONE_FILE}`);
  process.exit(1);
}

const zone = JSON.parse(fs.readFileSync(ZONE_FILE, 'utf8'));

// --- Parse buildings ---
function buildBuildingsFromOSM(zone) {
  const nodeMap = {};
  zone.elements.filter(e => e.type === 'node').forEach(n => (nodeMap[n.id] = n));

  return zone.elements
    .filter(e => e.type === 'way' && e.tags && e.tags.building && Array.isArray(e.nodes))
    .map(w => {
      const coords = w.nodes.map(id => nodeMap[id]).filter(Boolean).map(n => [n.lon, n.lat]);
      if (coords.length < 3) return null;
      if (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1]) coords.push(coords[0]);
      let h = parseFloat(w.tags.height) || 0;
      if (!h && w.tags['building:levels']) h = parseInt(w.tags['building:levels']) * 3;
      if (!h) h = 10;
      return { polygon: turf.polygon([coords]), height: h };
    })
    .filter(Boolean);
}

const buildings = buildBuildingsFromOSM(zone);
console.log(`Parsed ${buildings.length} buildings.`);

// --- Sampling bbox ---
const allPts = buildings.flatMap(b => b.polygon.geometry.coordinates[0].map(c => turf.point(c)));
const bbox = turf.bbox(turf.featureCollection(allPts));
const [minLng, minLat, maxLng, maxLat] = bbox;

// --- Helpers ---
function safePoint(lon, lat) {
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;
  return turf.point([lon, lat]);
}
function insideBuilding(lon, lat) {
  const pt = safePoint(lon, lat);
  return pt && buildings.some(b => turf.booleanPointInPolygon(pt, b.polygon));
}
function distance(a, b) {
  const R = 6371000, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
function interp(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, alt: a.alt + (b.alt - a.alt) * t };
}
function segmentCollides(a, b) {
  const steps = 8;
  for (let i=0;i<=steps;i++) {
    const t = i/steps, p = interp(a,b,t), pt = safePoint(p.lon,p.lat);
    if (!pt) continue;
    for (const bld of buildings) {
      if (turf.booleanPointInPolygon(pt, bld.polygon) && p.alt <= bld.height + CLEARANCE) return true;
    }
  }
  return false;
}

// --- Sample 10 nodes (on ground) ---
const nodes = [];
while (nodes.length < NODE_COUNT) {
  const lon = minLng + Math.random() * (maxLng - minLng);
  const lat = minLat + Math.random() * (maxLat - minLat);
  if (insideBuilding(lon, lat)) continue;
  nodes.push({ id: `N${nodes.length+1}`, lat, lon, alt: 0 });
}
console.log(`Sampled ${nodes.length} ground nodes.`);

// --- Ziczac route builder ---
function buildZigZagWaypoints(a, b, count) {
  const pts = [];
  const climbAlt = 30; // lên cao 30m
  pts.push({ lat: a.lat, lon: a.lon, alt: a.alt });
  pts.push({ lat: a.lat, lon: a.lon, alt: climbAlt });

  let cur = { ...pts.at(-1) };
  for (let i = 1; i <= count; i++) {
    const frac = i / (count + 1);
    const straight = interp(a, b, frac);
    let next;
    if (i % 2 === 0) {
      // di chuyển theo hướng Đông–Tây (lon)
      next = { lat: cur.lat, lon: straight.lon, alt: climbAlt };
    } else {
      // di chuyển theo hướng Bắc–Nam (lat)
      next = { lat: straight.lat, lon: cur.lon, alt: climbAlt };
    }
    if (!segmentCollides(cur, next)) pts.push(next);
    cur = next;
  }

  pts.push({ lat: b.lat, lon: b.lon, alt: climbAlt });
  pts.push({ lat: b.lat, lon: b.lon, alt: b.alt });
  return pts;
}

// --- Generate routes between node pairs ---
const routes = [];
for (let i = 0; i < nodes.length; i++) {
  for (let j = i+1; j < nodes.length; j++) {
    const A = nodes[i], B = nodes[j];
    const waypoints = buildZigZagWaypoints(A, B, WAYPOINTS_PER_ROUTE);
    const valid = !waypoints.some((p, idx) => idx>0 && segmentCollides(waypoints[idx-1], p));
    if (valid) routes.push({ from: A.id, to: B.id, waypoints });
  }
}

console.log(`Generated ${routes.length} routes.`);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ nodes, routes }, null, 2), 'utf8');
console.log(`Wrote detailed flight paths to ${OUTPUT_FILE}`);