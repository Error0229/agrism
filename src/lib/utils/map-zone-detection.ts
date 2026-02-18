import type { Field } from "@/lib/types";

export interface ZoneCandidate {
  id: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cropId: string;
}

export interface ImageLikeData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ZoneCalibration {
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
  distanceMeters: number;
}

interface ZoneBounds {
  id: string;
  color: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface DetectZoneOptions {
  calibration?: ZoneCalibration;
}

function rgbDistance(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function toHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function clampZoneToField(
  zone: Pick<ZoneCandidate, "x" | "y" | "width" | "height">,
  fieldWidthCm: number,
  fieldHeightCm: number
) {
  const x = Math.max(0, Math.min(zone.x, Math.max(0, fieldWidthCm - 10)));
  const y = Math.max(0, Math.min(zone.y, Math.max(0, fieldHeightCm - 10)));
  const maxWidth = Math.max(10, fieldWidthCm - x);
  const maxHeight = Math.max(10, fieldHeightCm - y);
  return {
    x,
    y,
    width: Math.max(10, Math.min(zone.width, maxWidth)),
    height: Math.max(10, Math.min(zone.height, maxHeight)),
  };
}

function detectColorBounds(imageData: ImageLikeData): ZoneBounds[] {
  const quantize = 40;
  const width = imageData.width;
  const height = imageData.height;
  const colorBuckets = new Map<string, { rgb: [number, number, number]; count: number }>();
  const source = imageData.data;
  const totalPixels = width * height;

  for (let i = 0; i < source.length; i += 4) {
    const r = source[i];
    const g = source[i + 1];
    const b = source[i + 2];
    const alpha = source[i + 3];
    if (alpha < 200) continue;
    const brightness = (r + g + b) / 3;
    if (brightness > 245) continue;
    const keyR = Math.round(r / quantize) * quantize;
    const keyG = Math.round(g / quantize) * quantize;
    const keyB = Math.round(b / quantize) * quantize;
    const key = `${keyR}-${keyG}-${keyB}`;
    const bucket = colorBuckets.get(key);
    if (bucket) {
      bucket.count += 1;
    } else {
      colorBuckets.set(key, { rgb: [keyR, keyG, keyB], count: 1 });
    }
  }

  const topColors = Array.from(colorBuckets.values())
    .filter((bucket) => bucket.count >= totalPixels * 0.01)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (topColors.length === 0) return [];

  const bounds: ZoneBounds[] = [];
  topColors.forEach((bucket, colorIndex) => {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hitCount = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const rgb: [number, number, number] = [source[idx], source[idx + 1], source[idx + 2]];
        const alpha = source[idx + 3];
        if (alpha < 200) continue;
        if (rgbDistance(rgb, bucket.rgb) > 28) continue;
        hitCount += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (hitCount < totalPixels * 0.01) return;

    bounds.push({
      id: `zone-${colorIndex}`,
      color: toHex(bucket.rgb[0], bucket.rgb[1], bucket.rgb[2]),
      minX,
      minY,
      maxX,
      maxY,
    });
  });

  return bounds;
}

function toCalibratedSizeCm(bounds: ZoneBounds, calibration: ZoneCalibration, anchor: { minX: number; minY: number }) {
  const dx = calibration.pointA.x - calibration.pointB.x;
  const dy = calibration.pointA.y - calibration.pointB.y;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);
  if (pixelDistance <= 0 || calibration.distanceMeters <= 0) return null;

  const pxPerCm = pixelDistance / (calibration.distanceMeters * 100);
  if (pxPerCm <= 0) return null;

  return {
    x: (bounds.minX - anchor.minX) / pxPerCm,
    y: (bounds.minY - anchor.minY) / pxPerCm,
    width: (bounds.maxX - bounds.minX + 1) / pxPerCm,
    height: (bounds.maxY - bounds.minY + 1) / pxPerCm,
  };
}

export function detectZonesFromImage(
  imageData: ImageLikeData,
  field: Field,
  fallbackCropId: string,
  options?: DetectZoneOptions
): ZoneCandidate[] {
  const bounds = detectColorBounds(imageData);
  if (bounds.length === 0) return [];

  const width = imageData.width;
  const height = imageData.height;
  const fieldWidthCm = field.dimensions.width * 100;
  const fieldHeightCm = field.dimensions.height * 100;
  const minBoundX = Math.min(...bounds.map((item) => item.minX));
  const minBoundY = Math.min(...bounds.map((item) => item.minY));
  const calibration = options?.calibration;

  return bounds.map((item) => {
    const calibrated = calibration
      ? toCalibratedSizeCm(item, calibration, { minX: minBoundX, minY: minBoundY })
      : null;
    const fallback = {
      x: (item.minX / width) * fieldWidthCm,
      y: (item.minY / height) * fieldHeightCm,
      width: ((item.maxX - item.minX + 1) / width) * fieldWidthCm,
      height: ((item.maxY - item.minY + 1) / height) * fieldHeightCm,
    };

    const mapped = calibrated ?? fallback;
    const clamped = clampZoneToField(
      {
        x: mapped.x,
        y: mapped.y,
        width: Math.max(10, mapped.width),
        height: Math.max(10, mapped.height),
      },
      fieldWidthCm,
      fieldHeightCm
    );

    return {
      id: item.id,
      color: item.color,
      cropId: fallbackCropId,
      x: clamped.x,
      y: clamped.y,
      width: clamped.width,
      height: clamped.height,
    };
  });
}
