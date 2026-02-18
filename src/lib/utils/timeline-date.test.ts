import { describe, expect, it } from "vitest";
import { normalizeTimelineSelectedDate } from "@/lib/utils/timeline-date";

describe("normalizeTimelineSelectedDate", () => {
  it("keeps valid YYYY-MM-DD values", () => {
    expect(normalizeTimelineSelectedDate("2026-02-18")).toBe("2026-02-18");
  });

  it("returns empty string for invalid values", () => {
    expect(normalizeTimelineSelectedDate("")).toBe("");
    expect(normalizeTimelineSelectedDate("2026/02/18")).toBe("");
    expect(normalizeTimelineSelectedDate("invalid")).toBe("");
    expect(normalizeTimelineSelectedDate(123)).toBe("");
  });
});
