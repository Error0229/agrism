export const defaultCalibrationDistance = "5";

export function parseCalibrationDistanceMeters(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function normalizeCalibrationDistanceStored(input: unknown): string {
  const parsed = parseCalibrationDistanceMeters(typeof input === "string" ? input.trim() : input);
  if (parsed === null) return defaultCalibrationDistance;
  return String(parsed);
}
