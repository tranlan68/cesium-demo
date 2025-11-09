import * as Cesium from "cesium";

export function initViewer(containerId) {
    const viewer = new Cesium.Viewer(containerId, {
        // //imageryProvider: new Cesium.UrlTemplateImageryProvider({
        // //  url: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
        // //}),
        // // imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        // //   url: "https://tile.openstreetmap.org/",
        // // }),
        // baseLayerPicker: false,
        // geocoder: false,
        // homeButton: false,
        // timeline: false,
        // animation: false,
        // sceneModePicker: true,
        // imageryProvider: false,
        // skyBox: false,
        // skyAtmosphere: false,
        // shouldAnimate: true,
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

    // //viewer.scene.globe.enableLighting = true;
    viewer.scene.backgroundColor = Cesium.Color.GRAY;
    viewer.scene.globe.baseColor = Cesium.Color.LIGHTGREY;
    // //viewer.scene.skyBox = false;
    // //viewer.scene.skyAtmosphere.show = false;
    // //viewer.scene.globe.depthTestAgainstTerrain = true;
    // //viewer.terrainProvider = Cesium.createWorldTerrain();
    // //viewer.camera.flyHome(0);

    // Cho phép xoay, nghiêng, zoom tự do
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = true;         // Cho phép xoay ngang
    controller.enableTilt = true;           // Cho phép nghiêng
    controller.enableZoom = true;           // Cho phép zoom
    controller.enableLook = true;           // Cho phép "nhìn quanh" bằng chuột phải
    controller.minimumZoomDistance = 1.0;   // Không giới hạn zoom gần
    controller.maximumZoomDistance = 1e9;   // Không giới hạn zoom xa
    controller.minimumPitch = Cesium.Math.toRadians(-90); // Cho phép nhìn từ dưới lên
    controller.maximumPitch = Cesium.Math.toRadians(90);  // Cho phép nhìn từ trên xuống

    // 🚫 Ẩn dòng chữ “Cesium ion” ở góc phải
    viewer._cesiumWidget._creditContainer.style.display = "none";

    return viewer;
}