import * as Cesium from "cesium";
import { animateDroneAlongPath, createDrone , setCameraFollowDrone , openDroneWindow} from "../uav/droneManager.js";
import { findShortestPath } from "./dijkstra.js";
import { drawPath } from "./pathDrawer.js";

export function enableNodeSelection(viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  const { nodeMap, edges } = window.__network;
  let selectedNodes = [];

  handler.setInputAction((click) => {
    // const picked = viewer.scene.pick(click.position);
    // if (Cesium.defined(picked) && picked.id?.nodeId) {
    //   selectedNodes.push(picked.id.nodeId);
    //   console.log("Selected node:", picked.id.nodeId);

    //   //picked.id.point.color = Cesium.Color.LIME;

    //   if (selectedNodes.length === 2) {
    //     console.log("selectedNodes:", selectedNodes);
    //     const path = findShortestPath(nodeMap, edges, selectedNodes[0], selectedNodes[1]);
    //     console.log("path:", path);
    //     drawPath(viewer, path, nodeMap);
    //     selectedNodes = [];
    //   }
    // }

    const picked = viewer.scene.pick(click.position);
    if (!Cesium.defined(picked)) return;

    const type = picked.id?.properties?.getValue()?.type;

    if (type === "node") {
        const nodeId = picked.id.id;
        console.log("🟢 Click node:", nodeId);
        selectedNodes.push(nodeId);

        picked.id.point.color = Cesium.Color.RED; // tô màu node chọn

        if (selectedNodes.length === 2) {
        const [start, end] = selectedNodes;
        const path = findShortestPath(nodeMap, edges, start, end);
        console.log("path:", path);
        if (path.length > 1) {
            drawPath(viewer, path, nodeMap);

            // Tạo drone tại điểm bắt đầu
            const drone = createDrone(viewer, nodeMap[path[0]], nodeMap);
            // Drone bay theo đường đi
            openDroneWindow(viewer, drone);
            animateDroneAlongPath(viewer, drone, path, nodeMap);

        } else {
            console.warn("⚠️ Không tìm thấy đường đi giữa", start, "và", end);
        }
        selectedNodes = [];
        }
    }
    else if (type === "drone") {
        const drone = picked.id;
        //setCameraFollowDrone(viewer, drone);
        openDroneWindow(viewer, drone);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}