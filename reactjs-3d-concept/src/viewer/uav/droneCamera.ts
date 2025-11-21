import * as Cesium from "cesium";
import { loadOsmData } from "/src/cesium/osmLoader";

Cesium.Ion.defaultAccessToken = "";

// --- Khởi tạo Viewer ---
const viewer = new Cesium.Viewer("droneView", {
//   imageryProvider: new Cesium.UrlTemplateImageryProvider({
//     url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
//   }),
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

// ✅ Ẩn Cesium credit một cách safe
const cesiumWidget = (viewer as any)._cesiumWidget;
if (cesiumWidget && cesiumWidget._creditContainer) {
  cesiumWidget._creditContainer.style.display = "none";
}

// --- Load GeoJSON môi trường nếu cần ---
loadOsmData(viewer, "./assets/maps/zone.json").then(() => {
  console.log("✅ Zone loaded in popup.");
});

let initialized = false;

// --- Drone position update ---
window.addEventListener("message", (e) => {
  try {
    const { lon, lat, alt, heading, pitch } = e.data;

    if (lon == null || lat == null || alt == null) return;

    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

    if (!initialized) {
      // Fly đến lần đầu tiên
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt + 100),
        orientation: {
          heading: Cesium.Math.toRadians(heading || 0),
          pitch: Cesium.Math.toRadians(pitch || -15),
          roll: 0,
        },
        complete: () => {
          initialized = true;
        },
      });
      return;
    }

    // Các lần sau: camera follow drone liên tục
    followDrone(pos, heading || 0, pitch || -15);

  } catch (err) {
    console.error("Error processing drone message:", err);
  }
});

// --- Camera follow helper ---
let removePreRender: (() => void) | null = null;

function followDrone(position: Cesium.Cartesian3, headingDeg: number, pitchDeg: number) {
  if (removePreRender) {
    // remove listener cũ nếu có
    removePreRender();
    removePreRender = null;
  }

  removePreRender = viewer.scene.preRender.addEventListener(() => {
    try {
      const heading = Cesium.Math.toRadians(headingDeg);
      const pitch = Cesium.Math.toRadians(pitchDeg);
      const range = 50; // Khoảng cách camera so với drone

      viewer.camera.lookAt(position, new Cesium.HeadingPitchRange(heading, pitch, range));
    } catch (err) {
      console.error("Error updating camera:", err);
    }
  });
}

// --- Cleanup khi popup đóng ---
window.addEventListener("beforeunload", () => {
  if (removePreRender) {
    removePreRender();
    removePreRender = null;
  }
  viewer.destroy();
});
