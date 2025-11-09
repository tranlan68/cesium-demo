// generateDetailedRoutes.js (CommonJS)
// Usage: node generateDetailedRoutes.js
// Requires: npm install @turf/turf

const fs = require('fs');
const turf = require('@turf/turf');

const ZONE_FILE = './zone.json';
const OUTPUT_FILE = './flight_paths_detailed.json';

// Config
const NODE_COUNT = 6;
const WAYPOINTS_PER_ROUTE = 30;   // number of intermediate axis-aligned steps
const CLEARANCE = 6;              // safety meters above building top
const CLIMB_ALT = 30;             // takeoff altitude (m)
const CRUISE_ALT = 60;            // cruise base altitude (m)
const ALT_VAR = 10;               // small up/down variation around cruise
const SAMPLE_STEPS = 8;           // samples per segment when checking collision

if (!fs.existsSync(ZONE_FILE)) {
  console.error(`Zone file not found: ${ZONE_FILE}`);
  process.exit(1);
}

const zone = JSON.parse(fs.readFileSync(ZONE_FILE, 'utf8'));

// --- Parse buildings from OSM elements (ways with building tag) ---
function buildBuildingsFromOSM(zone) {
  const nodeMap = {};
  (zone.elements || []).forEach(e => {
    if (e.type === 'node') nodeMap[e.id] = e;
  });

  const buildings = (zone.elements || [])
    .filter(e => e.type === 'way' && e.tags && e.tags.building && Array.isArray(e.nodes))
    .map(w => {
      const coords = w.nodes
        .map(id => nodeMap[id])
        .filter(Boolean)
        .map(n => {
          const lon = typeof n.lon === 'number' ? n.lon : parseFloat(n.lon);
          const lat = typeof n.lat === 'number' ? n.lat : parseFloat(n.lat);
          return [lon, lat];
        })
        .filter(c => Number.isFinite(c[0]) && Number.isFinite(c[1]));

      if (coords.length < 3) return null;
      // close polygon
      if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) coords.push(coords[0]);

      // height
      let h = 0;
      try {
        if (w.tags.height) h = parseFloat(String(w.tags.height).replace('m','')) || 0;
        if ((!h || h === 0) && w.tags.ele) h = parseFloat(String(w.tags.ele)) || h;
        if ((!h || h === 0) && w.tags['building:levels']) {
          const lv = parseInt(w.tags['building:levels']);
          if (!isNaN(lv)) h = lv * 3;
        }
      } catch (e) {}
      if (!h || h === 0) h = 10;
      return { polygon: turf.polygon([coords]), height: h, raw: coords };
    })
    .filter(Boolean);

  return buildings;
}

const buildings = buildBuildingsFromOSM(zone);
console.log(`Parsed ${buildings.length} building footprints from zone.json`);

// if no buildings, abort
if (buildings.length === 0) {
  console.error('No buildings parsed. Make sure zone.json is OSM Overpass JSON and contains building ways.');
  process.exit(1);
}

// bbox from buildings for sampling region
const allPoints = buildings.flatMap(b => b.raw.map(c => turf.point(c)));
const bbox = turf.bbox(turf.featureCollection(allPoints));
const [minLon, minLat, maxLon, maxLat] = bbox;

// helpers
function safePoint(lon, lat) {
  if (typeof lon !== 'number' || typeof lat !== 'number' || Number.isNaN(lon) || Number.isNaN(lat)) return null;
  return turf.point([lon, lat]);
}
function pointInAnyBuilding(lon, lat) {
  const p = safePoint(lon, lat);
  if (!p) return false;
  return buildings.some(b => turf.booleanPointInPolygon(p, b.polygon));
}
function distanceMeters(a, b) {
  return turf.distance(turf.point([a.lon, a.lat]), turf.point([b.lon, b.lat]), { units: 'meters' });
}
function interp(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, alt: a.alt + (b.alt - a.alt) * t };
}

// sample nodes near building edges (take a building, pick random edge vertex, offset outward a bit)
function sampleNodesNearBuildings(count) {
  const nodes = [];
  let tries = 0;
  while (nodes.length < count && tries < count * 2000) {
    tries++;
    const b = buildings[Math.floor(Math.random() * buildings.length)];
    // pick two consecutive vertices to form an edge
    const coords = b.raw;
    if (!coords || coords.length < 2) continue;
    const idx = Math.floor(Math.random() * (coords.length - 1));
    const v1 = coords[idx];
    const v2 = coords[idx + 1];

    // compute outward normal from edge midpoint
    const midLon = (v1[0] + v2[0]) / 2;
    const midLat = (v1[1] + v2[1]) / 2;
    // vector along edge
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    // normal (perp)
    let nx = -dy;
    let ny = dx;
    // normalize
    const len = Math.sqrt(nx*nx + ny*ny) || 1;
    nx /= len; ny /= len;
    // offset distance in degrees (small, ~5-20m)
    const offsetMeters = 5 + Math.random() * 25;
    const offsetDeg = offsetMeters / 111320; // approx deg per meter
    const candLon = midLon + nx * offsetDeg;
    const candLat = midLat + ny * offsetDeg;

    // ensure not inside any building
    if (pointInAnyBuilding(candLon, candLat)) {
      // try opposite normal
      const candLon2 = midLon - nx * offsetDeg;
      const candLat2 = midLat - ny * offsetDeg;
      if (pointInAnyBuilding(candLon2, candLat2)) continue;
      nodes.push({ id: `N${nodes.length+1}`, lat: candLat2, lon: candLon2, alt: 0 });
    } else {
      nodes.push({ id: `N${nodes.length+1}`, lat: candLat, lon: candLon, alt: 0 });
    }
  }
  return nodes;
}

