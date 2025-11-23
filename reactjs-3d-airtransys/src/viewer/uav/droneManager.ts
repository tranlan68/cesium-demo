// src/utils/droneManager.ts
import * as Cesium from "cesium";
import { Track } from "/src/airtransys/tracks";

interface Node {
  id?: string;
  lat: number;
  lng: number;
  alt: number;
}

const drones: Map<string, Cesium.Entity> = new Map();
let droneCounter = 0;
let removeCameraFollow: (() => void) | null = null;

/** Tạo ID tự động cho drone */
function generateDroneId(): string {
  droneCounter++;
  return `drone-${Date.now()}-${droneCounter}`;
}

/** Tạo drone mới */
export function createDrone(
  viewer: Cesium.Viewer,
  droneId: string,
  uri: string,
  textColor: Cesium.Color,
  position: Cesium.Cartesian3,
): Cesium.Entity {
  //const droneId = generateDroneId();

  // Xoá drone cũ nếu trùng ID (thường không xảy ra)
  if (drones.has(droneId)) {
    viewer.entities.remove(drones.get(droneId)!);
    drones.delete(droneId);
  }

  let positionProperty = new Cesium.SampledPositionProperty();
  if (position) {
    positionProperty.addSample(Cesium.JulianDate.now(), position);
  }
  const entity = viewer.entities.add({
    id: droneId,
    name: `Drone ${droneId}`,
    position: positionProperty,
    model: {
      uri,
      minimumPixelSize: 60,
      maximumScale: 100,
      runAnimations: true,
      heightReference: Cesium.HeightReference.NONE,
    },
    orientation: new Cesium.VelocityOrientationProperty(positionProperty),
    label: {
      text: "Độ cao 0 m",
      font: "bold 16px sans-serif",
      fillColor: textColor,
      pixelOffset: new Cesium.Cartesian2(0, -15),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    properties: { type: "drone" },
  });

  // Cập nhật label độ cao liên tục
  entity.label!.text = new Cesium.CallbackProperty((time) => {
    const pos = positionProperty.getValue(time);
    if (!pos) return "";
    const carto = Cesium.Cartographic.fromCartesian(pos);
    return `Độ cao ${carto.height.toFixed(1)} m`;
  }, false);

  drones.set(droneId, entity);
  return entity;
}

/** Lấy drone theo ID */
export function getDrone(droneId: string): Cesium.Entity | undefined {
  return drones.get(droneId);
}

/** Xoá drone khỏi viewer */
export function removeDrone(viewer: Cesium.Viewer, droneId: string): void {
  const entity = drones.get(droneId);
  if (entity) {
    viewer.entities.remove(entity);
    drones.delete(droneId);
  }
}

/** Di chuyển drone theo đường đi */
export function animateDroneAlongPath(
  viewer: Cesium.Viewer,
  drone: Cesium.Entity,
  waypoints: { lat: number; lng: number; alt: number }[],
  color: Cesium.Color,
  offsetAlt: number,
  offsetAlt2: number
) {
  if (!drone || !waypoints || waypoints.length === 0) {
    console.warn("⚠️ animateDroneAlongPath: Drone hoặc path không hợp lệ");
    return;
  }

  const changeTime = 44;
  const property = new Cesium.SampledPositionProperty();
  const start = Cesium.JulianDate.now();
  let t = 0;

  // tạo offset ngẫu nhiên cho từng waypoint
  const offsetArray = waypoints.map(() => Math.round(Math.random() * 8) / 10 - 0.4);

  for (let i = 0; i < waypoints.length; i++) {
    let wp = waypoints[i];
    let altOffset = offsetAlt;
    if (i > changeTime) altOffset = offsetAlt2;
    if (i === changeTime + 1) altOffset = (offsetAlt + offsetAlt2) / 2;

    const position = Cesium.Cartesian3.fromDegrees(
      wp.lng,
      wp.lat,
      wp.alt + altOffset + offsetArray[i]
    );

    const time = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
    property.addSample(time, position);
    t += 1;
  }

  drone.position = property;
  //drone.orientation = new Cesium.VelocityOrientationProperty(property);
  drone.orientation = new Cesium.CallbackPositionProperty(function (
    time,
    result
  ) {
    try {
      let position = drone.position?.getValue(time);
      if (position) {
        let heading = 0;
        return Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(heading, 0, 0)
        );
      }
    } catch (e) {
      console.error("Error in orientation callback:", e);
    }
  }, false);

  viewer.clock.startTime = start.clone();
  viewer.clock.stopTime = Cesium.JulianDate.addSeconds(start, waypoints.length, new Cesium.JulianDate());
  viewer.clock.currentTime = start.clone();
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;

  // highlight đường đi drone
  let highlightEntity = viewer.entities.add({
    name: "Drone Path Highlight",
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
          try {
            let positions: Cesium.Cartesian3[] = [];
            let currentTime = Cesium.JulianDate.now();

            // khi hết đường, remove entity
            let end = Cesium.JulianDate.addSeconds(
              start,
              waypoints.length,
              new Cesium.JulianDate()
            );
            if (Cesium.JulianDate.greaterThanOrEquals(currentTime, end)) {
              viewer.entities.remove(highlightEntity);
              return [];
            }

            for (let i = 0; i < waypoints.length; i++) {
              let sampleTime = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
              if (Cesium.JulianDate.lessThanOrEquals(sampleTime, currentTime)) {
                let wp = waypoints[i];
                let altOffset = offsetAlt;
                if (i > changeTime) altOffset = offsetAlt2;
                if (i === changeTime + 1) altOffset = (offsetAlt + offsetAlt2) / 2;
                positions.push(
                  Cesium.Cartesian3.fromDegrees(
                    wp.lng,
                    wp.lat,
                    wp.alt + altOffset + offsetArray[i]
                  )
                );
              } else break;
            }

            return positions;
          } catch (e) {
            console.error(e);
          }
      }, false),
      material: color.withAlpha(0.9),
      width: 1,
      clampToGround: false,
    },
  });
}

