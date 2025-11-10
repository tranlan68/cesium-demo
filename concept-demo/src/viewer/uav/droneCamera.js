import * as Cesium from "cesium";
import { loadOsmData } from "../osmLoader.js";

Cesium.Ion.defaultAccessToken = "";

const viewer = new Cesium.Viewer("droneView", {
  imageryProvider: new Cesium.UrlTemplateImageryProvider({
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  }),
  baseLayerPicker: false,
  timeline: false,
  animation: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  homeButton: false,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
});

viewer.scene.backgroundColor = Cesium.Color.GRAY;
viewer.scene.globe.baseColor = Cesium.Color.LIGHTGREY;

// 🚫 Ẩn dòng chữ “Cesium ion” ở góc phải
viewer._cesiumWidget._creditContainer.style.display = "none";

// --- Ngay sau khi viewer sẵn sàng ---
const initialLon = 105.9425;   // kinh độ khu vực
const initialLat = 20.984;   // vĩ độ khu vực
const initialAlt = 500;     // độ cao (mét)
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(initialLon, initialLat, initialAlt),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-25),
    roll: 0,
  },
});

let initialized = false;

// Load cùng zone.json với main viewer (nếu muốn hiển thị môi trường)
loadOsmData(viewer, "/assets/maps/zone.json").then(() => {
  console.log("✅ Zone loaded in popup.");
});

window.addEventListener("message", (e) => {
  console.log("📩 Received:", e.data);
  const { lon, lat, alt, heading, pitch } = e.data;
  if (lon === undefined) return;

  const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

  // 🚀 Lần đầu tiên: bay đến vị trí drone
  if (!initialized) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt + 100),
      orientation: {
        heading: Cesium.Math.toRadians(heading || 0),
        pitch: Cesium.Math.toRadians(pitch || 0),
        roll: 0
      },
    });
    initialized = true;
    return;
  }

  // Các lần sau thì chỉ cập nhật góc nhìn (follow drone)
  viewer.camera.lookAt(
    pos,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(heading || 0),
      Cesium.Math.toRadians(pitch || 0),
      100
    )
  );
});