import type { PlannerGridSizeMeters } from "@/lib/utils/planner-grid-settings";

export interface PlannerGridLine {
  orientation: "vertical" | "horizontal";
  position: number;
  meter: number;
  major: boolean;
  label: string | null;
}

function roundMeter(value: number) {
  return Math.round(value * 1000) / 1000;
}

function buildAxisMeters(limit: number, step: PlannerGridSizeMeters): number[] {
  if (limit <= 0) return [0];
  const count = Math.floor(limit / step);
  const meters: number[] = [];

  for (let i = 0; i <= count; i += 1) {
    meters.push(roundMeter(i * step));
  }

  const last = meters[meters.length - 1] ?? 0;
  if (Math.abs(last - limit) > 0.0001) {
    meters.push(roundMeter(limit));
  }

  return meters;
}

function isMajorMeter(meter: number) {
  return Math.abs(meter - Math.round(meter)) < 0.0001;
}

export function buildPlannerGridLines(
  widthMeters: number,
  heightMeters: number,
  pixelsPerMeter: number,
  gridSizeMeters: PlannerGridSizeMeters
): PlannerGridLine[] {
  if (widthMeters < 0 || heightMeters < 0 || pixelsPerMeter <= 0) return [];

  const verticalMeters = buildAxisMeters(widthMeters, gridSizeMeters);
  const horizontalMeters = buildAxisMeters(heightMeters, gridSizeMeters);

  const verticalLines = verticalMeters.map((meter) => {
    const major = isMajorMeter(meter);
    return {
      orientation: "vertical" as const,
      meter,
      position: meter * pixelsPerMeter,
      major,
      label: major ? `${Math.round(meter)}m` : null,
    };
  });

  const horizontalLines = horizontalMeters.map((meter) => {
    const major = isMajorMeter(meter);
    return {
      orientation: "horizontal" as const,
      meter,
      position: meter * pixelsPerMeter,
      major,
      label: major ? `${Math.round(meter)}m` : null,
    };
  });

  return [...verticalLines, ...horizontalLines];
}

export function snapToGrid(value: number, step: number, min = 0): number {
  if (!Number.isFinite(value)) return min;
  if (!Number.isFinite(step) || step <= 0) return Math.max(min, value);
  return Math.max(min, Math.round(value / step) * step);
}
