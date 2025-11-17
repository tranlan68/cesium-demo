import * as Cesium from "cesium";
import osmtogeojson from "osmtogeojson";
import { convertColor, getBuildingColor, getWaterColor, getParkColor, getHighwayColor } from "/src/utils/colors.js";

export async function loadOsmData(viewer, url) {
  let res = await fetch(url);
  let osmData = await res.json();
  let geojson = osmtogeojson(osmData);

  let dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
    stroke: Cesium.Color.DIMGREY,
    fill: Cesium.Color.DIMGREY.withAlpha(0.4),
    clampToGround: true,
  });

  viewer.dataSources.add(dataSource);

  dataSource.entities.values.forEach((entity) => {
    let props = entity.properties;
    if (!props || !entity.polygon) return;

    let get = (name) => props[name]?.getValue?.() ?? props[name]?._value ?? null;
    let building = get("building");
    let highway = get("highway");
    let natural = get("natural");
    let water = get("water");
    let leisure = get("leisure");

    // 🏠 1️⃣ Nếu là tòa nhà
    if (building && entity.polygon) {
      let height = parseFloat(get("height") || 0);
      let levels = parseInt(get("building:levels") || 0);
      let ele = parseFloat(get("ele") || 0);

      let roofColor = convertColor(get("roof:colour"));
      let wallColor = convertColor(get("building:colour")) || "#ffe680";
      let roofShape = get("roof:shape") || "flat";

      // Ưu tiên height, nếu không có thì tính từ số tầng
      let buildingHeight = height || (levels ? levels * 3 : 8);
      let roofHeight = roofShape === "flat" ? 0.5 : 1.5; // mái cao hơn nếu gabled
      let color = getBuildingColor(building, convertColor(get("building:colour")), buildingHeight);

      entity.polygon.height = ele;
      entity.polygon.extrudedHeight = ele + buildingHeight;
      entity.polygon.material = Cesium.Color.fromCssColorString(color).withAlpha(1.0);
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.BLACK;

      // Mái nhà
      if (roofColor) {
        viewer.entities.add({
          polygon: {
            hierarchy: entity.polygon.hierarchy,
            height: ele + buildingHeight,
            extrudedHeight: ele + buildingHeight + roofHeight,
            material: Cesium.Color.fromCssColorString(roofColor),
            outline: false,
          },
        });
      }

      // Mái nghiêng (gabled) — tạo cảm giác nghiêng bằng hai phần mái chéo
      if (roofShape === "gabled" || roofShape === "hipped") {
        let hierarchy = entity.polygon.hierarchy.getValue();
        let positions = hierarchy.positions;
        let midIndex = Math.floor(positions.length / 2);

        let sideA = positions.slice(0, midIndex + 1);
        let sideB = positions.slice(midIndex);

        let center = Cesium.BoundingSphere.fromPoints(positions).center;
        let roofTop = Cesium.Cartesian3.add(center, new Cesium.Cartesian3(0, 0, roofHeight * 1.5), new Cesium.Cartesian3());

        // Hai mặt mái chéo đối xứng
        viewer.entities.add({
          polygon: {
            hierarchy: { positions: [...sideA, roofTop] },
            material: Cesium.Color.fromCssColorString(roofColor).withAlpha(0.95),
            height: ele + buildingHeight,
          },
        });
        viewer.entities.add({
          polygon: {
            hierarchy: { positions: [...sideB, roofTop] },
            material: Cesium.Color.fromCssColorString(roofColor).withAlpha(0.95),
            height: ele + buildingHeight,
          },
        });
      }
    }

    else if ((natural === "water" || water) && entity.polygon) {
      let color = getWaterColor();
      entity.polygon.material = Cesium.Color.fromCssColorString(color).withAlpha(1.0);
      entity.polygon.height = 0;
      entity.polygon.extrudedHeight = 0;
      entity.polygon.outline = false;
    }

    else if (leisure === "park" && entity.polygon) {
      let color = getParkColor();
      entity.polygon.material = Cesium.Color.fromCssColorString(color).withAlpha(1.0);
      entity.polygon.height = 0;
      entity.polygon.extrudedHeight = 0;
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.DARKGREEN;
    }

    else if (highway && entity.polyline) {
      let color = getHighwayColor();
      entity.polyline.material = new Cesium.ColorMaterialProperty(color);
      entity.polyline.width = 2;
      entity.polyline.clampToGround = true;
    }
  });

  // viewer.camera.flyTo({
  //   destination: Cesium.Cartesian3.fromDegrees(105.53019983618506, 20.99955570994703, 21.1140267260417),
  //   orientation: {
  //     heading: Cesium.Math.toRadians(75.21339269542429),
  //     pitch: Cesium.Math.toRadians(-2.925571983535),
  //     roll: 0.0
  //   }
  // });

  // viewer.camera.flyTo({
  //   destination: Cesium.Cartesian3.fromDegrees(105.53187650203674, 20.999818907243, 106.86450300131213),
  //   orientation: {
  //     heading: Cesium.Math.toRadians(73.86862714472504),
  //     pitch: Cesium.Math.toRadians(-14.625280380757209),
  //     roll: 0.0
  //   }
  // });

  // viewer.camera.flyTo({
  //   destination: Cesium.Cartesian3.fromDegrees(105.53144970995119, 20.999432599375684, 268.8832091417887),
  //   orientation: {
  //     heading: Cesium.Math.toRadians(67.89153225404225),
  //     pitch: Cesium.Math.toRadians(-23.859788354461987),
  //     roll: 0.003603240879509745
  //   }
  // });

  // 4_2
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      105.53245448630689,
      20.998917610466215,
      73.11205391801181
    ),
    orientation: {
      heading: Cesium.Math.toRadians(29.592641956031866),
      pitch: Cesium.Math.toRadians(-9.43119672161522),
      roll: 0.0007741533235562625,
    },
  });

  // const controller = viewer.scene.screenSpaceCameraController;
  // controller.enableRotate = false;
  // controller.enableTranslate = false;
  // controller.enableZoom = true;
  // controller.enableTilt = true;
  // controller.enableLook = false;

  // controller.minimumPitch = Cesium.Math.toRadians(-45);
  // controller.maximumPitch = Cesium.Math.toRadians(0);
  // controller.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
}