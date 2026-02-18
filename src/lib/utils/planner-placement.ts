export interface PlannerPlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlannerPlacementBounds {
  width: number;
  height: number;
}

export interface PlannerPlacementOptions {
  step?: number;
  padding?: number;
}

function clampSizeToBounds(size: { width: number; height: number }, bounds: PlannerPlacementBounds) {
  return {
    width: Math.max(1, Math.min(size.width, bounds.width)),
    height: Math.max(1, Math.min(size.height, bounds.height)),
  };
}

function overlaps(a: PlannerPlacementRect, b: PlannerPlacementRect, padding = 0) {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

export function findNextPlannerPlacement(
  bounds: PlannerPlacementBounds,
  size: { width: number; height: number },
  occupied: PlannerPlacementRect[],
  options?: PlannerPlacementOptions
) {
  const step = Math.max(5, options?.step ?? 20);
  const padding = Math.max(0, options?.padding ?? 6);
  const safeBounds = {
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
  };
  const targetSize = clampSizeToBounds(size, safeBounds);
  const maxX = Math.max(0, safeBounds.width - targetSize.width);
  const maxY = Math.max(0, safeBounds.height - targetSize.height);

  for (let y = 0; y <= maxY; y += step) {
    for (let x = 0; x <= maxX; x += step) {
      const candidate = { x, y, width: targetSize.width, height: targetSize.height };
      if (!occupied.some((rect) => overlaps(candidate, rect, padding))) {
        return { x, y };
      }
    }
  }

  // Fallback: stick to the closest valid corner inside bounds.
  return {
    x: maxX,
    y: maxY,
  };
}
