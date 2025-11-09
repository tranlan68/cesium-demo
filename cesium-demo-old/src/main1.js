import * as Cesium from "cesium";
import osmtogeojson from "osmtogeojson";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Tắt yêu cầu Cesium Ion
window.CESIUM_BASE_URL = '/node_modules/cesium/Build/Cesium/';

Cesium.Ion.defaultAccessToken = undefined;

const viewer = new Cesium.Viewer("cesiumContainer", {
  //imageryProvider: new Cesium.UrlTemplateImageryProvider({
  //  url: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
  //}),
  // imageryProvider: new Cesium.OpenStreetMapImageryProvider({
  //   url: "https://tile.openstreetmap.org/",
  // }),
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  timeline: false,
  animation: false,
  sceneModePicker: true,
  imageryProvider: false,
  skyBox: false,              // tắt nền trời (tùy chọn)
  skyAtmosphere: false,       // tắt hiệu ứng khí quyển (tùy chọn)
});

//viewer.scene.globe.enableLighting = true;
viewer.scene.backgroundColor = Cesium.Color.GRAY;
viewer.scene.globe.baseColor = Cesium.Color.LIGHTGREY;
//viewer.scene.skyBox = false;
//viewer.scene.skyAtmosphere.show = false;
//viewer.scene.globe.depthTestAgainstTerrain = true;
//viewer.terrainProvider = Cesium.createWorldTerrain();
//viewer.camera.flyHome(0);

