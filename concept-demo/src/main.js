import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initViewer } from "./viewer/initViewer.js";
import { loadOsmData } from "./viewer/osmLoader.js";
import { drawNetwork } from "./viewer/network/drawNetwork.js";
import {
  enableNodeSelection,
  startScenario,
} from "./viewer/network/nodeSelect.js";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

window.CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";
Cesium.Ion.defaultAccessToken = undefined;

// --- 1️⃣ Khởi tạo viewer ---
const viewer = initViewer("cesiumContainer");
if (!viewer) {
  console.error("❌ Viewer not initialized!");
}

// --- 2️⃣ Load OSM (bản đồ nền khu vực) ---
loadOsmData(viewer, "./assets/maps/hoalac1.json").then(() => {
  console.log("✅ OSM loaded and rendered.");
});

// --- 3️⃣ Load và hiển thị network ---
drawNetwork(viewer, "./assets/maps/flight_paths_detailed_4_1.json", 11).then(
  () => {
    //enableNodeSelection(viewer);
    console.log("Network loaded ✅ Click 2 nodes to draw shortest path.");
  }
);

showNotification();

// Lấy button
const button = document.getElementById("startButton");
const timerDisplay = document.getElementById("timer");
// Gắn sự kiện click
button.addEventListener("click", () => {
  startScenario(viewer, timerDisplay);
});

function showNotification() {
  const toastContent = document.createElement("div");
  toastContent.innerHTML = `
    <div style="position: relative; display:flex; justify-content: space-between; align-items: top;">
      <div>
      Mô phỏng tình huống tăng độ cao để tránh va chạm giữa 2 drone tại Khu Công nghệ cao Hòa Lạc <br>
      Tọa độ các điểm: <br>
        - P1: 21.003083, 105.537444 <br>
        - P2: 21.001636, 105.538069 <br>
        - P3: 21.00075, 105.536027 <br>
        - P4: 21.001833, 105.535333 <br>
      Thông tin bay: <br>
        - Drone A: Cất cánh tại điểm P1, tăng dần độ cao lên 25m. Đi qua các điểm P2, P3, P4 và trở về P1 <br>
        - Drone B: Cất cánh sau Drone A 5s, tại điểm P1, tăng dần độ cao lên 25m. Đi qua các điểm P4, P3, P2 và trở về P1 <br>
      </div>
      <button id="closeToast" style="
        position: absolute;
        top: -6px;
        right: -6px;
        background: transparent;
        color: #e53935;
        border: none;
        font-weight: bold;
        font-size: 16px;
        cusor: pointer;
      ">X</button>
    </div>
  `;
  const toast = Toastify({
    node: toastContent,
    duration: -1,
    gravity: "bottom",
    position: "left",
    style: {
      background: "linear-gradient(to right, #00b09b, #96c93d)",
      frontSize: "14px",
    },
    //backgroundColor: "#4caf50"
  });
  toast.showToast();
  toastContent.querySelector("#closeToast").addEventListener("click", () => {
    toast.hideToast();
  });
}
