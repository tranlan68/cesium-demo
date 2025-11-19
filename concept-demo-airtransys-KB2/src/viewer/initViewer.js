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

    //sceneMode: Cesium.SceneMode.SCENE2D, // bản đồ 2D

    imageryProvider: new Cesium.UrlTemplateImageryProvider({
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    }),
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });

  const layer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
          url: './assets/satellite/{z}/{x}/{y}.jpeg',
          minimumLevel: 0,
          maximumLevel: 22
      })
  );
  layer.alpha = 0.3;

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
  controller.enableRotate = true; // Cho phép xoay ngang
  //controller.enableTranslate = true;
  controller.enableTilt = true; // Cho phép nghiêng
  controller.enableZoom = true; // Cho phép zoom
  controller.enableLook = true; // Cho phép "nhìn quanh" bằng chuột phải
  controller.minimumZoomDistance = 1.0; // Không giới hạn zoom gần
  controller.maximumZoomDistance = 1e9; // Không giới hạn zoom xa
  controller.minimumPitch = Cesium.Math.toRadians(0); // Cho phép nhìn từ dưới lên
  controller.maximumPitch = Cesium.Math.toRadians(90); // Cho phép nhìn từ trên xuống

  // 🚫 Ẩn dòng chữ “Cesium ion” ở góc phải
  viewer._cesiumWidget._creditContainer.style.display = "none";

  // Bắt sự kiện click chuột trái
  //const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  // handler.setInputAction(function (click) {
  //     // Lấy vị trí click trong không gian 3D
  //     const cartesian = viewer.camera.pickEllipsoid(
  //         click.position,
  //         viewer.scene.globe.ellipsoid
  //     );

  //     if (cartesian) {
  //         // Chuyển sang toạ độ địa lý
  //         const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  //         const lon = Cesium.Math.toDegrees(cartographic.longitude);
  //         const lat = Cesium.Math.toDegrees(cartographic.latitude);

  //         console.log(`{
  //     "lat": ${lat.toFixed(6)},
  //     "lng": ${lon.toFixed(6)},
  //     "alt": 90
  //   }`);

  //         // (Tùy chọn) Thêm marker vào vị trí vừa click
  //         viewer.entities.add({
  //             position: Cesium.Cartesian3.fromDegrees(lon, lat),
  //             point: { pixelSize: 8, color: Cesium.Color.RED },
  //             label: {
  //                 text: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
  //                 font: "12px sans-serif",
  //                 pixelOffset: new Cesium.Cartesian2(10, -10)
  //             }
  //         });
  //     }
  // }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  viewer.scene.preRender.addEventListener(() => {
      try {
      const pos = viewer.camera.position;
      if (pos !== undefined) {
          const carto = Cesium.Cartographic.fromCartesian(pos);
          const lon = Cesium.Math.toDegrees(carto.longitude);
          const lat = Cesium.Math.toDegrees(carto.latitude);
          const height = carto.height;

          const heading = Cesium.Math.toDegrees(viewer.camera.heading);
          const pitch = Cesium.Math.toDegrees(viewer.camera.pitch);
          const roll = Cesium.Math.toDegrees(viewer.camera.roll);
          console.log(`lon: ${lon}, lat: ${lat}, height: ${height}, heading: ${heading}, pitch: ${pitch}, roll: ${roll}`);
      }

      } catch (error) {
          console.error("Error getting camera position: ", error);
      }

  });

  // const minHeight = 50; // độ cao tối thiểu (mét so với ellipsoid)

  // viewer.camera.changed.addEventListener(function () {
  //     const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(viewer.camera.position);
  //     const height = carto.height;

  //     if (height < minHeight) {
  //         // Đặt lại camera ở độ cao tối thiểu
  //         carto.height = minHeight;
  //         const newPos = Cesium.Ellipsoid.WGS84.cartographicToCartesian(carto);
  //         viewer.camera.position = newPos;
  //     }
  // });

  return viewer;
}
