export async function getTracks() {
    try {
        let res = await fetch('https://airtransys.site:9443/at-object-tracks');
        let tracks = await res.json();
        return tracks;
    } catch (err) {
        console.error("Lỗi khi gọi API:", err);
       // return null;
       let tracks = [];
       tracks.push({
        object_track_id: 1308,
        object_id: "RID_VT",
        polar_velocity: {
            heading: 1.234
        },
        position: {
            longitude: 21.0026944,
            latitude: 105.5376111,
            altitude: 100
        }
       });
       return tracks;
    }
}