import * as Cesium from "cesium";
import {
  animateDroneAlongPath,
  createDrone,
  setCameraFollowDrone,
  openDroneWindow,
} from "/src/viewer/uav/droneManager";
import { highlightRoute } from "./pathDrawer.js";

let warningEntity: Cesium.Entity | null = null;
let blinkInterval: number | null = null;

// =========================
// Node selection + drone launch
// =========================
export function enableNodeSelection(viewer: Cesium.Viewer) {
    if (!window.__network) {
      throw new Error("__network chưa được khởi tạo");
    }
  const selectedNodes: string[] = [];
  const { nodes, nodeMap, routes } = window.__network;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const picked = viewer.scene.pick(click.position);
    if (!Cesium.defined(picked)) return;

    const type = picked.id?.properties?.getValue?.()?.type;
    if (!type) return;

    if (type === "node") {
      const nodeId = picked.id.id;
      console.log("🟢 Click node:", nodeId);
      selectedNodes.push(nodeId);

      if (selectedNodes.length === 2) {
        const [startId, endId] = selectedNodes;
        const waypoints = findWaypoints(routes, startId, endId);
        if (waypoints.length < 2) {
          console.warn("⚠️ Không tìm thấy đường đi giữa", startId, endId);
          selectedNodes.length = 0;
          return;
        }

        // Highlight đường đi
        highlightRoute(viewer, waypoints);

        // Tạo drone A
        const droneA = createDrone(
          viewer,
          "./assets/models/drone1.glb",
          Cesium.Color.RED,
          nodeMap[startId],
          nodeMap,
          0
        );
        openDroneWindow(viewer, droneA);
        animateDroneAlongPath(viewer, droneA, waypoints, Cesium.Color.RED, 0, 0);

        // Tạo drone B sau 5s
        setTimeout(() => {
          const droneB = createDrone(
            viewer,
            "./assets/models/drone2.glb",
            Cesium.Color.PURPLE,
            nodeMap[endId],
            nodeMap,
            0
          );
          animateDroneAlongPath(
            viewer,
            droneB,
            [...waypoints].reverse(),
            Cesium.Color.PURPLE,
            0,
            10
          );

          // Tạo cảnh báo va chạm
          createCollisionWarning(viewer);

          // Theo dõi khoảng cách 2 drone
          viewer.clock.onTick.addEventListener(() => {
            const posA = getDronePosition(viewer, droneA);
            const posB = getDronePosition(viewer, droneB);
            if (!posA || !posB) {
              hideCollisionWarning(viewer);
              return;
            }

            const d = Cesium.Cartesian3.distance(posA, posB);
            if (d < 50) {
              const mid = interpolate(posA, posB, 0.5);
              showCollisionWarning(viewer, mid);
            } else {
              hideCollisionWarning(viewer);
            }
          });
        }, 5000);

        selectedNodes.length = 0;
      }
    }

    // Drone click → camera follow
    if (type === "drone") {
      const drone = picked.id;
      setCameraFollowDrone(viewer, drone);
      openDroneWindow(viewer, drone);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// =========================
// Cảnh báo va chạm
// =========================
function createCollisionWarning(viewer: Cesium.Viewer) {
  if (warningEntity) viewer.entities.remove(warningEntity);

  warningEntity = viewer.entities.add({
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
    show: false,
  });
}

function showCollisionWarning(viewer: Cesium.Viewer, midPos: Cesium.Cartesian3) {
  if (!warningEntity) return;

  warningEntity.position = new Cesium.ConstantPositionProperty(getElevatedPosition(midPos, 5));
  warningEntity.show = true;

  if (blinkInterval) return; // đã chạy
  const blinkSpeed = 2.0;
  blinkInterval = window.setInterval(() => {
    if (!warningEntity || !warningEntity.show) return;
    const seconds =
      Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime() / 1000.0;
      const alpha = (Math.sin(seconds * Math.PI * blinkSpeed) + 1) / 2;
      if (warningEntity.label) {
          warningEntity.label.fillColor = new Cesium.ConstantProperty(Cesium.Color.RED.withAlpha(alpha * 0.9 + 0.1));
      }
  }, 500);
}

function hideCollisionWarning(viewer?: Cesium.Viewer) {
  if (warningEntity) {
    warningEntity.show = false;
  }
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
}

// =========================
// Hỗ trợ
// =========================
function getDronePosition(viewer: Cesium.Viewer, drone: Cesium.Entity | undefined) {
  if (!drone) return null;
  const time = viewer.clock.currentTime;
  const pos = drone.position?.getValue(time);
  return pos ?? null;
}

function interpolate(p1: Cesium.Cartesian3, p2: Cesium.Cartesian3, t: number) {
  return Cesium.Cartesian3.lerp(p1, p2, t, new Cesium.Cartesian3());
}

function getElevatedPosition(cartesian: Cesium.Cartesian3, heightOffset = 50) {
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  carto.height += heightOffset;
  return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height);
}

function findWaypoints(routes: any[], a: string, b: string) {
  const route = routes.find(
    (r) => (r.from === a && r.to === b) || (r.from === b && r.to === a)
  );
  if (!route) return [];
  return route.from === a ? route.waypoints : [...route.waypoints].reverse();
}
