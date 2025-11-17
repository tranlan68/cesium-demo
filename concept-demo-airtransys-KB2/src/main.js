import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initViewer } from "./viewer/initViewer.js";
import { loadOsmData } from "./viewer/osmLoader.js";
import { drawNetwork } from "./viewer/network/drawNetwork.js";
import { updateTracks } from "./viewer/track/trackManager.js"
import { enableNodeSelection , startScenario} from "./viewer/network/nodeSelect.js";
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css'

window.CESIUM_BASE_URL = '/node_modules/cesium/Build/Cesium/';
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
drawNetwork(viewer, "./assets/maps/flight_paths_detailed_4_2.json", 11).then(() => {
  //enableNodeSelection(viewer);
  console.log("Network loaded ✅ Click 2 nodes to draw shortest path.");
});

updateTracks(viewer);
setInterval(() => updateTracks(viewer), 1000);

//showNotification();

// // Lấy button
// const button = document.getElementById("startButton");
// const timerDisplay = document.getElementById("timer");
// // Gắn sự kiện click
// button.addEventListener("click", () => {
//   startScenario(viewer, timerDisplay);
// });

function showNotification() {
  const toastContent = document.createElement("div");
  toastContent.innerHTML = `
    <div style="position: relative; display:flex; justify-content: space-between; align-items: top;">
      <div>
        Vị trí mô phỏng: Khu Công nghệ cao Hòa Lạc <br>
        Tọa độ các điểm cắt hạ cánh: <br>
          - VMC: Tọa độ [21.0016758, 105.5369555] <br>
          - Sau Trung tâm tài chính (TTTC): Tọa độ [21.0048467, 105.5278548] <br>
          - Trước tòa NIC: Tọa độ [21.0100584, 105.5304694] <br>
        Thông tin bay: <br>
          - Drone A: Bay từ VMC tới TTTC <br>
          - Drone B: Bay từ TTTC tới VMC <br>
          - Drone B xuất phát sau Drone A 5s <br>
          - Khoảng cách từ VMC tới TTTC: ~860m <br>
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
      frontSize: "14px"
    }
    //backgroundColor: "#4caf50"
  });
  toast.showToast();
  toastContent.querySelector("#closeToast").addEventListener("click", () => {
    toast.hideToast();
  });
}



