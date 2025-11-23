import * as Cesium from "cesium";
import osmtogeojson from "osmtogeojson";
import {
  convertColor,
  getBuildingColor,
  getWaterColor,
  getParkColor,
  getHighwayColor,
} from "/src/utils/colors";

function createTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#faf8f8ff";
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "#a0d2f3ff";
  for (let y = 10; y < 256; y += 40) {
    for (let x = 10; x < 256; x += 40) {
      ctx.fillRect(x, y, 20, 20);
    }
  }

  return canvas.toDataURL();
}


export async function loadOsmData(
  viewer: Cesium.Viewer,
  url: string
): Promise<void> {
  const res = await fetch(url);
  const osmData = await res.json();
  const geojson = osmtogeojson(osmData);

  const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
    stroke: Cesium.Color.DIMGREY,
    fill: Cesium.Color.DIMGREY.withAlpha(0.4),
    clampToGround: true,
  });

  if (!viewer) return;
  viewer.dataSources.add(dataSource);

  const texture = createTexture();

  dataSource.entities.values.forEach((entity) => {
    const props = entity.properties;
    if (!props || !entity.polygon) return;

    const get = (name: string) =>
      props[name]?.getValue?.() ?? props[name]?._value ?? null;

    const building = get("building");
    const highway = get("highway");
    const natural = get("natural");
    const water = get("water");
    const leisure = get("leisure");

    // 🏠 Tòa nhà
    if (building && entity.polygon) {
      // chỉ xử lý Polygon có tag building
      if (!entity.polygon) return;
      if (!entity.properties || !entity.properties.building) return;

      // chiều cao mặc định nếu không có dữ liệu thật
      let height = 5;
      if (entity.properties.height) {
        height = parseFloat(entity.properties.height.getValue());
      } else if (entity.properties["building:levels"]) {
        height = parseInt(entity.properties["building:levels"].getValue()) * 3.2;
      }

      // Apply vật liệu + extrude
      entity.polygon.material = new Cesium.ImageMaterialProperty({
        image: texture,
        repeat: new Cesium.Cartesian2(4, 2)
      });

      entity.polygon.extrudedHeight = new Cesium.ConstantProperty(height);
      entity.polygon.height = new Cesium.ConstantProperty(0);
      entity.polygon.outline = new Cesium.ConstantProperty(true);
      entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.BLACK);

      const levels = parseInt(get("building:levels") || 0);
      // const buildingHeight = height || (levels ? levels * 3 : 5);
      // const color = getBuildingColor(
      //   building,
      //   convertColor(get("building:colour")),
      //   buildingHeight
      // );
      for (let i = 0; i < levels; i++) {
        viewer.entities.add({
          polygon: {
            hierarchy: entity.polygon.hierarchy,
            height: i * (levels ? 3 : 5),
            extrudedHeight: (i + 1) * (levels ? 3 : 5),
            material: Cesium.Color.fromCssColorString("#faf8f8ff"), // màu ngẫu nhiên mỗi tầng
            outline: true,
            outlineColor: Cesium.Color.BLACK
          }
        });
      }

      // Optional: thêm mái nhà
      viewer.entities.add({
        polygon: {
          hierarchy: entity.polygon.hierarchy,
          height: height,
          material: Cesium.Color.DARKGRAY
        }
      });

      // const height = parseFloat(get("height") || 0);
      // const levels = parseInt(get("building:levels") || 0);
      // const ele = parseFloat(get("ele") || 0);

      // const roofColor = convertColor(get("roof:colour"));
      // const wallColor = convertColor(get("building:colour")) || "#ffe680";
      // const roofShape = get("roof:shape") || "flat";

      // const buildingHeight = height || (levels ? levels * 3 : 5);
      // const roofHeight = roofShape === "flat" ? 0.5 : 1.5;
      // const color = getBuildingColor(
      //   building,
      //   convertColor(get("building:colour")),
      //   buildingHeight
      // );

      // entity.polygon.height = new Cesium.ConstantProperty(ele);
      // entity.polygon.extrudedHeight = new Cesium.ConstantProperty(ele + buildingHeight);
      // entity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(color).withAlpha(1.0));
      // entity.polygon.outline = new Cesium.ConstantProperty(true);
      // entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.BLACK);

      // for (let i = 0; i < levels; i++) {
      //   viewer.entities.add({
      //     polygon: {
      //       hierarchy: entity.polygon.hierarchy,
      //       height: i * (levels ? 3 : 5),
      //       extrudedHeight: (i + 1) * (levels ? 3 : 5),
      //       material: Cesium.Color.fromCssColorString(color), // màu ngẫu nhiên mỗi tầng
      //       outline: true,
      //       outlineColor: Cesium.Color.BLACK
      //     }
      //   });
      // }

      // // Mái
      // if (roofColor) {
      //   viewer.entities.add({
      //     polygon: {
      //       hierarchy: entity.polygon.hierarchy,
      //       height: ele + buildingHeight,
      //       extrudedHeight: ele + buildingHeight + roofHeight,
      //       material: Cesium.Color.fromCssColorString(roofColor),
      //       outline: false,
      //     },
      //   });
      // }

      // // Mái nghiêng (gabled/hipped)
      // if (roofShape === "gabled" || roofShape === "hipped") {
      //     if (entity.polygon && entity.polygon.hierarchy) {
      //         const hierarchy = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
      //         const positions = hierarchy.positions;
      //   const midIndex = Math.floor(positions.length / 2);

      //   const sideA = positions.slice(0, midIndex + 1);
      //   const sideB = positions.slice(midIndex);

      //   const center = Cesium.BoundingSphere.fromPoints(positions).center;
      //   const roofTop = Cesium.Cartesian3.add(
      //     center,
      //     new Cesium.Cartesian3(0, 0, roofHeight * 1.5),
      //     new Cesium.Cartesian3()
      //   );

      //   const roofAEntity = viewer.entities.add({
      //     polygon: {
      //       hierarchy: new Cesium.PolygonHierarchy([...sideA, roofTop] ),
      //       height: ele + buildingHeight,
      //     },
      //   });
      //   const roofBEntity = viewer.entities.add({
      //     polygon: {
      //       hierarchy: new Cesium.PolygonHierarchy([...sideB, roofTop]),
      //       height: ele + buildingHeight,
      //     },
      //   });
      //         if (roofColor) {
      //             if (roofAEntity.polygon) {
      //                 roofAEntity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(roofColor).withAlpha(0.95));
      //             }
      //             if (roofBEntity.polygon) {
      //                 roofBEntity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(roofColor).withAlpha(0.95));
      //             }
      //         }
      //     }
      // }
    }
    // Nước
    else if ((natural === "water" || water) && entity.polygon) {
      const color = getWaterColor();
      entity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(color).withAlpha(1.0));
      entity.polygon.height = new Cesium.ConstantProperty(0);
      entity.polygon.extrudedHeight = new Cesium.ConstantProperty(0);
      entity.polygon.outline = new Cesium.ConstantProperty(false);
    }
    // Công viên
    else if (leisure === "park" && entity.polygon) {
      const color = getParkColor();
      entity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(color).withAlpha(1.0));
      entity.polygon.height = new Cesium.ConstantProperty(0);
      entity.polygon.extrudedHeight = new Cesium.ConstantProperty(0);
      entity.polygon.outline = new Cesium.ConstantProperty(true);
      entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.DARKGREEN);
    }
    // Đường
    else if (highway && entity.polyline) {
      const color = getHighwayColor(highway);
      entity.polyline.material = new Cesium.ColorMaterialProperty(color);
      entity.polyline.width = new Cesium.ConstantProperty(2);
      entity.polyline.clampToGround = new Cesium.ConstantProperty(true);
    }
  });

  // Camera flyTo (ví dụ cuối cùng)
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(105.53522805597483, 20.999445490154468, 72.28687173979829),
    orientation: {
      heading: Cesium.Math.toRadians(23.947840431861916),
      pitch: Cesium.Math.toRadians(-8.105674812755876),
      roll: 0.000812453657480198,
    },
  });
}
