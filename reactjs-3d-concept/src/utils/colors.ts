import * as Cesium from "cesium";

// Chuyển tên màu đơn giản sang mã HEX
export function convertColor(colorCode: string): string | undefined {
  if (colorCode === "red") return "#cc4444";
  if (colorCode === "yellow") return "#ffd966";
  return undefined;
}

// Màu tòa nhà dựa trên loại và chiều cao
export function getBuildingColor(
  building: string | undefined,
  buildingColour: string | undefined,
  height: number
): string {
  let color = "#999999"; // mặc định

  if (building === "yes" || building === "apartments") {
    if (height < 10) color = "#b3e6b3"; // thấp tầng
    else if (height < 25) color = "#ffd966"; // trung tầng
    else color = "#ff9999"; // cao tầng
  } else if (building === "university") color = "#ffc04d";
  else if (building === "dormitory") color = "#ffe680";
  else if (building === "canteen") color = "#ff9999";

  return buildingColour || color;
}

// Màu nước
export function getWaterColor(): string {
  return "#305377ff";
}

// Màu công viên
export function getParkColor(): string {
  return "#1a4e1aff";
}

// Màu đường, trả về Cesium.Color
export function getHighwayColor(highway: string | undefined): Cesium.Color {
  if (!highway) return Cesium.Color.GRAY;

  switch (highway) {
    case "motorway":
    case "trunk":
      return Cesium.Color.ORANGE;
    case "primary":
      return Cesium.Color.YELLOW;
    case "secondary":
      return Cesium.Color.LIGHTGOLDENRODYELLOW;
    case "tertiary":
      return Cesium.Color.LIGHTGRAY;
    case "residential":
    case "service":
      return Cesium.Color.DARKGRAY;
    case "footway":
    case "path":
      return Cesium.Color.LIGHTBLUE;
    default:
      return Cesium.Color.GRAY;
  }
}
