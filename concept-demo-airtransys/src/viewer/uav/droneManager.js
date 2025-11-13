import * as Cesium from "cesium";

import { createCylinderBetween, createCircleShape } from "/src/utils/geometry.js";

const drones = new Map(); // Lưu tất cả drone đang hoạt động
let droneCounter = 0;     // Đếm để sinh ID tự động


// 🧠 Hàm sinh ID tự động
function generateDroneId() {
  droneCounter++;
  return `drone-${Date.now()}-${droneCounter}`;
}

/**
 * Tạo drone ở vị trí node xuất phát
 * @param {Cesium.Viewer} viewer
 * @param {Object} startNode - node có {id, lat, lng, alt}
 * @param {Object} nodeMap - danh sách node theo id
 */
export function createDrone(viewer, droneId, uri, textColor, position) {
  // if (!startNode || !startNode.id) {
  //   console.warn("⚠️ createDrone: startNode không hợp lệ", startNode);
  //   return null;
  // }

  // let n = nodeMap[startNode.id];
  // if (!n) {
  //   console.warn("⚠️ createDrone: node không tồn tại trong nodeMap", startNode.id);
  //   return null;
  // }

  // let droneId = generateDroneId();

  // Xoá drone cũ nếu có
  if (drones.has(droneId)) {
    viewer.entities.remove(drones.get(droneId));
    drones.delete(droneId);
  }

  if (!position) position = Cesium.Cartesian3.fromDegrees(0, 0, 0);
  let carto = Cesium.Cartographic.fromCartesian(position);
  let altitude = carto.height.toFixed(1);

  let entity = viewer.entities.add({
    id: droneId,
    name: `Drone ${droneId}`,
    position,
    // ellipsoid: {
    //   radii: new Cesium.Cartesian3(1.5, 1.5, 1.5),
    //   material: Cesium.Color.RED.withAlpha(0.9),
    //   outline: true,
    //   outlineColor: Cesium.Color.WHITE,
    // },
    model: {
      uri: uri,
      minimumPixelSize: 60,
      maximumScale: 100,
      runAnimations: true,
      heightReference: Cesium.HeightReference.NONE
    },
    orientation: new Cesium.VelocityOrientationProperty(
      new Cesium.SampledPositionProperty()
    ),

    label: {
      text: `Độ cao ${altitude} m`,
      font: 'bold 16px sans-serif',
      fillColor: textColor,
      pixelOffset: new Cesium.Cartesian2(0, -15),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    properties: { type: "drone" }
  });
  entity.label.text = new Cesium.CallbackProperty((time) => {
    try {
      let pos = entity?.position?.getValue(time);
      if (!pos) return "";
      if (pos !== undefined) {
        try {
          let carto = Cesium.Cartographic.fromCartesian(pos);
          let alt = carto.height.toFixed(1);
          if (alt > 85) {
            return `Độ cao ${alt} m`;
          }
          return `Độ cao ${alt} m`;
        } catch (e) {
        }
      }
    } catch (error) {
    }
  }, false);
  drones.set(droneId, entity);

  //console.log("🚁 Drone created at", startNode.id);
  return entity;
}

// --- Lấy drone theo id ---
export function getDrone(droneId) {
  return drones.get(droneId);
}

export function updateDrone(viewer, droneId, position) {
  drones[droneId].position = position;
}

export function isExist(droneId) {
  if (drones.has(droneId)) {
    return true;
  }
  return false;
}

/**
 * Xoá drone khỏi bản đồ
 */
export function removeDrone(viewer, droneId) {
  console.log("🗑️ TLLLLLLL removed: ", droneId);
  let entity = drones.get(droneId);
  if (entity) {
    viewer.entities.remove(entity);
    drones.delete(droneId);
    console.log("🗑️ Drone removed");
  }
}

/**
 * Di chuyển drone dọc theo đường đi (path)
 */
export function animateDroneAlongPath(viewer, drone, waypoints, color, offsetAlt, offsetAlt2) {
  let changeTime = 36;
  if (!drone || !waypoints || waypoints.length === 0) {
    console.warn("⚠️ animateDroneAlongPath: Drone hoặc path không hợp lệ");
    return;
  }

  let property = new Cesium.SampledPositionProperty();
  let start = Cesium.JulianDate.now();
  let t = 0;

  // --- Tạo polyline highlight dần ---
  // let highlightedPositions = [];
  // let highlightEntity = viewer.entities.add({
  //   polylineVolume: {
  //     highlightedPositions,
  //     shape: createCircleShape(4),
  //     material: Cesium.Color.RED.withAlpha(0.4),
  //   },
  // });

  let offsetArray = [];

  for (let i = 0; i < waypoints.length; i++) {
    let wp = waypoints[i];

    if (i < changeTime) {
      try {
        offsetArray.push(Math.round((Math.random() * 4) / 0.1) * 0.1 - 2);
        let position = Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.alt + offsetAlt + offsetArray[i]);
        let time = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
        property.addSample(time, position);
        t += 1;
        //highlightedPositions.push(position);
      } catch (e) {
        console.error("Error adding sample at i =", i, "wp:", wp, e);
      }
    } else if (i === changeTime) {
      offsetArray.push(Math.round((Math.random() * 4) / 0.1) * 0.1 - 2);
      let position = Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.alt + offsetAlt + offsetArray[i]);
      let time = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
      property.addSample(time, position);
      t += 1;

      i++;
      offsetArray.push(Math.round((Math.random() * 4) / 0.1) * 0.1 - 2);
      wp = waypoints[i];
      let position2 = Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.alt + (offsetAlt2 + offsetAlt) / 2 + offsetArray[i]);
      let time2 = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
      property.addSample(time2, position2);
      t += 1;

      i++;
      offsetArray.push(Math.round((Math.random() * 4) / 0.1) * 0.1 - 2);
      wp = waypoints[i];
      let position3 = Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.alt + offsetAlt2 + offsetArray[i]);
      let time3 = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
      property.addSample(time3, position3);
      t += 1;

    } else {
      offsetArray.push(Math.round((Math.random() * 4) / 0.1) * 0.1 - 2);
      let position = Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.alt + offsetAlt2 + offsetArray[i]);
      let time = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
      property.addSample(time, position);
      t += 1;
      //highlightedPositions.push(position);
    }
  }

  drone.position = property;
  //drone.orientation = new Cesium.VelocityOrientationProperty(property);
  drone.orientation = new Cesium.CallbackPositionProperty(function (time, result) {
    try {
      let position = drone.position.getValue(time);
      let heading = 0;
      return Cesium.Transforms.headingPitchRollQuaternion(position, new Cesium.HeadingPitchRoll(heading, 0, 0));
    } catch (e) {
      console.error("Error in orientation callback:", e);
    }

  }, false);

  viewer.clock.startTime = start.clone();
  viewer.clock.stopTime = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
  viewer.clock.currentTime = start.clone();
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
  //viewer.trackedEntity = drone;

  // drone.position = property;
  // viewer.clock.startTime = Cesium.JulianDate.now();
  // viewer.clock.stopTime = time;
  // viewer.clock.currentTime = Cesium.JulianDate.now();
  // viewer.clock.clockRange = Cesium.ClockRange.CLAMPED; // dừng lại khi hết đường
  // viewer.clock.multiplier = 1; // tốc độ animation
  // viewer.clock.shouldAnimate = true;

  // let highlightEntity = viewer.entities.add({
  //   name: "Drone Path Highlight",
  //   polylineVolume: {
  //     positions: new Cesium.CallbackProperty(() => {
  //       let positions = [];
  //       let currentTime = viewer.clock.currentTime;
  //       for (let i = 0; i < waypoints.length; i++) {
  //         let t = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
  //         if (Cesium.JulianDate.lessThanOrEquals(t, currentTime)) {
  //           positions.push(Cesium.Cartesian3.fromDegrees(
  //             waypoints[i].lng, waypoints[i].lat, waypoints[i].alt
  //           ));
  //         } else {
  //           break;
  //         }
  //       }
  //       return positions;
  //     }, false),
  //     shape: createCircleShape(4),
  //     material: Cesium.Color.RED.withAlpha(0.4),
  //   }
  // });
  let highlightEntity = viewer.entities.add({
    name: "Drone Path Highlight",
    polylineVolume: {
      positions: new Cesium.CallbackProperty(() => {
        while (true) {
          try {
            let positions = [];
            let currentTime = viewer.clock.currentTime;
            let end = Cesium.JulianDate.addSeconds(start, waypoints.length, new Cesium.JulianDate());

            // khi hết thời gian thì xóa entity
            if (Cesium.JulianDate.greaterThanOrEquals(currentTime, end)) {
              viewer.entities.remove(highlightEntity);
              return [];
            }

            positions.push(Cesium.Cartesian3.fromDegrees(
              waypoints[0].lng, waypoints[0].lat, waypoints[0].alt
            ));
            for (let i = 0; i < waypoints.length; i++) {
              let t = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
              if (Cesium.JulianDate.lessThanOrEquals(t, currentTime)) {
                if (i < changeTime) {
                  positions.push(Cesium.Cartesian3.fromDegrees(
                    waypoints[i].lng, waypoints[i].lat, waypoints[i].alt + offsetAlt + offsetArray[i]
                  ));
                } else if (i === changeTime) {
                  positions.push(Cesium.Cartesian3.fromDegrees(
                    waypoints[i].lng, waypoints[i].lat, waypoints[i].alt + offsetAlt + offsetArray[i]
                  ));
                  i++
                  new Promise(resolve => setTimeout(resolve, 1000));
                  positions.push(Cesium.Cartesian3.fromDegrees(
                    waypoints[i].lng, waypoints[i].lat, waypoints[i].alt + (offsetAlt2 + offsetAlt) / 2 + offsetArray[i]
                  ));
                  i++
                  new Promise(resolve => setTimeout(resolve, 1000));
                  positions.push(Cesium.Cartesian3.fromDegrees(
                    waypoints[i].lng, waypoints[i].lat, waypoints[i].alt + offsetAlt2 + offsetArray[i]
                  ));
                } else {
                  positions.push(Cesium.Cartesian3.fromDegrees(
                    waypoints[i].lng, waypoints[i].lat, waypoints[i].alt + offsetAlt2 + offsetArray[i]
                  ));
                }
              } else {
                break;
              }
            }
            return positions;
          } catch (e) {
            console.error(e);
          }
        }
      }, false),
      shape: createCircleShape(0.5),
      material: color.withAlpha(0.9),
    }
  });
}

