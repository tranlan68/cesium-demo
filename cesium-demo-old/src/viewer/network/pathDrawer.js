import * as Cesium from "cesium";
import { createCylinderBetween } from "../../utils/geometry.js";

export function drawPath(viewer, path, nodeMap) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = nodeMap[path[i]];
    const b = nodeMap[path[i + 1]];
    createCylinderBetween(viewer, a, b, Cesium.Color.RED.withAlpha(0.4), 4);
  }
}