// Load file GeoJSON local
// Cesium.GeoJsonDataSource.load("/assets/maps/zone.json", {
//   stroke: Cesium.Color.YELLOW,
//   fill: Cesium.Color.YELLOW.withAlpha(0.3),
//   strokeWidth: 2,
//   clampToGround: false, // true
// })
//   .then((dataSource) => {
//     viewer.dataSources.add(dataSource);
//     viewer.flyTo(dataSource);
//   })
//   .catch((err) => {
//     console.error("Lỗi khi load GeoJSON:", err);
//   });

  fetch("/assets/maps/zone.json")
  .then(res => res.json())
  .then(osmData => {
    const geojson = osmtogeojson(osmData);
    return Cesium.GeoJsonDataSource.load(geojson, {
      stroke: Cesium.Color.YELLOW,
      fill: Cesium.Color.YELLOW.withAlpha(0.4),
      clampToGround: true,
    }).then((dataSource) => ({ dataSource, geojson }));
  })
  .then(({dataSource, geojson}) => {
    viewer.dataSources.add(dataSource);

    dataSource.entities.values.forEach((entity) => {
      const props = entity.properties;
      if (!props || !entity.polygon) return;

      // Lấy giá trị an toàn từ PropertyBag
      const get = (name) => {
        const prop = props[name];
        if (!prop) return null;
        return prop.getValue ? prop.getValue() : prop._value ?? null;
      };

      const building = get("building");
      const natural = get("natural");
      const water = get("water");
      const highway = get("highway");
      const leisure = get("leisure");

      // 🏠 1️⃣ Nếu là tòa nhà
      if (building && entity.polygon) {
        const height = parseFloat(get("height") || 0);
        const ele = parseFloat(get("ele") || 0);
        const levels = parseInt(get("building:levels") || 0);

        // Ưu tiên height, nếu không có thì tính từ số tầng
        const buildingHeight = height || (levels ? levels * 3 : 8);

        // Màu thân nhà theo loại
        let color = "#999999"; // mặc định
        if (building === "yes") {
          color = "#bbbbbb";
          if (buildingHeight < 10) {
            // thấp tầng
            color = "#b3e6b3"; // xanh nhạt
          } else if (buildingHeight < 25) {
            // trung tầng
            color = "#ffd966"; // vàng nhạt
          } else {
            // cao tầng
            color = "#ff9999"; // đỏ nhạt
          }
        }
        else if (building === "apartments") {
          color = "#bbbbbb";
          if (buildingHeight < 10) {
            // thấp tầng
            color = "#b3e6b3"; // xanh nhạt
          } else if (buildingHeight < 25) {
            // trung tầng
            color = "#ffd966"; // vàng nhạt
          } else {
            // cao tầng
            color = "#ff9999"; // đỏ nhạt
          }
        }
        else if (building === "university") color = "#ffc04d";
        else if (building === "dormitory") color = "#ffe680";
        else if (building === "canteen") color = "#ff9999";
        const colorName = get("building:colour") || color;

        entity.polygon.height = ele;
        entity.polygon.extrudedHeight = ele + buildingHeight;
        entity.polygon.material = Cesium.Color.fromCssColorString(colorName).withAlpha(0.9);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.BLACK;
      }

      // 🌊 2️⃣ Nếu là hồ, sông, vùng nước
      else if ((natural === "water" || water) && entity.polygon) {
        entity.polygon.height = 0;
        entity.polygon.extrudedHeight = 0;
        entity.polygon.material = Cesium.Color.fromCssColorString("#3399ff").withAlpha(0.6);
        entity.polygon.outline = false;
      }
      // 🌳 Công viên (leisure=park)
      else if (leisure === "park" && entity.polygon) {
        entity.polygon.height = 0;
        entity.polygon.extrudedHeight = 0;
        entity.polygon.material = Cesium.Color.fromCssColorString("#66cc66").withAlpha(0.5); // xanh lá cây nhạt
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.DARKGREEN;
      }
      // 🚗 Đường giao thông
      else if (highway && entity.polyline) {
        console.error("entity:", entity)
        let color = Cesium.Color.GRAY;
        let width = 2;

        switch (highway) {
          case "motorway":
          case "trunk":
            color = Cesium.Color.ORANGE;
            width = 5;
            break;
          case "primary":
            color = Cesium.Color.YELLOW;
            width = 4;
            break;
          case "secondary":
            color = Cesium.Color.LIGHTGOLDENRODYELLOW;
            width = 3;
            break;
          case "tertiary":
            color = Cesium.Color.LIGHTGRAY;
            width = 3;
            break;
          case "residential":
          case "service":
            color = Cesium.Color.DARKGRAY;
            width = 2;
            break;
          case "footway":
          case "path":
            color = Cesium.Color.LIGHTBLUE;
            width = 1;
            break;
        }

        // ví dụ đường vòng xuyến hoặc quảng trường
        entity.polyline.material = new Cesium.ColorMaterialProperty(color);
        entity.polyline.width = width;
        entity.polyline.clampToGround = true;
      }
    });


    // 🚧 Nếu chưa có polyline nào → tự vẽ thủ công từ GeoJSON
    geojson.features?.forEach((f) => {
      const hwy = f.properties?.highway;
      if (!hwy || !f.geometry) return;
      const coords = f.geometry.coordinates;
      if (!coords || !Array.isArray(coords)) return;

      let color = Cesium.Color.GRAY;
      let width = 2;
      if (hwy === "primary") { color = Cesium.Color.YELLOW; width = 4; }
      else if (hwy === "secondary") { color = Cesium.Color.ORANGE; width = 3; }
      else if (hwy === "tertiary") { color = Cesium.Color.LIGHTGRAY; width = 3; }
      else if (hwy === "residential") { color = Cesium.Color.DARKGRAY; width = 2; }
      else if (hwy === "footway") { color = Cesium.Color.LIGHTBLUE; width = 1; }

      if (f.geometry.type === "LineString") {
        viewer.entities.add({
          polyline: {
            positions: coords.map(c => Cesium.Cartesian3.fromDegrees(c[0], c[1], 0)),
            width,
            material: color,
            clampToGround: true,
          },
        });
      } else if (f.geometry.type === "MultiLineString") {
        f.geometry.coordinates.forEach(line => {
          viewer.entities.add({
            polyline: {
              positions: line.map(c => Cesium.Cartesian3.fromDegrees(c[0], c[1], 0)),
              width,
              material: color,
              clampToGround: true,
            },
          });
        });
      }
    });
    viewer.flyTo(dataSource);
  })
  .catch((err) => console.error("Lỗi khi load OSM:", err));



// // --- 1️⃣ Hàm tạo hình tròn cho polylineVolume ---
// function createCircleShape(radius = 0.2, points = 8) {
//   const shape = [];
//   for (let i = 0; i < points; i++) {
//     const angle = (i / points) * Math.PI * 2;
//     shape.push(new Cesium.Cartesian2(Math.cos(angle) * radius, Math.sin(angle) * radius));
//   }
//   return shape;
// }

