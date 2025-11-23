import * as Cesium from "cesium";

export function createCircleShape(
  height = 1.5,
  width = height,
  segments = 4,
  mode = 0
): Cesium.Cartesian2[] {
  const shape: Cesium.Cartesian2[] = [];
  if (mode === 0) {
    // Hình hộp chữ nhật
    shape.push(new Cesium.Cartesian2(-width, -height / 2));
    shape.push(new Cesium.Cartesian2(width, -height / 2));
    shape.push(new Cesium.Cartesian2(width, height / 2));
    shape.push(new Cesium.Cartesian2(-width, height / 2));
  } else {
    segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      shape.push(new Cesium.Cartesian2(Math.cos(theta) * height/2, Math.sin(theta) * height/2));
    }
  }
  return shape;
}

export function createCylinderBetween(
  viewer: Cesium.Viewer,
  a: { lat: number; lng: number; alt: number },
  b: { lat: number; lng: number; alt: number },
  color: Cesium.Color,
  radius = 1.5
) {
  const start = Cesium.Cartesian3.fromDegrees(a.lng, a.lat, a.alt);
  const end = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.alt);

  viewer.entities.add({
    polylineVolume: {
      positions: [start, end],
      shape: createCircleShape(radius),
      material: new Cesium.ColorMaterialProperty(color),
    },
  });
}
