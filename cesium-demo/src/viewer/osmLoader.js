import * as Cesium from "cesium";
import osmtogeojson from "osmtogeojson";
import { convertColor, getBuildingColor, getWaterColor, getParkColor, getHighwayColor } from "../utils/colors.js";

export async function loadOsmData(viewer, url) {
  const res = await fetch(url);
  const osmData = await res.json();
  const geojson = osmtogeojson(osmData);

  const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
    stroke: Cesium.Color.WHITE,
    fill: Cesium.Color.WHITE.withAlpha(0.4),
    clampToGround: true,
  });

  viewer.dataSources.add(dataSource);

  dataSource.entities.values.forEach((entity) => {
    const props = entity.properties;
    if (!props || !entity.polygon) return;

    const get = (name) => props[name]?.getValue?.() ?? props[name]?._value ?? null;
    const building = get("building");
    const highway = get("highway");
    const natural = get("natural");
    const water = get("water");
    const leisure = get("leisure");

    // 🏠 1️⃣ Nếu là tòa nhà
    if (building && entity.polygon) {
      const height = parseFloat(get("height") || 0);
      const levels = parseInt(get("building:levels") || 0);
      const ele = parseFloat(get("ele") || 0);

      const roofColor = convertColor(get("roof:colour"));
      const wallColor = convertColor(get("building:colour")) || "#ffe680";
      const roofShape = get("roof:shape") || "flat";

      // Ưu tiên height, nếu không có thì tính từ số tầng
      const buildingHeight = height || (levels ? levels * 3 : 8);
      const roofHeight = roofShape === "flat" ? 0.5 : 1.5; // mái cao hơn nếu gabled
      const color = getBuildingColor(building, convertColor(get("building:colour")), buildingHeight);

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
        const hierarchy = entity.polygon.hierarchy.getValue();
        const positions = hierarchy.positions;
        const midIndex = Math.floor(positions.length / 2);

        const sideA = positions.slice(0, midIndex + 1);
        const sideB = positions.slice(midIndex);

        const center = Cesium.BoundingSphere.fromPoints(positions).center;
        const roofTop = Cesium.Cartesian3.add(center, new Cesium.Cartesian3(0, 0, roofHeight * 1.5), new Cesium.Cartesian3());

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
      const color = getWaterColor();
      entity.polygon.material = Cesium.Color.fromCssColorString(color).withAlpha(1.0);
      entity.polygon.height = 0;
      entity.polygon.extrudedHeight = 0;
      entity.polygon.outline = false;
    }

    else if (leisure === "park" && entity.polygon) {
      const color = getParkColor();
      entity.polygon.material = Cesium.Color.fromCssColorString(color).withAlpha(1.0);
      entity.polygon.height = 0;
      entity.polygon.extrudedHeight = 0;
      entity.polygon.outline = true;
      entity.polygon.outlineColor = Cesium.Color.DARKGREEN;
    }

    else if (highway && entity.polyline) {
      const color = getHighwayColor();
      entity.polyline.material = new Cesium.ColorMaterialProperty(color);
      entity.polyline.width = 2;
      entity.polyline.clampToGround = true;
    }
  });

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(105.9425, 20.984, 500),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-30.0),
      roll: 0.0
    }
  });

  //viewer.flyTo(dataSource);
}