import type { PlantedCrop } from "@/lib/types";
import { getCropPolygon, polygonBounds } from "@/lib/utils/crop-shape";

export type SplitDirection = "horizontal" | "vertical";

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SPLIT_SIZE = 20;

export function getCropBoundingRect(crop: PlantedCrop): RegionRect {
  const bounds = polygonBounds(getCropPolygon(crop));
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.width,
    height: bounds.height,
  };
}

export function splitCropRegion(crop: PlantedCrop, direction: SplitDirection): [RegionRect, RegionRect] | null {
  const rect = getCropBoundingRect(crop);
  if (direction === "vertical") {
    if (rect.width < MIN_SPLIT_SIZE * 2) return null;
    const leftWidth = Math.round(rect.width / 2);
    const rightWidth = rect.width - leftWidth;
    return [
      { x: rect.x, y: rect.y, width: leftWidth, height: rect.height },
      { x: rect.x + leftWidth, y: rect.y, width: rightWidth, height: rect.height },
    ];
  }

  if (rect.height < MIN_SPLIT_SIZE * 2) return null;
  const topHeight = Math.round(rect.height / 2);
  const bottomHeight = rect.height - topHeight;
  return [
    { x: rect.x, y: rect.y, width: rect.width, height: topHeight },
    { x: rect.x, y: rect.y + topHeight, width: rect.width, height: bottomHeight },
  ];
}

export function mergeCropRegions(first: PlantedCrop, second: PlantedCrop): RegionRect {
  const a = getCropBoundingRect(first);
  const b = getCropBoundingRect(second);
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}
