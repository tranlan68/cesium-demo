import * as Cesium from "cesium";
import { getTracks } from "/src/airtransys/tracks.js";
import {
  createDrone,
  updateDrone,
  removeDrone,
  getAllDrones,
  isExist,
  getDrone,
} from "/src/viewer/uav/droneManager.js";

let history = {};
let dronePaths = {};

export async function updateTracks(viewer) {
  let tracks = await getTracks();
  if (tracks) {
    if (!tracks.length) {
      // remove all tracks
      let oldTracks = getAllDrones();
      oldTracks.forEach((oldTrack) => {
        removeDrone(viewer, oldTrack.id);
        //viewer.entities.removeById(`drone_${oldTrack.id}_history`);
        clearHistory(viewer, oldTrack.id);
      });
    } else {
      // Remove oldTrack
      let oldTracks = getAllDrones();
      oldTracks.forEach((oldTrack) => {
        let isRemoved = true;
        tracks.forEach((track) => {
          if (track.object_track_id === oldTrack.id) {
            isRemoved = false;
          }
        });
        if (isRemoved) {
          removeDrone(viewer, oldTrack.id);
          //viewer.entities.removeById(`drone_${oldTrack.id}_history`);
          clearHistory(viewer, oldTrack.id);
        }
      });
      // Update tracks
      updateDronePositions(viewer, tracks);
    }
  }
}

function updateDronePositions(viewer, tracks) {
  tracks.forEach((track) => {
    if (
      track &&
      track.object_track_id &&
      track.position.longitude &&
      track.position.latitude &&
      track.position.altitude != undefined
    ) {
      let position = Cesium.Cartesian3.fromDegrees(
        track.position.longitude,
        track.position.latitude,
        track.position.altitude
      );
      let drone = getDrone(track.object_track_id);
      //if (!isExist(track.object_track_id)) {
      if (!drone) {
        // Tạo mới nếu chưa có
        createDrone(
          viewer,
          track.object_track_id,
          "./assets/models/drone2.glb",
          Cesium.Color.RED,
          position
        );
        addHistoryPoint(viewer, track.object_track_id, position);
        // dronePaths[track.object_track_id] = {
        //   //positions: [position],
        //   positions: [],
        //   entity: viewer.entities.add({
        //     id: `drone_${track.object_track_id}_history`,
        //     name: `drone_${track.object_track_id}_history`,
        //     polyline: {
        //       positions: new Cesium.CallbackProperty(() => {
        //         // let paths = dronePaths[track.object_track_id].positions.slice();
        //         // if (paths.length < 50) {
        //         //   return paths;
        //         // } else {
        //         //   // Giới hạn số điểm lịch sử hiển thị để tránh quá tải
        //         //   return paths.splice(paths.length - 50, paths.length);
        //         // }
        //         return dronePaths[track.object_track_id].positions.slice();
        //       }, false),
        //       width: 1,
        //       material: Cesium.Color.RED,
        //     },
        //   }),
        // };
        // dronePaths[track.object_track_id].positions.push(position);
      } else {
        // Cập nhật vị trí nếu đã có
        drone.position = position;
        // dronePaths[track.object_track_id].positions.push(position);
        // if (dronePaths[track.object_track_id].positions.length > 50) {
        //   dronePaths[track.object_track_id].positions.shift();
        // }
        addHistoryPoint(viewer, track.object_track_id, position);
      }
    }
  });
}
function addHistoryPoint(viewer, id, pos) {
  try {
    if (!history[id]) history[id] = [];
    history[id].push(pos);
  
    let positions = history[id];
    if (!positions || positions.length < 2) {
        return;
    }

    console.error("positions: ", positions);
    let p1 = positions[positions.length - 2];
    let p2 = positions[positions.length - 1];
    console.error("p1: ", p1);
    console.error("p2: ", p1);
    if (p1 && p2) {
    let pointEntity = viewer.entities.add({
        polyline: {
          positions: [p1, p2],
          width: 1,
          material: Cesium.Color.YELLOW
        }
    });

    // const pointEntity = viewer.entities.add({
    //   id: `history_${id}_${Date.now()}`,
    //   position: pos,
    //   point: {
    //     pixelSize: 2,
    //     color: Cesium.Color.YELLOW,
    //     outlineColor: Cesium.Color.BLACK,
    //     outlineWidth: 1,
    //   },
    // });

    if (!dronePaths[id]) dronePaths[id] = [];
    dronePaths[id].push(pointEntity);
    }
  } catch (err) {
  }
}

function clearHistory(viewer, id) {
  if (dronePaths[id]) {
    dronePaths[id].forEach((e) => viewer.entities.remove(e));
    dronePaths[id] = [];
  }
}
