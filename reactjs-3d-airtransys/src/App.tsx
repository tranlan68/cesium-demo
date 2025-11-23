import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import Toastify from "toastify-js";
import { initViewer } from "./cesium/viewer";
import { loadOsmData } from "./cesium/osmLoader";    // file riêng
import { drawNetwork } from "./viewer/network/drawNetwork";
import { updateTracks } from "./viewer/track/trackManager";
import { connectWS } from "./airtransys/socketServer";
import Notification from "./Notification";
import { MAP_OSM_URL, FLIGHT_PATHS_URL, CESIUM_BASE_URL, CESIUM_ION_TOKEN, ROUTE_HEIGHT, ROUTE_WIDTH } from "./constants";
import {
  enableNodeSelection,
  startScenario,
} from "/src/viewer/network/nodeSelect";

function App() {
  const cesiumRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const timerRef = useRef<HTMLSpanElement>(null);

  // ===== State =====
  const popups: Map<string, Cesium.Entity> = new Map();
  const timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  const scaleState: Map<string, number> = new Map();

  useEffect(() => {
    if (viewerRef.current) return;
    if (!cesiumRef.current) return;
    (window as any).CESIUM_BASE_URL = CESIUM_BASE_URL;
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    let viewer = initViewer("cesiumContainer");
    viewerRef.current = viewer;

    let isMounted = true;
    // Chờ viewer DOM hoàn toàn ready trước khi load data
    (async () => {
      loadOsmData(viewer, MAP_OSM_URL);
      drawNetwork(viewer, FLIGHT_PATHS_URL, ROUTE_HEIGHT, ROUTE_WIDTH);

      // Update tracks
      const startUpdatingTracks = async () => {
        while (isMounted) {
          try {
            await updateTracks(viewer);  // chờ cập nhật xong
          } catch (err) {
            console.error("updateTracks error:", err);
          }
          await new Promise((r) => setTimeout(r, 1000)); // đợi 1s
        }
      };
      startUpdatingTracks();

      // Connect socket
      setInterval(() => {
        for (const [id, popup] of popups.entries()) {
          if (popup.show && popup.label) {
            popup.label.fillColor = new Cesium.ConstantProperty(Cesium.Color.RED.withAlpha(getNextScale(id)));
          }
        }
      }, 500);

      // Tactical Conflict WS
      connectWS(
        "wss://airtransys.site:9443/at-drone-2/ws/tactical-conflict",
        (msg) => {
          const data = JSON.parse(msg)
          let list = data.data || [];
          if (!Array.isArray(list)) return;

          for (const item of list) {
            const id = `${item.track_a_id}-${item.track_b_id}`;
            const text = `Va chạm: Drone ${item.track_a_id} và Drone ${item.track_b_id}`;

            const position = Cesium.Cartesian3.fromDegrees(
              (item.track_a_position.longitude + item.track_b_position.longitude) / 2,
              (item.track_a_position.latitude + item.track_b_position.latitude) / 2,
              (item.track_a_position.altitude + item.track_b_position.altitude) / 2
            );

            const popup = showOrUpdatePopup(viewer, id, position, text);
            resetPopupTimer(viewer, id);
          }
        }
      );

      // Flight Containment WS
      connectWS(
        "wss://airtransys.site:9443/at-drone-2/ws/flight-containment",
        (msg) => {
          const data = JSON.parse(msg)
          let mapData = data.data || {};
          if (!mapData) return;

          for (const [id, info] of Object.entries<any>(mapData)) {
            let text = `Drone: ${id}\n`;

            if (info.horizontal_deviation < 0) {
              text += `- Lệch trái ${(-info.horizontal_deviation).toFixed(1)} m\n`;
            } else if (info.horizontal_deviation > 0) {
              text += `- Lệch phải ${info.horizontal_deviation.toFixed(1)} m\n`;
            }

            if (info.altitude_deviation < 0) {
              text += `- Bay thấp hơn ${(-info.altitude_deviation).toFixed(1)} m\n`;
            } else if (info.altitude_deviation > 0) {
              text += `- Bay cao hơn ${info.altitude_deviation.toFixed(1)} m\n`;
            }

            const position = Cesium.Cartesian3.fromDegrees(
              info.track.position.longitude,
              info.track.position.latitude,
              info.track.position.altitude + 6
            );

            showOrUpdatePopup(viewer, id, position, text);
            resetPopupTimer(viewer, id);
          }
        }
      );


    })();
    return () => {
      isMounted = false;
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  function showOrUpdatePopup(
    viewer: Cesium.Viewer,
    id: string,
    position: Cesium.Cartesian3,
    message: string
  ): Cesium.Entity {
    let popup = popups.get(id);

    if (!popup) {
      popup = viewer.entities.add({
        position,
        label: {
          text: `⚠️ ${message}`,
          font: "14px sans-serif",
          fillColor: Cesium.Color.RED,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, -40),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        show: true,
      });

      popups.set(id, popup);
    } else {
      if (popup.label) {
        popup.position = new Cesium.ConstantPositionProperty(position);
        popup.label.text = new Cesium.ConstantProperty(`⚠️ ${message}`);
        popup.show = true;
      }
    }

    return popup;
  }

  function getNextScale(id: string): number {
    const current = scaleState.get(id) || 0.8;
    const next = current === 0.8 ? 1 : 0.8;
    scaleState.set(id, next);
    return next;
  }

  function resetPopupTimer(viewer: Cesium.Viewer, id: string) {
    if (timers.has(id)) clearTimeout(timers.get(id)!);

    const timeout = setTimeout(() => hidePopup(viewer, id), 15000);
    timers.set(id, timeout);
  }

  function hidePopup(viewer: Cesium.Viewer, id: string) {
    const popup = popups.get(id);
    if (!popup) return;

    viewer.entities.remove(popup);
    popups.delete(id);
    timers.delete(id);
    scaleState.delete(id);
  }

  // const handleStart = () => {
  //   if (!viewerRef.current) {
  //     console.error("Viewer chưa sẵn sàng!");
  //     return;
  //   }
  //   if (!timerRef.current) return;
  //   startScenario(viewerRef.current, timerRef.current);
  // };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>

      {/* Cesium container */}
      <div
        id="cesiumContainer"
        ref={cesiumRef}
        style={{ width: "100%", height: "100%", position: "absolute" }}
      />
      {/* <Notification containerId="cesiumContainer" /> */}

      {/* UI React đè lên Cesium */}
      {/* <div
        style={{
          position: "absolute",
          top: 10,
          left: 20,
          background: "rgba(255, 255, 255, 1)",
          borderRadius: 8,
          zIndex: 100,
          alignItems: "center",
          gap: 10,
          padding: "10px",
        }}
      >

        <button
          id="startButton"
          className="btn-start"
          onClick={handleStart}
          style={{
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Bắt đầu
        </button>
        <span ref={timerRef} id="timer" style={{ color: "rgb(6, 6, 179)", paddingLeft: "10px",}}>
          Thời gian: 0s
        </span>
      </div> */}

    </div>
  );
}

export default App;