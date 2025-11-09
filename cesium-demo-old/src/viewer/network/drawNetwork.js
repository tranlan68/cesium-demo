import * as Cesium from "cesium";
import { createCylinderBetween , createCircleShape } from "../../utils/geometry.js";

export async function drawNetwork(viewer, url) {
  const res = await fetch(url);

  const network = await res.json();
  const nodeMap = {};

  network.nodes.forEach(n => {
    nodeMap[n.id] = n;
    // viewer.entities.add({
    //   position: Cesium.Cartesian3.fromDegrees(n.lng, n.lat, n.alt),
    //   ellipsoid: {
    //     radii: new Cesium.Cartesian3(7.5, 7.5, 7.5),
    //     material: Cesium.Color.BLUE.withAlpha(0.8),
    //   },
    //   nodeId: n.id,
    // });
  });

  network.edges.forEach(e => {
    const a = nodeMap[e.from];
    const b = nodeMap[e.to];
    if (!a || !b) return;

    // const positions = Cesium.Cartesian3.fromDegreesArrayHeights([
    //   a.lng, a.lat, a.alt ?? 0,
    //   b.lng, b.lat, b.alt ?? 0,
    // ]);

    // const edgeEntity = viewer.entities.add({
    //   polyline: {
    //     positions,
    //     width: 5,
    //     material: Cesium.Color.CYAN.withAlpha(0.2),
    //   },
    // });

    const start = Cesium.Cartesian3.fromDegrees(a.lng, a.lat, a.alt);
    const end = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.alt);
      
    const edgeEntity = viewer.entities.add({
      polylineVolume: {
        positions: [start, end],
        shape: createCircleShape(4),
        material: Cesium.Color.CYAN.withAlpha(0.1),
      },
    });

    // Đánh dấu là edge để loại bỏ khi click
    edgeEntity.properties = new Cesium.PropertyBag({ type: "edge" });
  });

  // --- 2️⃣ Vẽ nodes ---
  network.nodes.forEach(n => {
    nodeMap[n.id] = n;

    const position = Cesium.Cartesian3.fromDegrees(n.lng, n.lat, (n.alt ?? 0) + 5);

    viewer.entities.add({
      id: n.id,
      position,
      point: {
        pixelSize: 7.5,
        color: Cesium.Color.BLUE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // luôn thấy node
      },
      label: {
        text: n.id,
        font: "10px sans-serif",
        fillColor: Cesium.Color.BLUE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: new Cesium.PropertyBag({ type: "node" }),
    });
  });

  // network.edges.forEach(e => {
  //   const a = nodeMap[e.from];
  //   const b = nodeMap[e.to];
  //   createCylinderBetween(viewer, a, b, Cesium.Color.CYAN.withAlpha(0.5), 5);
  // });

  // nodeMap = {};
  // edges = network.edges;

  // // --- 1️⃣ Vẽ EDGES (đường nối, không cho click) ---
  // edges.forEach(e => {
  //   const a = network.nodes.find(n => n.id === e.from);
  //   const b = network.nodes.find(n => n.id === e.to);
  //   if (!a || !b) return;

  //   const positions = Cesium.Cartesian3.fromDegreesArrayHeights([
  //     a.lng, a.lat, a.alt ?? 0,
  //     b.lng, b.lat, b.alt ?? 0
  //   ]);

  //   viewer.entities.add({
  //     polyline: {
  //       positions,
  //       width: 2,
  //       material: Cesium.Color.CYAN.withAlpha(0.4),
  //       clampToGround: false,
  //     },
  //     allowPicking: false, // 🚫 Không cho click vào edge
  //   });
  // });

  // // --- 2️⃣ Vẽ NODES (nổi lên, dễ click) ---
  // network.nodes.forEach(n => {
  //   nodeMap[n.id] = n;

  //   // Nâng node lên 5m để nổi hơn edge
  //   const position = Cesium.Cartesian3.fromDegrees(n.lng, n.lat, (n.alt ?? 0) + 5);

  //   viewer.entities.add({
  //     id: n.id,
  //     position,
  //     point: {
  //       pixelSize: 12,
  //       color: Cesium.Color.YELLOW,
  //       outlineColor: Cesium.Color.BLACK,
  //       outlineWidth: 2,
  //       heightReference: Cesium.HeightReference.NONE,
  //       disableDepthTestDistance: Number.POSITIVE_INFINITY, // 🟢 Luôn hiển thị trên edge
  //     },
  //     label: {
  //       text: n.id,
  //       font: "14px sans-serif",
  //       fillColor: Cesium.Color.WHITE,
  //       pixelOffset: new Cesium.Cartesian2(0, -18),
  //       disableDepthTestDistance: Number.POSITIVE_INFINITY,
  //     },
  //     properties: { type: "node" },
  //   });
  // });

  // // --- 3️⃣ Handler click: chỉ nhận node ---
  // const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  // handler.setInputAction(function (click) {
  //   const picked = viewer.scene.pick(click.position);

  //   if (Cesium.defined(picked) && picked.id?.properties?.type === "node") {
  //     const nodeId = picked.id.id;
  //     console.log("🟢 Clicked node:", nodeId);
  //     selectedNodes.push(nodeId);

  //     // Đổi màu tạm thời node được chọn
  //     picked.id.point.color = Cesium.Color.LIME;

  //     // Khi chọn 2 node → tìm đường đi ngắn nhất
  //     if (selectedNodes.length === 2) {
  //       const [start, end] = selectedNodes;
  //       const path = findShortestPath(nodeMap, edges, start, end);
  //       if (path.length > 0) {
  //         drawPath(path, nodeMap);
  //       } else {
  //         console.warn("⚠️ Không tìm thấy đường đi giữa", start, "và", end);
  //       }
  //       selectedNodes = [];
  //     }
  //   }
  // }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  //viewer.flyTo(viewer.entities);
  window.__network = { viewer, nodeMap, edges: network.edges };
}