// --- Lấy tất cả drone ---
export function getAllDrones() {
  return Array.from(drones.values());
}

let activeDrone = null;
let removeCameraFollow = null;

export function setCameraFollowDrone(viewer, drone) {
  try {
    //stopCameraFollow();   // dừng nếu đang theo drone khác

    removeCameraFollow = viewer.scene.preRender.addEventListener(() => {
      try {
        let pos = drone.position?.getValue(viewer.clock.currentTime);
        if (!pos) return;

        // tạo heading từ hướng bay
        let nextPos = Cesium.Cartesian3.clone(pos);
        nextPos.x += 5;
        nextPos.y += 5;

        let heading = getHeadingFromPositions(pos, nextPos);
        let pitch = Cesium.Math.toRadians(-15);   // nhìn xuống 15 độ
        let range = 30;                           // camera cách drone 30m

        // 🎯 Đây là dòng quan trọng – không dùng Transforms
        viewer.camera.lookAt(
          pos,
          new Cesium.HeadingPitchRange(heading, pitch, range)
        );
      } catch (e) {
      }
    });
  } catch (error) {
  }
}

function getHeadingFromPositions(startPos, endPos) {
  let startCarto = Cesium.Cartographic.fromCartesian(startPos);
  let endCarto = Cesium.Cartographic.fromCartesian(endPos);

  let y = Math.sin(endCarto.longitude - startCarto.longitude) *
    Math.cos(endCarto.latitude);
    let x = Math.cos(startCarto.latitude) * Math.sin(endCarto.latitude) -
    Math.sin(startCarto.latitude) * Math.cos(endCarto.latitude) *
    Math.cos(endCarto.longitude - startCarto.longitude);

  let heading = Math.atan2(y, x);
  return Cesium.Math.zeroToTwoPi(heading);
}

// function stopCameraFollow(viewer) {
//   if (removeCameraFollow) {
//     removeCameraFollow();
//     removeCameraFollow = null;
//   }
//   viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
//   activeDrone = null;
// }


// Hàm mở popup và gửi dữ liệu drone liên tục
export function openDroneWindow(mainViewer, drone) {
  let win = window.open("./dronePopup.html", "_blank", "width=600,height=300");

  function sendPosition() {
    let pos = drone.position?.getValue(mainViewer.clock.currentTime);
    if (!pos) return;

    let carto = Cesium.Cartographic.fromCartesian(pos);
    win.postMessage({
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      alt: carto.height,
      heading: drone.heading || 0,
      pitch: -15
    }, "*");
  }

  let interval = setInterval(() => {
    if (win.closed) clearInterval(interval);
    else sendPosition();
  }, 200);

  // gửi vị trí ban đầu sớm hơn một chút
  setTimeout(sendPosition, 200);

  window.addEventListener("message", e => {
    try {
      if (e.data?.type === "closeDronePopup") {
        win.close();
      }
    } catch (error) {
    }
  });
}
