import * as Cesium from "cesium";

export function createCircleShape(radius = 1.5, segments = 4, mode = 0) {
  let shape = [];
  if (mode === 0) {
    segments = 4; // Hình hộp chữ nhật
    shape.push(new Cesium.Cartesian2(-radius*1.5, -radius/2));
    shape.push(new Cesium.Cartesian2(radius*1.5, -radius/2));
    shape.push(new Cesium.Cartesian2(radius*1.5, radius/2));
    shape.push(new Cesium.Cartesian2(-radius*1.5, radius/2));
  } else {
    segments = 32;
    for (let i = 0; i <= segments; i++) {
      let theta = (i / segments) * 2 * Math.PI;
      shape.push(
        new Cesium.Cartesian2(
          Math.cos(theta) * radius,
          Math.sin(theta) * radius
        )
      );
    }
  }

  return shape;
}

export function createCylinderBetween(viewer, a, b, color, radius = 1.5) {
  let start = Cesium.Cartesian3.fromDegrees(a.lng, a.lat, a.alt);
  let end = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.alt);

  viewer.entities.add({
    polylineVolume: {
      positions: [start, end],
      shape: createCircleShape(radius),
      material: color,
    },
  });
}
