import * as Cesium from "cesium";

// URL dữ liệu bản đồ, flight paths
export const MAP_OSM_URL = "./assets/maps/hoalac1.json";
export const FLIGHT_PATHS_URL = "./assets/maps/flight_paths_detailed_4_1.json";

// Cesium config
export const CESIUM_BASE_URL = "/node_modules/cesium/Build/Cesium/";
export const CESIUM_ION_TOKEN = ""; // nếu có token Ion

// Drone config
export const DRONE_MODEL_1 = "./assets/models/drone4.glb";
export const DRONE_MODEL_2 = "./assets/models/drone5.glb";

// Node drawing
export const ROUTE_HEIGHT = 11;  // bán kính or độ cao của route
export const ROUTE_WIDTH = 16.5;  // chiều rộng của rout
export const ROUTE_COLOR = Cesium.Color.CYAN.withAlpha(0.2);       // nâng label cảnh báo

// Collision warning
export const COLLISION_DISTANCE_THRESHOLD = 50; // khoảng cách cảnh báo va chạm
export const COLLISION_HEIGHT_OFFSET = 5;       // nâng label cảnh báo