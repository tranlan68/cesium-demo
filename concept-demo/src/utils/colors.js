import * as Cesium from "cesium";

export function convertColor(colorCode) {
  if (colorCode === "red") {
    return "#cc4444";
  } else if (colorCode === "yellow") {
    return "#ffd966";
  }
  return undefined;
}

export function getBuildingColor(building, buildingColour, height) {
        // Màu thân nhà theo loại
        let color = "#999999"; // mặc định
        if (building === "yes") {
          color = "#bbbbbb";
          if (height < 10) {
            // thấp tầng
            color = "#b3e6b3"; // xanh nhạt
          } else if (height < 25) {
            // trung tầng
            color = "#ffd966"; // vàng nhạt
          } else {
            // cao tầng
            color = "#ff9999"; // đỏ nhạt
          }
        }
        else if (building === "apartments") {
          color = "#bbbbbb";
          if (height < 10) {
            // thấp tầng
            color = "#b3e6b3"; // xanh nhạt
          } else if (height < 25) {
            // trung tầng
            color = "#ffd966"; // vàng nhạt
          } else {
            // cao tầng
            color = "#ff9999"; // đỏ nhạt
          }
        }
        else if (building === "university") color = "#ffc04d";
        else if (building === "dormitory") color = "#ffe680";
        else if (building === "canteen") color = "#ff9999";
        const colorCode = buildingColour || color;                // cao tầng

        return colorCode
  }

export function getWaterColor() {
    return "#305377ff";
}

export function getParkColor() {
    return "#1a4e1aff";
}

export function getHighwayColor(highway) {
    let color = Cesium.Color.GRAY;

    switch (highway) {
        case "motorway":
        case "trunk":
            color = Cesium.Color.ORANGE;
            width = 5;
            break;
        case "primary":
            color = Cesium.Color.YELLOW;
            width = 4;
            break;
        case "secondary":
            color = Cesium.Color.LIGHTGOLDENRODYELLOW;
            width = 3;
            break;
        case "tertiary":
            color = Cesium.Color.LIGHTGRAY;
            width = 3;
            break;
        case "residential":
        case "service":
            color = Cesium.Color.DARKGRAY;
            width = 2;
            break;
        case "footway":
        case "path":
            color = Cesium.Color.LIGHTBLUE;
            width = 1;
            break;
    }
            
    return color;
}