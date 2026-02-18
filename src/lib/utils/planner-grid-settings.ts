export const plannerGridSizeOptions = [0.5, 1, 2] as const;

export type PlannerGridSizeMeters = (typeof plannerGridSizeOptions)[number];

export interface PlannerGridSettings {
  showGrid: boolean;
  gridSizeMeters: PlannerGridSizeMeters;
  snapToGrid: boolean;
}

export const defaultPlannerGridSettings: PlannerGridSettings = {
  showGrid: true,
  gridSizeMeters: 1,
  snapToGrid: true,
};

function isGridSizeMeters(value: unknown): value is PlannerGridSizeMeters {
  return typeof value === "number" && plannerGridSizeOptions.includes(value as PlannerGridSizeMeters);
}

export function normalizePlannerGridSettings(input: unknown): PlannerGridSettings {
  if (!input || typeof input !== "object") return defaultPlannerGridSettings;
  const raw = input as Partial<PlannerGridSettings>;
  return {
    showGrid: typeof raw.showGrid === "boolean" ? raw.showGrid : defaultPlannerGridSettings.showGrid,
    gridSizeMeters: isGridSizeMeters(raw.gridSizeMeters) ? raw.gridSizeMeters : defaultPlannerGridSettings.gridSizeMeters,
    snapToGrid: typeof raw.snapToGrid === "boolean" ? raw.snapToGrid : defaultPlannerGridSettings.snapToGrid,
  };
}
