import * as Cesium from "cesium";
import { getTracks } from "/src/airtransys/tracks";
import {
  createDrone,
  removeDrone,
  getAllDrones,
  getDrone,
} from "/src/viewer/uav/droneManager";

export type Track = {
  object_track_id: string;
  position: {
    longitude: number;
    latitude: number;
    altitude: number;
  };
};

// Lưu lịch sử các điểm di chuyển của drone
const history: Record<string, Cesium.Cartesian3[]> = {};
// Lưu entity polyline history của drone
const dronePaths: Record<string, Cesium.Entity> = {};
// Debounce timer map
const updateTimers: Record<string, number> = {};

const HISTORY_LIMIT = 50; // Giới hạn số điểm lịch sử

export async function updateTracks(viewer: Cesium.Viewer) {
  const tracks = await getTracks();
  if (!tracks) return;

  // Remove drones no longer in track
  getAllDrones().forEach((oldDrone) => {
    const stillExists = tracks.some(
      (t) => t.object_track_id === oldDrone.id
    );
    if (!stillExists) {
      removeDrone(viewer, oldDrone.id);
      clearHistory(viewer, oldDrone.id);
    }
  });

  // Update or create drones
  tracks.forEach((track) => {
    if (
      !track ||
      !track.object_track_id ||
      track.position.longitude === undefined ||
      track.position.latitude === undefined ||
      track.position.altitude === undefined
    )
      return;

    const position = Cesium.Cartesian3.fromDegrees(
      track.position.longitude,
      track.position.latitude,
      track.position.altitude
    );

    let drone = getDrone(track.object_track_id);
    if (!drone) {
      // Create new drone
      createDrone(
        viewer,
        track.object_track_id,
        "./assets/models/drone2.glb",
        Cesium.Color.RED,
        position
      );
    } else {
      // Update existing drone
      let property = new Cesium.SampledPositionProperty();
      const time = Cesium.JulianDate.now();
      property.addSample(time, position);
      drone.position = property;
    }

    addHistoryPointDebounced(viewer, track.object_track_id, position);
  });
}

// Debounced history update to reduce polyline creation frequency
function addHistoryPointDebounced(
  viewer: Cesium.Viewer,
  id: string,
  pos: Cesium.Cartesian3
) {
  if (!history[id]) history[id] = [];
  history[id].push(pos);
  if (history[id].length > HISTORY_LIMIT) {
    history[id].shift(); // Remove oldest point
  }

  if (updateTimers[id]) clearTimeout(updateTimers[id]);

  updateTimers[id] = window.setTimeout(() => {
    updateHistoryPolyline(viewer, id);
    updateTimers[id] = 0;
  }, 50); // update polyline every 50ms
}

function updateHistoryPolyline(viewer: Cesium.Viewer, id: string) {
  const positions = history[id];
  if (!positions || positions.length < 2) return;

  // Remove old polyline if exists
  if (dronePaths[id]) {
    viewer.entities.remove(dronePaths[id]);
  }

  // Create new polyline for drone path
  dronePaths[id] = viewer.entities.add({
    id: `drone_${id}_history`,
    polyline: {
      positions: positions.slice(),
      width: 1.5,
      material: Cesium.Color.YELLOW,
      clampToGround: false,
    },
  }) as Cesium.Entity;
}

function clearHistory(viewer: Cesium.Viewer, id: string) {
  if (dronePaths[id]) {
    viewer.entities.remove(dronePaths[id]);
    delete dronePaths[id];
  }
  delete history[id];
  if (updateTimers[id]) {
    clearTimeout(updateTimers[id]);
    delete updateTimers[id];
  }
}
