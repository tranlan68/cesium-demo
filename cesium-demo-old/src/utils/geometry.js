import * as Cesium from "cesium";

export function createCircleShape(radius = 1.5, segments = 16) {
    const shape = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      shape.push(new Cesium.Cartesian2(Math.cos(theta) * radius, Math.sin(theta) * radius));
    }
    return shape;
  }
  
export function createCylinderBetween(viewer, a, b, color, radius = 1.5) {
    const start = Cesium.Cartesian3.fromDegrees(a.lng, a.lat, a.alt);
    const end = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.alt);
  
    viewer.entities.add({
      polylineVolume: {
        positions: [start, end],
        shape: createCircleShape(radius),
        material: color,
      },
    });
  }