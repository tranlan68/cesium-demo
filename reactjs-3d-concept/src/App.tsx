import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { initViewer } from "./cesium/viewer";
import { loadOsmData } from "./cesium/osmLoader";    // file riêng
import { drawNetwork } from "./viewer/network/drawNetwork";
import {
  enableNodeSelection,
  startScenario,
} from "./viewer/network/nodeSelect";

function App() {
  const cesiumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cesiumRef.current) return;
    (window as any).CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";
    Cesium.Ion.defaultAccessToken = "";
    let viewer = initViewer(cesiumRef.current.id);

    loadOsmData(viewer, "./assets/maps/hoalac1.json");
    drawNetwork(viewer, "./assets/maps/flight_paths_detailed_4_1.json", 11)

    return () => viewer.destroy();
  }, []);

  const handleStart = () => {
    alert("Start clicked!");
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      
      {/* Cesium container */}
      <div
        id="cesiumContainer"
        ref={cesiumRef}
        style={{ width: "100%", height: "100%", position: "absolute" }}
      />

      {/* UI React đè lên Cesium */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 20,
          background: "rgba(255,255,255,0.8)",
          borderRadius: 8,
          zIndex: 100,
          alignItems: "center",
          gap: 10,
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
        <span id="timer" style={{ color: "rgb(6, 6, 179)"}}>
          Thời gian: 0s
        </span>
      </div>

    </div>
  );
}

export default App;