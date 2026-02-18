import type { CropPoint, PlantedCrop } from "@/lib/types";

function pointInPolygon(point: CropPoint, polygon: CropPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function orientation(a: CropPoint, b: CropPoint, c: CropPoint) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < Number.EPSILON) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: CropPoint, b: CropPoint, c: CropPoint) {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(p1: CropPoint, q1: CropPoint, p2: CropPoint, q2: CropPoint) {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

export function getRectPoints(planted: Pick<PlantedCrop, "position" | "size">): CropPoint[] {
  const x = planted.position.x;
  const y = planted.position.y;
  const w = planted.size.width;
  const h = planted.size.height;
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

export function getCropPolygon(planted: PlantedCrop): CropPoint[] {
  if (planted.shape?.kind === "polygon" && planted.shape.points.length >= 3) {
    return planted.shape.points;
  }
  return getRectPoints(planted);
}

export function polygonBounds(points: CropPoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function polygonsOverlap(first: CropPoint[], second: CropPoint[]) {
  const firstBounds = polygonBounds(first);
  const secondBounds = polygonBounds(second);
  const boundsOverlap =
    firstBounds.minX <= secondBounds.maxX &&
    firstBounds.maxX >= secondBounds.minX &&
    firstBounds.minY <= secondBounds.maxY &&
    firstBounds.maxY >= secondBounds.minY;

  if (!boundsOverlap) return false;

  for (let i = 0; i < first.length; i += 1) {
    const a1 = first[i];
    const a2 = first[(i + 1) % first.length];
    for (let j = 0; j < second.length; j += 1) {
      const b1 = second[j];
      const b2 = second[(j + 1) % second.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  return pointInPolygon(first[0], second) || pointInPolygon(second[0], first);
}

export function toTrapezoidPoints(planted: Pick<PlantedCrop, "position" | "size">): CropPoint[] {
  const { x, y } = planted.position;
  const { width, height } = planted.size;
  const inset = Math.max(width * 0.15, 6);
  return [
    { x: x + inset, y },
    { x: x + width - inset, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function translatePoints(points: CropPoint[], dx: number, dy: number): CropPoint[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}
