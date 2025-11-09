const fs = require('fs');
const zone = JSON.parse(fs.readFileSync('zone.json', 'utf-8'));

// --- 1️⃣ Lọc các tòa nhà >10 tầng ---
const buildings = zone.elements
  .filter(e => e.type === 'way' && e.nodes && e.nodes.length > 0 && e.tags && e.tags.building)
  .map(e => {
    const nodes = e.nodes
      .map(id => {
        const n = zone.elements.find(el => el.type === 'node' && el.id === id);
        return n ? {lat: n.lat, lng: n.lon} : null;
      })
      .filter(n => n);
    if (nodes.length === 0) return null;
    const height = parseFloat(e.tags.height || e.tags.ele || 0) || ((parseInt(e.tags['building:levels']) || 3) * 3);
    return {nodes, minAlt: 0, maxAlt: height};
  })
  .filter(b => b);

if (buildings.length === 0) {
  console.error("Không tìm thấy tòa nhà hợp lệ (>10 tầng).");
  process.exit(1);
}

// --- 2️⃣ Kiểm tra edge cắt building ---
function lineIntersectsBuilding(a, b, building) {
  const lats = building.nodes.map(n => n.lat);
  const lngs = building.nodes.map(n => n.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minAlt = building.minAlt, maxAlt = building.maxAlt;

  const midLat = (a.lat + b.lat)/2;
  const midLng = (a.lng + b.lng)/2;
  const midAlt = (a.alt + b.alt)/2;

  return (midLat >= minLat && midLat <= maxLat) &&
         (midLng >= minLng && midLng <= maxLng) &&
         (midAlt >= minAlt && midAlt <= maxAlt);
}

// --- 3️⃣ Sinh nodes theo grid quanh building (chỉ đủ 100 nodes) ---
const nodes = [];
let nodeId = 0;
const gridStep = 0.0005;

while(nodes.length < 100) {
  const bld = buildings[Math.floor(Math.random() * buildings.length)];
  const lats = bld.nodes.map(n => n.lat);
  const lngs = bld.nodes.map(n => n.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  const lat = minLat + Math.random() * (maxLat - minLat);
  const lng = minLng + Math.random() * (maxLng - minLng);
  const alt = Math.random() * (bld.maxAlt + 10);

  nodes.push({id: nodeId.toString(), lat, lng, alt});
  nodeId++;
}

// --- 4️⃣ Hàm tính khoảng cách 3D ---
function distance(a, b) {
  return Math.sqrt((a.lat-b.lat)**2 + (a.lng-b.lng)**2 + (a.alt-b.alt)**2);
}

// --- 5️⃣ Sinh edges song song/vuông góc ---
const edges = [];
const maxNeighbor = 4;

nodes.forEach(a => {
  const candidates = nodes.filter(n => n.id !== a.id)
    .map(n => ({n, dist: distance(a,n)}))
    .sort((x,y)=>x.dist-y.dist);

  let count = 0;
  for (let i = 0; i < candidates.length; i++) {
    const n = candidates[i].n;
    if (count >= maxNeighbor) break;

    const dx = Math.abs(a.lng - n.lng);
    const dy = Math.abs(a.lat - n.lat);
    if (!((dx < 0.0006 && dy >= 0.0001) || (dy < 0.0006 && dx >= 0.0001))) continue;

    const intersects = buildings.some(bld => lineIntersectsBuilding(a,n,bld));
    const exists = edges.some(e => (e.from===a.id && e.to===n.id) || (e.from===n.id && e.to===a.id));
    if (!intersects && !exists) {
      edges.push({from: a.id, to: n.id});
      count++;
    }
  }
});

// --- 6️⃣ Đảm bảo graph liên thông ---
function dfs(id, visited) {
  visited.add(id);
  edges.forEach(e => {
    if (e.from===id && !visited.has(e.to)) dfs(e.to, visited);
    if (e.to===id && !visited.has(e.from)) dfs(e.from, visited);
  });
}

let visited = new Set();
dfs(nodes[0].id, visited);
const unconnected = nodes.filter(n => !visited.has(n.id));
unconnected.forEach(n => {
  const nearest = nodes
    .filter(x => x.id !== n.id)
    .map(x => ({x, dist: distance(n,x)}))
    .sort((a,b)=>a.dist-b.dist)[0].x;
  edges.push({from: n.id, to: nearest.id});
});

// --- 7️⃣ Xuất network.json ---
fs.writeFileSync('network.json', JSON.stringify({nodes, edges}, null, 2));
console.log(`Generated network.json: ${nodes.length} nodes, ${edges.length} edges.`);