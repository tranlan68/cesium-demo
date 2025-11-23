import * as Cesium from "cesium";
import { createCircleShape } from "/src/cesium/geometry";

export function highlightRoute(
  viewer: Cesium.Viewer,
  waypoints: { lat: number; lng: number; alt: number }[]
) {
  const positions: Cesium.Cartesian3[] = waypoints.map(p =>
    Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.alt)
  );

  const edgeEntity = viewer.entities.add({
    polylineVolume: {
      positions, // Cartesian3[]
      shape: createCircleShape(4), // Cartesian2[]
      material: Cesium.Color.RED.withAlpha(0.4),
    },
    properties: new Cesium.PropertyBag({ type: "edge" }), // đánh dấu entity
  });

  return edgeEntity;
}
