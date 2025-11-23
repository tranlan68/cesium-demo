// src/cesium/viewer.ts
import * as Cesium from "cesium";

export function initViewer(containerId: string) {
  const viewer = new Cesium.Viewer(containerId, {
    //sceneMode: Cesium.SceneMode.SCENE2D, // bản đồ 2D
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });

    viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    })
  );

  // const layer = viewer.imageryLayers.addImageryProvider(
  //   new Cesium.UrlTemplateImageryProvider({
  //     url: "./assets/satellite/{z}/{x}/{y}.jpeg",
  //     minimumLevel: 0,
  //     maximumLevel: 22,
  //   })
  // );
  // layer.alpha = 0.3;

  viewer.scene.backgroundColor = Cesium.Color.GRAY;
  viewer.scene.globe.baseColor = Cesium.Color.LIGHTGREY;

  const controller = viewer.scene.screenSpaceCameraController;
  controller.enableRotate = true;
  controller.enableTilt = true;
  controller.enableZoom = true;
  controller.enableLook = true;
  controller.minimumZoomDistance = 1.0;
  controller.maximumZoomDistance = 1e9;
  //   controller.minimumPitch = Cesium.Math.toRadians(0);
  //   controller.maximumPitch = Cesium.Math.toRadians(90);

  // Tat light
  viewer.scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(1, 1, 1)
  });
  viewer.shadows = false;

  // Ẩn Cesium credit
  if (viewer && viewer.cesiumWidget && viewer.cesiumWidget.creditContainer) {
    (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none";
  }

  // // Bắt sự kiện click chuột trái
  // const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  //   handler.setInputAction(
  //     (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
  //       // Lấy vị trí click trong không gian 3D
  //       const cartesian = viewer.camera.pickEllipsoid(
  //         click.position,
  //         viewer.scene.globe.ellipsoid
  //       );

  //       if (cartesian) {
  //         // Chuyển sang toạ độ địa lý
  //         const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  //         const lon = Cesium.Math.toDegrees(cartographic.longitude);
  //         const lat = Cesium.Math.toDegrees(cartographic.latitude);

  //         console.log(`{
  //           "lat": ${lat.toFixed(6)},
  //           "lng": ${lon.toFixed(6)},
  //           "alt": 90
  //         }`);

  //         // Thêm marker vào vị trí vừa click
  //         viewer.entities.add({
  //           position: Cesium.Cartesian3.fromDegrees(lon, lat),
  //           point: { pixelSize: 8, color: Cesium.Color.RED },
  //           label: {
  //             text: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
  //             font: "12px sans-serif",
  //             pixelOffset: new Cesium.Cartesian2(10, -10),
  //           },
  //         });
  //       }
  //     },
  //     Cesium.ScreenSpaceEventType.LEFT_CLICK
  //   );

  // Debug camera
  viewer.scene.preRender.addEventListener(() => {
    try {
      const pos = viewer.camera.position;
      if (!pos) return;

      const carto = Cesium.Cartographic.fromCartesian(pos);
      const lon = Cesium.Math.toDegrees(carto.longitude);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const height = carto.height;

      const heading = Cesium.Math.toDegrees(viewer.camera.heading);
      const pitch = Cesium.Math.toDegrees(viewer.camera.pitch);
      const roll = Cesium.Math.toDegrees(viewer.camera.roll);

      // console.log(
      //   `lon: ${lon}, lat: ${lat}, height: ${height}, heading: ${heading}, pitch: ${pitch}, roll: ${roll}`
      // );
    } catch (e) {
      console.error(e);
    }
  });

  return viewer;
}
