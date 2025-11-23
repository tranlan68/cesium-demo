import * as Cesium from "cesium";
import {
  animateDroneAlongPath,
  createDrone,
  setCameraFollowDrone,
  openDroneWindow,
} from "/src/viewer/uav/droneManager";
import { DRONE_MODEL_1, DRONE_MODEL_2 , COLLISION_DISTANCE_THRESHOLD, COLLISION_HEIGHT_OFFSET} from "/src/constants";
import { highlightRoute } from "/src/viewer/network/pathDrawer";

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
          DRONE_MODEL_1,
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
            DRONE_MODEL_2,
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
          const collisionWarning = createCollisionWarning(viewer);

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
              showCollisionWarning(viewer, collisionWarning, mid);
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

export async function startScenario(viewer: Cesium.Viewer, timerDisplay: HTMLElement) {
  // nodes to simulate (kept as in original code)
  const selectedNodes = ["VMC", "TTTC"];

  // safety: ensure window.__network exists
  if (!window.__network) {
    console.warn("window.__network chưa được khởi tạo.");
    return;
  }
  const { nodeMap, routes } = window.__network;

  const [startId, endId] = selectedNodes;
  const waypoints = findWaypoints(routes, startId, endId);
  if (!waypoints || waypoints.length <= 1) {
    console.warn("⚠️ Không tìm thấy đường đi giữa", startId, endId);
    return;
  }

  const reverseWaypoints = waypoints.slice().reverse();

  // Tạo drone A
  const droneA = createDrone(
    viewer,
    DRONE_MODEL_1,
    Cesium.Color.RED,
    nodeMap[startId],
    nodeMap,
    0
  );

  const startScenarioTime = Date.now();

  // Bay droneA
  animateDroneAlongPath(viewer, droneA, waypoints, Cesium.Color.RED, 0, 0);

  // tạo collision warning entity (ẩn theo mặc định)
  const collisionWarning = createCollisionWarning(viewer);

  // tick handler: check positions, show/hide warning, update timer
  const removeTickListener = viewer.clock.onTick.addEventListener(() => {
    try {
      const elapsedSec = Math.floor((Date.now() - startScenarioTime) / 1000);
      const positionDroneA = getDronePosition(viewer, droneA);
      // droneB chưa sinh => undefined
      const positionDroneB = getDronePosition(viewer, /* may be undefined */ (window as any).__tmpDroneB);

      // nếu có cả 2 drone -> check khoảng cách
      if (positionDroneA && positionDroneB) {
        const d = distance(positionDroneA, positionDroneB);
        // chỉ báo động sau 20s như logic gốc
        if (d < COLLISION_DISTANCE_THRESHOLD && elapsedSec > 20) {
          const midPos = interpolate(positionDroneA, positionDroneB, 0.5);
          showCollisionWarning(viewer, collisionWarning, midPos);
        } else {
          hideCollisionWarning(viewer);
        }
      } else {
        // nếu một trong hai không có vị trí, ẩn cảnh báo
        hideCollisionWarning(viewer);
      }

      // update timer display
      timerDisplay.textContent = positionDroneA || positionDroneB ? `Thời gian: ${elapsedSec}s` : "Hoàn thành";

      // nếu cả hai drone đều không có vị trí (kết thúc), dừng tick listener
      if (!positionDroneA && !positionDroneB) {
        // dừng đồng hồ animation (nếu muốn)
        viewer.clock.shouldAnimate = false;
        // remove tick listener
        try {
          // addEventListener trả về remover function; remove nó nếu có
          if (typeof removeTickListener === "function") removeTickListener();
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error in scenario tick:", err);
    }
  });

  // đợi 5s rồi tạo droneB (giữ logic giống bản gốc)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // tạo drone B
  const droneB = createDrone(
    viewer,
    DRONE_MODEL_2,
    Cesium.Color.PURPLE,
    nodeMap[endId],
    nodeMap,
    0
  );

  // store reference so the tick handler can read it (local-scope; we avoid globals by attaching to window under temp key)
  (window as any).__tmpDroneB = droneB;

  animateDroneAlongPath(viewer, droneB, reverseWaypoints, Cesium.Color.PURPLE, 0, 10);
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
  return warningEntity
}

function showCollisionWarning(viewer: Cesium.Viewer, warningEntity: Cesium.Entity | undefined, midPos: Cesium.Cartesian3) {
  if (!warningEntity) return;

  warningEntity.position = new Cesium.ConstantPositionProperty(getElevatedPosition(midPos, COLLISION_HEIGHT_OFFSET));
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

// Hàm tính khoảng cách giữa 2 point Cartesian
function distance(c1: Cesium.Cartesian3, c2: Cesium.Cartesian3) {
  return Cesium.Cartesian3.distance(c1, c2);
}

function findWaypoints(routes: any[], a: string, b: string) {
  const route = routes.find(
    (r) => (r.from === a && r.to === b) || (r.from === b && r.to === a)
  );
  if (!route) return [];
  return route.from === a ? route.waypoints : [...route.waypoints].reverse();
}