/** Camera theo drone */
export function setCameraFollowDrone(viewer: Cesium.Viewer, drone: Cesium.Entity): void {
  stopCameraFollow(viewer);
  removeCameraFollow = viewer.scene.preRender.addEventListener(() => {
    const pos = drone.position?.getValue(viewer.clock.currentTime);
    if (!pos) return;

    const heading = 0;
    const pitch = Cesium.Math.toRadians(-15);
    const range = 30;

    viewer.camera.lookAt(
      pos,
      new Cesium.HeadingPitchRange(heading, pitch, range)
    );
  });
}

export function stopCameraFollow(viewer: Cesium.Viewer): void {
  if (removeCameraFollow) {
    removeCameraFollow();
    removeCameraFollow = null;
  }
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

/** Lấy tất cả drone */
export function getAllDrones(): Cesium.Entity[] {
  return Array.from(drones.values());
}

export function openDroneWindow(mainViewer: Cesium.Viewer, drone: any) {
  const win = window.open("./dronePopup.html", "_blank", "width=600,height=300");

  if (!win) return; // popup bị chặn

  // Hàm gửi vị trí drone
  function sendPosition() {
    if (!win) return;
    const pos = drone.position?.getValue(mainViewer.clock.currentTime);
    if (!pos) return;

    const carto = Cesium.Cartographic.fromCartesian(pos);

    win.postMessage(
      {
        lon: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude),
        alt: carto.height,
        heading: drone.heading || 0,
        pitch: -15,
      },
      "*"
    );
  }

  // Interval gửi liên tục
  const intervalId = setInterval(() => {
    if (win.closed) clearInterval(intervalId);
    else sendPosition();
  }, 200);

  // Gửi ngay lần đầu sớm hơn
  setTimeout(sendPosition, 200);

  // Lắng nghe message từ popup
  win.addEventListener("message", (e) => {
    try {
      if (e.data?.type === "closeDronePopup") {
        clearInterval(intervalId);
        win.close();
      }
    } catch (error) { }
  });
}
