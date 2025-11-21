import * as Cesium from "cesium";
import { createCylinderBetween, createCircleShape } from "/src/cesium/geometry";

export interface Waypoint {
  lng: number;
  lat: number;
  alt: number;
}

export interface Node {
  id: string;
  lng: number;
  lat: number;
  alt?: number;
}

export interface Route {
  from: string;
  to: string;
  path: Waypoint[];
  waypoints: Waypoint[];
}

export interface Network {
  viewer: Cesium.Viewer;
  nodes: Node[];
  nodeMap: Record<string, Node>;
  routes: Route[];
}

// --- Khai báo mở rộng window ---
declare global {
  interface Window {
    __network?: Network;
  }
}

export async function drawNetwork(viewer: Cesium.Viewer, url: string, radius = 300) {
  const res = await fetch(url);
  const data = await res.json();

  const nodes: Node[] = data.nodes;
  const nodeMap: Record<string, Node> = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  const routes: Route[] = data.routes;

  drawRoutes(viewer, routes, radius);
  drawNodes(viewer, nodes);

  window.__network = { viewer, nodes, nodeMap, routes };
}

// --- Vẽ nodes ---
function drawNodes(viewer: Cesium.Viewer, nodes: Node[], radius = 15) {
  nodes.forEach((node) => {
    const position = Cesium.Cartesian3.fromDegrees(node.lng, node.lat, node.alt ?? 0);
    viewer.entities.add({
      id: node.id,
      position,
      model: {
        scale: 0.5,
        minimumPixelSize: 40,
        //disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: node.id,
        font: "14px sans-serif",
        fillColor: Cesium.Color.BLUE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: new Cesium.PropertyBag({ type: "node" }),
    });

    if (node.id === "P1" || node.id === "P5") {
      const edgeEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat, 10),
        cylinder: {
          length: 30,
          topRadius: 20,
          bottomRadius: 20,
          material: Cesium.Color.CYAN.withAlpha(0.2),
        },
      });
      edgeEntity.properties = new Cesium.PropertyBag({ type: "edge" });
    }
  });
}

// --- Vẽ routes ---
function drawRoutes(viewer: Cesium.Viewer, routes: Route[], radius = 150) {
  routes.forEach((route) => {
    const positions = route.path.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 25));
    const edgeEntity = viewer.entities.add({
      polylineVolume: {
        positions,
        shape: createCircleShape(radius),
        material: Cesium.Color.CYAN.withAlpha(0.2),
      },
    });
    edgeEntity.properties = new Cesium.PropertyBag({ type: "edge" });
  });
}
