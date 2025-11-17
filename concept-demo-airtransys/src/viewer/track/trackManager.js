import * as Cesium from "cesium";
import { getTracks } from "/src/airtransys/tracks.js"
import { createDrone, updateDrone, removeDrone , getAllDrones , isExist , getDrone } from "/src/viewer/uav/droneManager.js"

let dronePaths = {};

export async function updateTracks(viewer) {
    let tracks = await getTracks();
    if (tracks) {
        if (!tracks.length) {
            // remove all tracks
            let oldTracks = getAllDrones();
            oldTracks.forEach(oldTrack => {
                removeDrone(viewer, oldTrack.id);
                viewer.entities.removeById(`drone_${oldTrack.id}_history`);
            });
        } else {
            // Remove oldTrack
            let oldTracks = getAllDrones();
            oldTracks.forEach(oldTrack => {
                let isRemoved = true;
                tracks.forEach(track => {
                    if (track.object_track_id === oldTrack.id) {
                        isRemoved = false;
                    }
                });
                if (isRemoved) {
                    removeDrone(viewer, oldTrack.id);
                    viewer.entities.removeById(`drone_${oldTrack.id}_history`);
                }
            });
            // Update tracks
            updateDronePositions(viewer, tracks);
        }
    }
}


function updateDronePositions(viewer, tracks) {
    tracks.forEach(track => {
        if (track && track.object_track_id && track.position.longitude && track.position.latitude && track.position.altitude != undefined) {
            let position = Cesium.Cartesian3.fromDegrees(track.position.longitude, track.position.latitude, track.position.altitude - 32);
            let drone = getDrone(track.object_track_id);
            //if (!isExist(track.object_track_id)) {
            if (!drone) {
                // Tạo mới nếu chưa có
                createDrone(viewer, track.object_track_id, './assets/models/drone2.glb', Cesium.Color.RED, position);
                dronePaths[track.object_track_id] = {
                    positions: [],
                    entity: viewer.entities.add({
                        id: `drone_${track.object_track_id}_history`,
                        name: `drone_${track.object_track_id}_history`,
                        polyline: {
                            positions: new Cesium.CallbackProperty(() => {
                                return dronePaths[track.object_track_id].positions;
                            }, false),
                            width: 1,
                            material: Cesium.Color.RED,
                            clampToGround: false
                        }
                    })
                };
                //dronePaths[track.object_track_id].positions.push(position);
            } else {
                // Cập nhật vị trí nếu đã có
                drone.position = position;
                //dronePaths[track.object_track_id].positions.push(position);
            }
        }
    });
}