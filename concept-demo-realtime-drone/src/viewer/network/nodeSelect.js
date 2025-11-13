import * as Cesium from "cesium";
import { animateDroneAlongPath, createDrone, setCameraFollowDrone, openDroneWindow } from "/src/viewer/uav/droneManager.js";
import { highlightRoute } from "./pathDrawer.js";

let warningEntity = null;

export function enableNodeSelection(viewer) {
  let selectedNodes = [];
  const { nodes, nodeMap, routes } = window.__network;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction(function (click) {
    const picked = viewer.scene.pick(click.position);
    if (!Cesium.defined(picked)) return;

    const type = picked.id?.properties?.getValue()?.type;
    if (type === "node") {
      const nodeId = picked.id.id;
      console.log("🟢 Click node:", nodeId);
      selectedNodes.push(nodeId);

      //picked.id.point.color = Cesium.Color.RED; // tô màu node chọn -> không dùng được cho ảnh 3D

      if (selectedNodes.length === 2) {
        const [start, end] = selectedNodes;
        const waypoints = findWaypoints(routes, start, end);
        console.log("waypoints:", waypoints);
        if (waypoints.length > 1) {
          //highlightRoute(viewer, waypoints);

          // Tạo drone tại điểm bắt đầu
          console.log("nodeMap:", nodeMap);
          console.log("selectedNodes:", selectedNodes[0]);
          const drone = createDrone(viewer, './assets/models/drone1.glb', Cesium.Color.RED, nodeMap[selectedNodes[0]], nodeMap, 0);
          // Drone bay theo đường đi
          let startScenarioTime = Date.now()
          // Drone bay theo đường đi
          openDroneWindow(viewer, drone);
          animateDroneAlongPath(viewer, drone, waypoints, Cesium.Color.RED, 0, 0);

          const totalTime = waypoints.length; // mỗi waypoint = 1s
          const start = viewer.clock.currentTime;
          const stopTime = Cesium.JulianDate.addSeconds(start, totalTime, new Cesium.JulianDate());

          const stopCheck = viewer.clock.onTick.addEventListener(() => {
            try {
              if (Cesium.JulianDate.greaterThanOrEquals(viewer.clock.currentTime, stopTime)) {
                viewer.clock.shouldAnimate = false;
                stopCheck(); // gỡ listener
                // đóng popup
                window.postMessage({ type: "closeDronePopup" }, "*");
              }
            } catch (e) {
              console.error("Error in stopCheck:", e);
            }
          });

        } else {
          console.warn("⚠️ Không tìm thấy đường đi giữa", start, "và", end);
        }
        selectedNodes = [];
      }
    }
    else if (type === "drone") {
      const drone = picked.id;
      //setCameraFollowDrone(viewer, drone);
      //openDroneWindow(viewer, drone);
    }

    //   if (picked && picked.id && picked.id.id.startsWith('N')) {
    //   const nodeId = picked.id.id;
    //   selectedNodes.push(nodeId);
    //   console.log("Selected:", nodeId);

    //   if (selectedNodes.length === 2) {
    //     highlightRoute(selectedNodes[0], selectedNodes[1]);
    //     selectedNodes = [];
    //   }
    // }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

export async function startScenario(viewer, timerDisplay) {
  let selectedNodes = ["VMC", "TTTC"];
  const { nodes, nodeMap, routes } = window.__network;

  const [start, end] = selectedNodes;
  const waypoints = findWaypoints(routes, start, end);
  if (waypoints.length > 1) {
    const reverseWaypoints = waypoints.slice().reverse();
    // Tạo drone tại điểm bắt đầu
    const droneA = createDrone(viewer, './assets/models/drone1.glb', Cesium.Color.RED, nodeMap[selectedNodes[0]], nodeMap, 0);
    let startScenarioTime = Date.now()
    animateDroneAlongPath(viewer, droneA, waypoints, Cesium.Color.RED, 0, 0);
    let droneB = undefined;

    // Cập nhật mỗi frame
    let collisionWarning = createCollisionWarning(viewer);
    viewer.clock.onTick.addEventListener(() => {
      try {
        let positionDroneA = getDronePosition(viewer, droneA);
        let positionDroneB = getDronePosition(viewer, droneB);
        if (positionDroneA && positionDroneB) {
          const d = distance(positionDroneA, positionDroneB);
          console.log("Khoảng cách:", d.toFixed(2), "m");
          if (d < 70) {
            //console.log("⚠️ Drone sắp gặp nhau! Khoảng cách:", d.toFixed(2), "m");
            // Tọa độ trung điểm để show cảnh báo
            const midPos = interpolate(positionDroneA, positionDroneB, 0.5);
            showCollisionWarning(viewer, collisionWarning, midPos);
          } else {
            if (collisionWarning && collisionWarning.show === true) {
              // Khoảng cách lớn hơn threshold → bỏ cảnh báo
              hideCollisionWarning(viewer);
            }
          }
        }
        if (!positionDroneA && !positionDroneB) {
          timerDisplay.textContent = "Hoàn thành";
        } else {
          const elapsed = ((Date.now() - startScenarioTime) / 1000).toFixed(0);
          timerDisplay.textContent = `Thời gian: ${elapsed}s`;
          console.log(timerDisplay.textContent);
        }
      } catch (e) {
        console.error("Error in onTick:", e);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));
    // Tạo drone tại điểm bắt đầu
    console.error("createDrone droneB");
    droneB = createDrone(viewer, './assets/models/drone2.glb', Cesium.Color.PURPLE, nodeMap[selectedNodes[1]], nodeMap, 0);
    animateDroneAlongPath(viewer, droneB, reverseWaypoints, Cesium.Color.PURPLE, 0, 10);
  } else {
    console.warn("⚠️ Không tìm thấy đường đi giữa", start, "và", end);
  }
}

function interpolate(p1, p2, t) {
  return Cesium.Cartesian3.lerp(p1, p2, t, new Cesium.Cartesian3());
}

function createCollisionWarning(viewer) {
  // Nếu đã có cảnh báo, xóa trước
  if (warningEntity) {
    viewer.entities.remove(warningEntity);
  }

  warningEntity = viewer.entities.add({
    // billboard: {
    //   image: "./assets/alert.png",
    //   verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    //   scale: 0.05,
    // },
    label: {
      text: "⚠️ Sắp va chạm!",
      font: "16px sans-serif",
      fillColor: Cesium.Color.RED,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: new Cesium.Cartesian2(0, -40),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    show: false
  });
  return warningEntity;
}

function showCollisionWarning(viewer, warningEntity, midPos) {
  warningEntity.position = getElevatedPosition(midPos, 20);  // cập nhật vị trí
  warningEntity.show = true;        // hiển thị

  let blinkSpeed = 2.0;
  if (!warningEntity.position) {
    setInterval(() => {
      if (warningEntity && warningEntity.show === true) {
        const seconds = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime() / 1000.0;
        const alpha = (Math.sin(seconds * Math.PI * blinkSpeed) + 1) / 2; // dao động từ 0 → 1
        warningEntity.label.fillColor = Cesium.Color.RED.withAlpha(alpha * 0.9 + 0.1);
      }
    }, 500);
  }
}

function hideCollisionWarning(viewer) {
  if (warningEntity) {
    viewer.entities.remove(warningEntity);
    warningEntity = null;
  }
}

function getElevatedPosition(cartesian, heightOffset = 50) {
  if (!cartesian) return null;
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  cartographic.height += heightOffset;
  return Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height
  );
}


function getDronePosition(viewer, drone) {
  if (!drone) return undefined;
  const dronePositionProperty = drone.position;

  // Lấy thời điểm hiện tại (hoặc bất kỳ thời điểm nào)
  const time = viewer.clock.currentTime; // Cesium.JulianDate

  // Lấy vị trí Cartesian3
  const position = dronePositionProperty.getValue(time);

  if (position) {
    return position;
  } else {
    console.log("Vị trí chưa có tại thời điểm này");
  }
}

// Hàm tính khoảng cách giữa 2 point Cartesian
function distance(c1, c2) {
  return Cesium.Cartesian3.distance(c1, c2);
}

function findWaypoints(routes, a, b) {
  // tìm các route giữa a và b
  const route = routes.find(r =>
    (r.from === a && r.to === b) || (r.from === b && r.to === a)
  );
  console.error("route: ", route);
  if (route && route !== undefined) {
    if (route.from === a) {
      return route.waypoints;
    }
    else {
      return route.waypoints.reverse();
    }
  }
  return [];
}