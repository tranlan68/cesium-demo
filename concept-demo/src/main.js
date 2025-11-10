import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initViewer } from "./viewer/initViewer.js";
import { loadOsmData } from "./viewer/osmLoader.js";
import { drawNetwork } from "./viewer/network/drawNetwork.js";
import { enableNodeSelection , startScenario} from "./viewer/network/nodeSelect.js";

window.CESIUM_BASE_URL = '/node_modules/cesium/Build/Cesium/';
Cesium.Ion.defaultAccessToken = undefined;

// --- 1️⃣ Khởi tạo viewer ---
const viewer = initViewer("cesiumContainer");
if (!viewer) {
  console.error("❌ Viewer not initialized!");
} 

// --- 2️⃣ Load OSM (bản đồ nền khu vực) ---
loadOsmData(viewer, "/assets/maps/hoalac1.json").then(() => {
  console.log("✅ OSM loaded and rendered.");
});

// --- 3️⃣ Load và hiển thị network ---
drawNetwork(viewer, "/assets/maps/flight_paths_detailed.json").then(() => {
  //enableNodeSelection(viewer);
  console.log("Network loaded ✅ Click 2 nodes to draw shortest path.");
});

// Lấy button
const button = document.getElementById("startButton");
// Gắn sự kiện click
button.addEventListener("click", () => {
  startScenario(viewer);
});

