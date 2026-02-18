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

function rgbDistance(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function toHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function detectZonesFromImage(imageData: ImageLikeData, field: Field, fallbackCropId: string): ZoneCandidate[] {
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

  const zones: ZoneCandidate[] = [];
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

    const fieldWidthCm = field.dimensions.width * 100;
    const fieldHeightCm = field.dimensions.height * 100;
    const zoneWidth = Math.max(10, ((maxX - minX + 1) / width) * fieldWidthCm);
    const zoneHeight = Math.max(10, ((maxY - minY + 1) / height) * fieldHeightCm);

    zones.push({
      id: `zone-${colorIndex}`,
      color: toHex(bucket.rgb[0], bucket.rgb[1], bucket.rgb[2]),
      x: (minX / width) * fieldWidthCm,
      y: (minY / height) * fieldHeightCm,
      width: zoneWidth,
      height: zoneHeight,
      cropId: fallbackCropId,
    });
  });

  return zones;
}
