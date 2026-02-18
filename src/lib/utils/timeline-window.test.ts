import { describe, expect, it } from "vitest";
import { pruneTimelineDays } from "@/lib/utils/timeline-window";

function makeDays(count: number) {
  return Array.from({ length: count }, (_, index) => `d${String(index).padStart(4, "0")}`);
}

describe("pruneTimelineDays", () => {
  it("keeps original array when under max limit", () => {
    const days = makeDays(100);
    const result = pruneTimelineDays(days, "d0050", {
      maxDays: 200,
      keepBeforeActive: 50,
      keepAfterActive: 50,
    });
    expect(result.days).toEqual(days);
    expect(result.trimmedLeft).toBe(0);
  });

  it("prunes to active-centered window when over limit", () => {
    const days = makeDays(4000);
    const result = pruneTimelineDays(days, "d2000", {
      maxDays: 1000,
      keepBeforeActive: 400,
      keepAfterActive: 400,
    });
    expect(result.days.length).toBeLessThanOrEqual(1000);
    expect(result.days).toContain("d2000");
    expect(result.trimmedLeft).toBeGreaterThan(0);
  });

  it("falls back to centered pruning when active date is missing", () => {
    const days = makeDays(3000);
    const result = pruneTimelineDays(days, "missing", {
      maxDays: 1200,
      keepBeforeActive: 500,
      keepAfterActive: 500,
    });
    expect(result.days.length).toBeLessThanOrEqual(1200);
    expect(result.trimmedLeft).toBeGreaterThan(0);
  });
});