// // --- 2️⃣ Load network.json ---
// fetch('/assets/maps/network.json').then(r => r.json()).then(data => {
//   const nodes = data.nodes;
//   const edges = data.edges;

//   // --- 3️⃣ Vẽ nodes ---
//   nodes.forEach(n => {
//     viewer.entities.add({
//       id: n.id,
//       position: Cesium.Cartesian3.fromDegrees(n.lng, n.lat, n.alt),
//       point: { pixelSize: 5, color: Cesium.Color.YELLOW }
//     });
//   });

//   // --- 4️⃣ Vẽ edges dạng ống ---
//   edges.forEach(e => {
//     const from = nodes.find(n => n.id === e.from);
//     const to = nodes.find(n => n.id === e.to);
//     viewer.entities.add({
//       polylineVolume: {
//         positions: [
//           Cesium.Cartesian3.fromDegrees(from.lng, from.lat, from.alt),
//           Cesium.Cartesian3.fromDegrees(to.lng, to.lat, to.alt)
//         ],
//         shape: createCircleShape(0.2, 8),
//         material: Cesium.Color.CYAN.withAlpha(0.6)
//       }
//     });
//   });

//   // --- 5️⃣ Populate dropdowns ---
//   const fromSelect = document.getElementById('fromNode');
//   const toSelect = document.getElementById('toNode');
//   nodes.forEach(n => {
//     const option1 = document.createElement('option'); option1.value = n.id; option1.text = n.id;
//     const option2 = document.createElement('option'); option2.value = n.id; option2.text = n.id;
//     fromSelect.add(option1); toSelect.add(option2);
//   });

//   // --- 6️⃣ Dijkstra đơn giản ---
//   const graph = {};
//   nodes.forEach(n => graph[n.id] = []);
//   edges.forEach(e => { graph[e.from].push({to:e.to,cost:e.cost}); graph[e.to].push({to:e.from,cost:e.cost}); });

//   function dijkstra(graph, startId, endId){
//     const dist = {}; const prev = {};
//     const Q = new Set(Object.keys(graph));
//     Object.keys(graph).forEach(v=>dist[v]=Infinity); dist[startId]=0;

//     while(Q.size>0){
//       let u = null;
//       Q.forEach(v => { if(u===null || dist[v]<dist[u]) u=v; });
//       Q.delete(u);
//       if(u===endId) break;
//       graph[u].forEach(neigh => {
//         const alt = dist[u]+neigh.cost;
//         if(alt<dist[neigh.to]) { dist[neigh.to]=alt; prev[neigh.to]=u; }
//       });
//     }

//     const path = [];
//     let u = endId;
//     while(u){ path.unshift(u); u=prev[u]; }
//     if(path[0]!==startId) return []; // không có đường
//     return path;
//   }

//   // --- 7️⃣ Hiển thị route ---
//   window.showRoute = function(){
//     const fromId = fromSelect.value;
//     const toId = toSelect.value;
//     const path = dijkstra(graph, fromId, toId);
//     if(path.length===0){ alert("No path"); return; }

//     // Clear previous route
//     viewer.entities.values.filter(e=>e.name==='route').forEach(e=>viewer.entities.remove(e));

//     // Vẽ route đỏ
//     for(let i=0;i<path.length-1;i++){
//       const from = nodes.find(n=>n.id===path[i]);
//       const to = nodes.find(n=>n.id===path[i+1]);
//       viewer.entities.add({
//         name: 'route',
//         polylineVolume:{
//           positions:[
//             Cesium.Cartesian3.fromDegrees(from.lng, from.lat, from.alt),
//             Cesium.Cartesian3.fromDegrees(to.lng, to.lat, to.alt)
//           ],
//           shape: createCircleShape(0.3, 12),
//           material: Cesium.Color.RED
//         }
//       });
//     }
//   };
// });



let nodeMap = {};
let edges = [];
let selectedNodes = [];

