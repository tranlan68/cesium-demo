import * as Cesium from "cesium";
import { createCylinderBetween , createCircleShape } from "/src/utils/geometry.js";

export async function drawNetwork(viewer, url, radius = 300) {
  let res = await fetch(url);
  let data = await res.json();
  let nodes = data.nodes;
  let nodeMap = {};
  nodes.forEach(n => {
    nodeMap[n.id] = n;
  });
  let routes = data.routes;

  drawRoutes(viewer, routes, radius);
  //drawNodes(viewer, nodes);
  window.__network = { viewer, nodes, nodeMap, routes };
}

// --- Vẽ nodes ---
function drawNodes(viewer, nodes) {
  nodes.forEach(node => {
    let position = Cesium.Cartesian3.fromDegrees(node.lng, node.lat, node.alt ?? 0);
    viewer.entities.add({
      id: node.id,
      position,
      model: {
        uri: './assets/models/postbox.glb',
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
function drawRoutes(viewer, routes, radius = 150) {

  // routes.forEach(route => {
  //   // route.path là mảng các điểm {lng, lat, alt}
  //   createSmoothCylinder(viewer, route.path, 25, 64, Cesium.Color.CYAN.withAlpha(0.2));
  // });

  routes.forEach(route => {
    let positions = route.path.map(p =>
      Cesium.Cartesian3.fromDegrees( p.lng, p.lat, -radius)
    );
    let edgeEntity = viewer.entities.add({
      polylineVolume: {
        positions,
        shape: createCircleShape(radius),
        material: Cesium.Color.CYAN.withAlpha(0.2),
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

  //   // step: khoảng cách chia đoạn, càng nhỏ càng mượt
  // for (let i = 0; i < route.waypoints.length - 1; i++) {
  //   let start = route.waypoints[i];
  //   let end = route.waypoints[i + 1];

  //   let startCart = Cesium.Cartesian3.fromDegrees(start.lng, start.lat, start.alt);
  //   let endCart = Cesium.Cartesian3.fromDegrees(end.lng, end.lat, end.alt);

  //   viewer.entities.add({
  //     polylineVolume: {
  //       positions: [startCart, endCart],
  //       shape: createCircleShape(25, 64),
  //       material: Cesium.Color.CYAN.withAlpha(0.2),
  //     }
  //   });
  // }
  });
}


// Tạo vòng tròn nằm trên mặt phẳng vuông góc với trục
function createCircle3D(center, next, radius = 1.5, segments = 16) {
  let circle = [];
  let forward = Cesium.Cartesian3.subtract(next, center, new Cesium.Cartesian3());
  Cesium.Cartesian3.normalize(forward, forward);

  // Tìm vector vuông góc với forward
  let up = Cesium.Cartesian3.UNIT_Z; // vector chuẩn
  let right = new Cesium.Cartesian3();
  Cesium.Cartesian3.cross(forward, up, right);
  if (Cesium.Cartesian3.magnitude(right) < 0.001) {
    // Nếu trùng vector up, đổi vector up
    Cesium.Cartesian3.cross(forward, Cesium.Cartesian3.UNIT_X, right);
  }
  Cesium.Cartesian3.normalize(right, right);

  let upCorrected = new Cesium.Cartesian3();
  Cesium.Cartesian3.cross(right, forward, upCorrected);

  for (let i = 0; i <= segments; i++) {
    let theta = (i / segments) * 2 * Math.PI;
    let point = new Cesium.Cartesian3();
    Cesium.Cartesian3.multiplyByScalar(right, Math.cos(theta) * radius, point);
    Cesium.Cartesian3.add(point, Cesium.Cartesian3.multiplyByScalar(upCorrected, Math.sin(theta) * radius, new Cesium.Cartesian3()), point);
    Cesium.Cartesian3.add(point, center, point);
    circle.push(point);
  }
  return circle;
}

// Vẽ ống từ 1 chuỗi điểm
function createSmoothCylinder(viewer, points, radius = 1.5, segments = 16, color = Cesium.Color.CYAN.withAlpha(0.3)) {
  for (let i = 0; i < points.length - 1; i++) {
    let start = Cesium.Cartesian3.fromDegrees(points[i].lng, points[i].lat, points[i].alt);
    let end = Cesium.Cartesian3.fromDegrees(points[i + 1].lng, points[i + 1].lat, points[i + 1].alt);

    let circleStart = createCircle3D(start, end, radius, segments);
    let circleEnd = createCircle3D(end, start, radius, segments);

    // Nối các điểm tương ứng giữa hai vòng tròn bằng polyline
    for (let j = 0; j < circleStart.length; j++) {
      viewer.entities.add({
        polyline: {
          positions: [circleStart[j], circleEnd[j]],
          width: 2,
          material: color,
        }
      });
    }
  }
}