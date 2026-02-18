const timelineDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeTimelineSelectedDate(input: unknown): string {
  if (typeof input !== "string") return "";
  const value = input.trim();
  if (!value) return "";
  return timelineDatePattern.test(value) ? value : "";
}