// --- Hàm tạo ống tròn giữa 2 điểm (trong suốt, xanh đậm) ---
function createCylinderBetween(a, b, color = Cesium.Color.CYAN.withAlpha(0.5), radius = 1.5) {
  const start = Cesium.Cartesian3.fromDegrees(a.lng, a.lat, a.alt);
  const end = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.alt);

  const shape = [];
  const segments = 16; // số lượng segment cho ống tròn
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    shape.push(new Cesium.Cartesian2(Math.cos(theta) * radius, Math.sin(theta) * radius));
  }

  viewer.entities.add({
    polylineVolume: {
      positions: [start, end],
      shape: shape,
      material: color
    }
  });
}

// --- Vẽ network ---
async function drawNetwork() {
  const response = await fetch('/assets/maps/network.json');
  const network = await response.json();

  nodeMap = {};
  network.nodes.forEach(n => {
    nodeMap[n.id] = n;

    // Vẽ node dạng Sphere
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(n.lng, n.lat, n.alt),
      ellipsoid: {
        radii: new Cesium.Cartesian3(2.5, 2.5, 2.5), // tăng bán kính để dễ nhìn
        material: Cesium.Color.BLUE.withAlpha(0.8)
      },
      nodeId: n.id
    });
  });

  edges = network.edges;

  // Vẽ tất cả edges dạng ống tròn màu xanh mờ
  edges.forEach(e => {
    const a = nodeMap[e.from];
    const b = nodeMap[e.to];
    createCylinderBetween(a, b, Cesium.Color.CYAN.withAlpha(0.5));
  });

  // Zoom tới toàn bộ network
  viewer.flyTo(viewer.entities);
}

// --- Tìm đường đi ngắn nhất (Dijkstra) ---
function findShortestPath(nodeMap, edges, startId, endId) {
  const dist = {};
  const prev = {};
  const nodes = Object.keys(nodeMap);
  nodes.forEach(id => dist[id] = Infinity);
  dist[startId] = 0;

  const queue = new Set(nodes);

  function distance3D(a, b) {
    return Math.sqrt((a.lng - b.lng) ** 2 + (a.lat - b.lat) ** 2 + (a.alt - b.alt) ** 2);
  }

  while (queue.size > 0) {
    let u = null;
    let minDist = Infinity;
    queue.forEach(id => {
      if (dist[id] < minDist) {
        minDist = dist[id];
        u = id;
      }
    });

    if (!u || u === endId) break;
    queue.delete(u);

    edges.filter(e => e.from === u || e.to === u).forEach(e => {
      const v = e.from === u ? e.to : e.from;
      if (!queue.has(v)) return;
      const alt = dist[u] + distance3D(nodeMap[u], nodeMap[v]);
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    });
  }

  const path = [];
  let u = endId;
  while (u) {
    path.unshift(u);
    u = prev[u];
  }

  return path;
}

// --- Vẽ đường đi ngắn nhất dạng ống đỏ ---
function drawPath(path, nodeMap) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = nodeMap[path[i]];
    const b = nodeMap[path[i + 1]];
    createCylinderBetween(a, b, Cesium.Color.RED.withAlpha(0.8), 2); // đường đi đỏ dày hơn
  }
}

// --- Bắt click chọn node ---
function enableNodeSelection() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction(function (click) {
    // Tạm tắt camera
    viewer.scene.screenSpaceCameraController.enableRotate = false;
    viewer.scene.screenSpaceCameraController.enableTranslate = false;
    viewer.scene.screenSpaceCameraController.enableZoom = false;
    viewer.scene.screenSpaceCameraController.enableTilt = false;
    viewer.scene.screenSpaceCameraController.enableLook = false;

    const picked = viewer.scene.pick(click.position);
    if (Cesium.defined(picked) && picked.id && picked.id.nodeId) {
      selectedNodes.push(picked.id.nodeId);
      console.log("Selected node:", picked.id.nodeId);

      if (selectedNodes.length === 2) {
        const path = findShortestPath(nodeMap, edges, selectedNodes[0], selectedNodes[1]);
        drawPath(path, nodeMap);
        selectedNodes = [];
      }
    }

    // Bật lại camera sau 200ms
    setTimeout(() => {
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableLook = true;
    }, 200);

  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// --- Main ---
drawNetwork().then(() => {
  enableNodeSelection();
  console.log("Network loaded. Click 2 nodes to draw shortest path.");
});