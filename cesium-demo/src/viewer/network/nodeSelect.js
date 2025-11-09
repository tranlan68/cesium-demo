import * as Cesium from "cesium";
import { animateDroneAlongPath, createDrone , setCameraFollowDrone , openDroneWindow} from "../uav/droneManager.js";
import { highlightRoute } from "./pathDrawer.js";

export function enableNodeSelection(viewer) {
  let selectedNodes = [];
  const { nodes, nodeMap, routes } = window.__network;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction(function(click) {
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
        const waypoints = findWaypoints(start, end);
        console.log("waypoints:", waypoints);
        if (waypoints.length > 1) {
          //highlightRoute(viewer, waypoints);

          // Tạo drone tại điểm bắt đầu
          console.log("nodeMap:", nodeMap);
          console.log("selectedNodes:", selectedNodes[0]);
          const drone = createDrone(viewer, nodeMap[selectedNodes[0]], nodeMap);
          // Drone bay theo đường đi
          openDroneWindow(viewer, drone);
          animateDroneAlongPath(viewer, drone, waypoints);

          const totalTime = waypoints.length; // mỗi waypoint = 1s
          const start = viewer.clock.currentTime;
          const stopTime = Cesium.JulianDate.addSeconds(start, totalTime, new Cesium.JulianDate());

          const stopCheck = viewer.clock.onTick.addEventListener(() => {
            if (Cesium.JulianDate.greaterThanOrEquals(viewer.clock.currentTime, stopTime)) {
              viewer.clock.shouldAnimate = false;
              stopCheck(); // gỡ listener
                // đóng popup
              window.postMessage({ type: "closeDronePopup" }, "*");
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

function findWaypoints(a, b) {
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
}