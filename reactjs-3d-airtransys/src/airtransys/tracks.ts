export interface Track {
    object_track_id: string;
    object_id?: string;
    polar_velocity?: {
      heading: number;
    };
    position: {
      longitude: number;
      latitude: number;
      altitude: number;
    };
  }
  
  export async function getTracks(): Promise<Track[] | null> {
    try {
      const res = await fetch('https://airtransys.site:9443/at-drone/object_tracks');
      if (!res.ok) {
        console.error("API response not ok:", res.statusText);
        return null;
      }
      const tracks: Track[] = await res.json();
      return tracks;
    } catch (err) {
      console.error("Lỗi khi gọi API:", err);
      return null;
  
      // --- Dữ liệu test khi API lỗi ---
      // const tracks: Track[] = [
      //   {
      //     object_track_id: "1308",
      //     object_id: "RID_VT",
      //     polar_velocity: { heading: 1.234 },
      //     position: {
      //       longitude: 105.5376111,
      //       latitude: 21.0026944,
      //       altitude: Math.random() * 100,
      //     },
      //   },
      // ];
      // return tracks;
    }
  }
  