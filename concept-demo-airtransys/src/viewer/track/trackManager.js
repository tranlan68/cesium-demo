import * as Cesium from "cesium";
import { getTracks } from "/src/airtransys/tracks.js"
import { createDrone, updateDrone, removeDrone , getAllDrones , isExist } from "/src/viewer/uav/droneManager.js"

export async function updateTracks(viewer) {
    let tracks = await getTracks();
    if (tracks) {
        console.log("TLLLLLLL tracks: ", tracks);
        if (!tracks.length) {
            // remove all tracks
            let oldTracks = getAllDrones();
            oldTracks.forEach(oldTrack => {
                removeDrone(viewer, oldTrack.id);
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
            const position = Cesium.Cartesian3.fromDegrees(track.position.longitude, track.position.latitude, track.position.altitude);
            if (!isExist(track.object_track_id)) {
                // Tạo mới nếu chưa có
                console.log("TLLLLLLL createDrone id: ", track.object_track_id);
                createDrone(viewer, track.object_track_id, './assets/models/drone1.glb', Cesium.Color.RED, position);
            } else {
                // Cập nhật vị trí nếu đã có
                console.log("TLLLLLLL updateDrone position: ", position);
                updateDrone(viewer, track.object_track_id, position);
            }
        }
    });
}