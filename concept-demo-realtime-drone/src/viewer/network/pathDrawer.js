import * as Cesium from "cesium";
import { createCylinderBetween , createCircleShape } from "../../utils/geometry.js";

export function highlightRoute(viewer, waypoints) {
  const positions = waypoints.map(p =>
     Cesium.Cartesian3.fromDegrees( p.lng, p.lat, p.alt)
  );
  const edgeEntity = viewer.entities.add({
    polylineVolume: {
      positions,
      shape: createCircleShape(4),
      material: Cesium.Color.RED.withAlpha(0.4),
    },
  });
  
  // Đánh dấu là edge để loại bỏ khi click
  edgeEntity.properties = new Cesium.PropertyBag({ type: "edge" });
}