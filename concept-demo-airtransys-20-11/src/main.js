import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initViewer } from "./viewer/initViewer.js";
import { loadOsmData } from "./viewer/osmLoader.js";
import { drawNetwork } from "./viewer/network/drawNetwork.js";
import { updateTracks } from "./viewer/track/trackManager.js";
import {
  enableNodeSelection,
  startScenario,
} from "./viewer/network/nodeSelect.js";
import { connectWS } from "./airtransys/socketServer.js";
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
drawNetwork(viewer, "./assets/maps/flight_paths_detailed_20_11.json", 11).then(
  () => {
    //enableNodeSelection(viewer);
    console.log("Network loaded ✅ Click 2 nodes to draw shortest path.");
  }
);

updateTracks(viewer);
setInterval(() => updateTracks(viewer), 1000);

// Canh bao
const popups = new Map(); // id -> popup DOM
const timers = new Map(); // id -> timeoutHandle
const scaleState = new Map();
//test();

const wsTacticalConflict = connectWS(
  "wss://airtransys.site:9443/at-drone/ws/tactical-conflict",
  (msg) => {
    const data = JSON.parse(msg);
    console.log("tactical-conflict:", data);
    let mapData = data.data || undefined;

    if (mapData !== undefined && mapData.length > 0) {
      console.log("mapData:", mapData);
      for (let i = 0; i < mapData.length; i++) {
        let info = mapData[i];
        let id = `${info.track_a_id}-${info.track_b_id}`;
        let text = `Va chạm: Drone ${info.track_a_id} và Drone ${info.track_b_id}`;
        let position = Cesium.Cartesian3.fromDegrees(
          (info.track_a_position.longitude + info.track_b_position.longitude) /
            2,
          (info.track_a_position.latitude + info.track_b_position.latitude) / 2,
          (info.track_a_position.altitude + info.track_b_position.altitude) / 2
        );
        let popup = showOrUpdatePopup(id, position, text);
        //let blinkSpeed = 2.0;
        if (popup.position) {
          setInterval(() => {
            if (popup && popup.show === true) {
              // const seconds =
              //   Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime() /
              //   1000.0;
              //const alpha = (Math.sin(seconds * Math.PI * blinkSpeed) + 1) / 2; // dao động từ 0 → 1
              popup.label.fillColor = Cesium.Color.RED.withAlpha(
                //alpha * 0.9 + 0.1
                getNextScale(id)
              );
            }
          }, 500);
        }
        // reset timer của ID đó
        resetPopupTimer(id);
      }
    }
  }
);

const wsFlightContainment = connectWS(
  "wss://airtransys.site:9443/at-drone/ws/flight-containment",
  (msg) => {
    let data = JSON.parse(msg);

    let mapData = data.data || undefined;

    if (mapData !== undefined) {
      for (let [id, info] of Object.entries(mapData)) {
        let text = `Drone: ${id} \n`;
        if (info.horizontal_deviation < 0) {
          text += `- Lệch sang trái ${(-info.horizontal_deviation).toFixed(1)} m \n`;
        } else if (info.horizontal_deviation > 0) {
          text += `- Lệch sang phải ${info.horizontal_deviation.toFixed(1)} m \n`;
        }
        if (info.altitude_deviation < 0) {
          text += `- Bay thấp hơn ${(-info.altitude_deviation).toFixed(1)} m `;
        } else if (info.altitude_deviation > 0) {
          text += `- Bay cao hơn ${info.altitude_deviation.toFixed(1)} m `;
        }
        let position = Cesium.Cartesian3.fromDegrees(
          info.track.position.longitude,
          info.track.position.latitude,
          info.track.position.altitude + 6
        );
        let popup = showOrUpdatePopup(id, position, text);
        //let blinkSpeed = 2.0;
        if (popup.position) {
          setInterval(() => {
            if (popup && popup.show === true) {
              // const seconds =
              //   Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime() /
              //   1000.0;
              //const alpha = (Math.sin(seconds * Math.PI * blinkSpeed) + 1) / 2; // dao động từ 0 → 1
              popup.label.fillColor = Cesium.Color.RED.withAlpha(
                //alpha * 0.9 + 0.1
                getNextScale(id)
              );
            }
          }, 500);
        }
        // reset timer của ID đó
        resetPopupTimer(id);
      }
    }
  }
);
function test() {
  let data = {
    type: "tactical_conflict.detected",
    data: [
      {
        track_a_id: 1405,
        track_b_id: 1406,
        level: "danger",
        separation_meters: 29.52202722404396,
        track_a_position: {
          longitude: 105.534355,
          latitude: 21.000547,
          altitude: 30,
        },
        track_b_position: {
          longitude: 105.53414,
          latitude: 21.000378,
          altitude: 35,
        },
      },
    ],
  };
  let mapData = data.data || undefined;

  if (mapData !== undefined && mapData.length > 0) {
    for (let i = 0; i < mapData.length; i++) {
      let info = mapData[i];
      console.log("info:", info);
      let id = `${info.track_a_id}-${info.track_b_id}`;
      let text = `Va chạm: Drone ${info.track_a_id} và Drone ${info.track_b_id}`;
      let position = Cesium.Cartesian3.fromDegrees(
        (info.track_a_position.longitude + info.track_b_position.longitude) / 2,
        (info.track_a_position.latitude + info.track_b_position.latitude) / 2,
        (info.track_a_position.altitude + info.track_b_position.altitude) / 2
      );
      console.log("text:", text);
      console.log("position:", position);
      let popup = showOrUpdatePopup(id, position, text);
      //let blinkSpeed = 2.0;
      if (popup.position) {
        setInterval(() => {
          if (popup && popup.show === true) {
            // const seconds =
            //   Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime() /
            //   1000.0;
            //const alpha = (Math.sin(seconds * Math.PI * blinkSpeed) + 1) / 2; // dao động từ 0 → 1
            popup.label.fillColor = Cesium.Color.RED.withAlpha(
              //alpha * 0.9 + 0.1
              getNextScale(id)
            );
          }
        }, 500);
      }
      // reset timer của ID đó
      resetPopupTimer(id);
    }
  }
}

function showOrUpdatePopup(id, position, message) {
  let popup = popups.get(id);

  if (!popup) {
    popup = viewer.entities.add({
      position: position, // Cesium.Cartesian3
      label: {
        text: `⚠️  ${message}`,
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
    // update text & position
    popup.label.text = message;
    popup.position = position;
    popup.show = true;
  }
  return popup;
}
function getNextScale(id) {
  const current = scaleState.get(id) || 0.8;
  const next = current === 0.8 ? 1 : 0.8;
  scaleState.set(id, next);
  return next;
}
function resetPopupTimer(id) {
  // nếu đã có timer → xóa
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
  }
  // tạo timer mới 5s
  let timeout = setTimeout(() => {
    hidePopup(id);
  }, 15000);
  timers.set(id, timeout);
}
function hidePopup(id) {
  let popup = popups.get(id);
  if (!popup) return;

  viewer.entities.remove(popup);

  popups.delete(id);
  timers.delete(id);
}

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
      frontSize: "14px",
    },
    //backgroundColor: "#4caf50"
  });
  toast.showToast();
  toastContent.querySelector("#closeToast").addEventListener("click", () => {
    toast.hideToast();
  });
}