const nodes = sampleNodesNearBuildings(NODE_COUNT);
console.log(`Sampled ${nodes.length} nodes near building edges.`);

// collision check sampling per segment
function segmentCollides(a, b) {
  for (let i = 0; i <= SAMPLE_STEPS; i++) {
    const t = i / SAMPLE_STEPS;
    const p = interp(a, b, t);
    const pt = safePoint(p.lon, p.lat);
    if (!pt) continue;
    for (const bld of buildings) {
      if (turf.booleanPointInPolygon(pt, bld.polygon) && p.alt <= (bld.height + CLEARANCE)) return true;
    }
  }
  return false;
}

// build axis-aligned zigzag with vertical takeoff/landing and small alt variation in cruise
function buildZigZagWaypoints(a, b, count) {
  const pts = [];
  // start on ground
  pts.push({ lat: a.lat, lon: a.lon, alt: a.alt });
  // takeoff vertical
  pts.push({ lat: a.lat, lon: a.lon, alt: CLIMB_ALT });

  // current "cursor" at climb altitude
  let cur = { lat: a.lat, lon: a.lon, alt: CLIMB_ALT };

  for (let i = 1; i <= count; i++) {
    const frac = i / (count + 1);
    const straight = interp(a, b, frac);

    let next;
    // alternate axis: odd -> change lat (north-south), even -> change lon (east-west)
    if (i % 2 === 1) {
      next = { lat: straight.lat, lon: cur.lon, alt: CRUISE_ALT + ((i % 2 === 0) ? ALT_VAR : -ALT_VAR) };
    } else {
      next = { lat: cur.lat, lon: straight.lon, alt: CRUISE_ALT + ((i % 2 === 0) ? ALT_VAR : -ALT_VAR) };
    }

    // ensure altitude roughly CRUISE_ALT (no big slinky): clamp around CRUISE_ALT
    next.alt = Math.max(5, Math.min(300, next.alt));

    // only push next if segment from cur->next does not collide
    if (!segmentCollides(cur, next)) {
      pts.push(next);
      cur = next;
    } else {
      // try small lateral offset to avoid collision
      const tryOffset = 1 / 111320 * 10; // ~10m
      const cand1 = { lat: next.lat + tryOffset, lon: next.lon, alt: next.alt };
      const cand2 = { lat: next.lat - tryOffset, lon: next.lon, alt: next.alt };
      if (!segmentCollides(cur, cand1)) { pts.push(cand1); cur = cand1; }
      else if (!segmentCollides(cur, cand2)) { pts.push(cand2); cur = cand2; }
      else {
        // skip this waypoint (still keep cur, continue)
      }
    }
  }

  // approach to destination at cruise altitude
  const approach = { lat: b.lat, lon: b.lon, alt: CRUISE_ALT };
  if (!segmentCollides(cur, approach)) {
    pts.push(approach);
  } else {
    // try slight offset approach points
    const tryOffset = 1 / 111320 * 10;
    const altApproach1 = { lat: b.lat + tryOffset, lon: b.lon, alt: CRUISE_ALT };
    const altApproach2 = { lat: b.lat - tryOffset, lon: b.lon, alt: CRUISE_ALT };
    if (!segmentCollides(cur, altApproach1)) pts.push(altApproach1);
    else if (!segmentCollides(cur, altApproach2)) pts.push(altApproach2);
    else {
      // if can't approach safely, drop approach and will do vertical landing if possible
    }
  }

  // descend to touchdown
  pts.push({ lat: b.lat, lon: b.lon, alt: CLIMB_ALT });
  pts.push({ lat: b.lat, lon: b.lon, alt: b.alt });

  return pts;
}

// Generate routes: only add route if no colliding segments overall
const routes = [];
for (let i = 0; i < nodes.length; i++) {
  for (let j = i+1; j < nodes.length; j++) {
    const A = nodes[i], B = nodes[j];
    const waypoints = buildZigZagWaypoints(A, B, WAYPOINTS_PER_ROUTE);
    // verify full route segments safe
    let ok = true;
    for (let k = 0; k < waypoints.length - 1; k++) {
      if (segmentCollides(waypoints[k], waypoints[k+1])) { ok = false; break; }
    }
    if (ok) {
      routes.push({ from: A.id, to: B.id, waypoints });
    }
  }
}

console.log(`Generated ${routes.length} routes.`);

// write out
fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ nodes, routes }, null, 2), 'utf8');
console.log(`Wrote detailed flight paths to ${OUTPUT_FILE}`);