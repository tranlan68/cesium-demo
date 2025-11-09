export function findShortestPath(nodeMap, edges, startId, endId) {
    const dist = {}, prev = {};
    const nodes = Object.keys(nodeMap);
    nodes.forEach(id => dist[id] = Infinity);
    dist[startId] = 0;
  
    const queue = new Set(nodes);
  
    const distance3D = (a, b) => Math.sqrt(
      (a.lng - b.lng) ** 2 + (a.lat - b.lat) ** 2 + (a.alt - b.alt) ** 2
    );
  
    while (queue.size > 0) {
      let u = [...queue].reduce((min, id) => dist[id] < dist[min] ? id : min, [...queue][0]);
      if (u === endId) break;
      queue.delete(u);
  
      edges.filter(e => e.from === u || e.to === u).forEach(e => {
        const v = e.from === u ? e.to : e.from;
        if (!queue.has(v)) return;
        const alt = dist[u] + distance3D(nodeMap[u], nodeMap[v]);
        if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
      });
    }
  
    const path = [];
    for (let u = endId; u; u = prev[u]) path.unshift(u);
    return path;
  }