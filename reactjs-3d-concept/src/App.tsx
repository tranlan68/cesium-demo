import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import Toastify from "toastify-js";
import { initViewer } from "./cesium/viewer";
import { loadOsmData } from "./cesium/osmLoader";    // file riêng
import { drawNetwork } from "./viewer/network/drawNetwork";
import Notification from "./Notification";
import { MAP_OSM_URL, FLIGHT_PATHS_URL, CESIUM_BASE_URL, CESIUM_ION_TOKEN, ROUTE_HEIGHT, ROUTE_WIDTH} from "./constants";
import {
  enableNodeSelection,
  startScenario,
} from "/src/viewer/network/nodeSelect";

function App() {
  const cesiumRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const timerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!cesiumRef.current) return;
    (window as any).CESIUM_BASE_URL = CESIUM_BASE_URL;
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    let viewer = initViewer(cesiumRef.current.id);
    viewerRef.current = viewer;

    // Chờ viewer DOM hoàn toàn ready trước khi load data
  (async () => {
    loadOsmData(viewer, MAP_OSM_URL);
    drawNetwork(viewer, FLIGHT_PATHS_URL, ROUTE_HEIGHT, ROUTE_WIDTH);
  })();

    

    return () => viewer.destroy();
  }, []);

  const handleStart = () => {
    if (!viewerRef.current) {
      console.error("Viewer chưa sẵn sàng!");
      return;
    }
    if (!timerRef.current) return;
    startScenario(viewerRef.current, timerRef.current);
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>

      {/* Cesium container */}
      <div
        id="cesiumContainer"
        ref={cesiumRef}
        style={{ width: "100%", height: "100%", position: "absolute" }}
      />
      <Notification containerId="cesiumContainer" />

      {/* UI React đè lên Cesium */}
      <div
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
      </div>

    </div>
  );
}

export default App;