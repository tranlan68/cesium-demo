import * as Cesium from "cesium";
import { createCylinderBetween , createCircleShape } from "../../utils/geometry.js";

export async function drawNetwork(viewer, url) {
  const res = await fetch(url);
  const data = await res.json();
  const nodes = data.nodes;
  const nodeMap = {};
  nodes.forEach(n => {
    nodeMap[n.id] = n;
  });
  const routes = data.routes;

  drawRoutes(viewer, routes);
  drawNodes(viewer, nodes);
  window.__network = { viewer, nodes, nodeMap, routes };
}

// --- Vẽ nodes ---
function drawNodes(viewer, nodes) {
  nodes.forEach(node => {
    const position = Cesium.Cartesian3.fromDegrees(node.lng, node.lat, (node.alt ?? 0) + 5);
    viewer.entities.add({
      id: node.id,
      position,
      model: {
        uri: '/assets/models/postbox.glb',
        scale: 0.5,
        minimumPixelSize: 40,       // đảm bảo nhìn rõ khi zoom xa
        //heightReference: Cesium.HeightReference.NONE, // luôn thấy node
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      // point: {
      //   pixelSize: 7.5,
      //   color: Cesium.Color.BLUE,
      //   outlineColor: Cesium.Color.BLACK,
      //   outlineWidth: 1,
      //   disableDepthTestDistance: Number.POSITIVE_INFINITY, // luôn thấy node
      // },
      label: {
        text: node.id,
        font: "10px sans-serif",
        fillColor: Cesium.Color.BLUE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: new Cesium.PropertyBag({ type: "node" }),
    });
  });
}

// --- Vẽ routes ---
function drawRoutes(viewer, routes) {
  routes.forEach(route => {
    const positions = route.waypoints.map(p =>
      Cesium.Cartesian3.fromDegrees( p.lng, p.lat, p.alt)
    );
    const edgeEntity = viewer.entities.add({
      polylineVolume: {
        positions,
        shape: createCircleShape(4),
        material: Cesium.Color.CYAN.withAlpha(0.1),
      },
    });

    // Đánh dấu là edge để loại bỏ khi click
    edgeEntity.properties = new Cesium.PropertyBag({ type: "edge" });

    // viewer.entities.add({
    //   name: `Route ${route.from}-${route.to}`,
    //   polyline: {
    //     positions,
    //     width: 2,
    //     material: Cesium.Color.LIGHTBLUE.withAlpha(0.6)
    //   }
    // });
  });
}