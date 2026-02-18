import { describe, expect, it } from "vitest";
import { resolveTimelineShortcut } from "@/lib/utils/timeline-shortcuts";

describe("resolveTimelineShortcut", () => {
  it("maps arrow keys to day deltas", () => {
    expect(resolveTimelineShortcut({ key: "ArrowLeft" })).toEqual({ type: "days", delta: -1 });
    expect(resolveTimelineShortcut({ key: "ArrowRight" })).toEqual({ type: "days", delta: 1 });
    expect(resolveTimelineShortcut({ key: "ArrowLeft", shiftKey: true })).toEqual({ type: "days", delta: -7 });
    expect(resolveTimelineShortcut({ key: "ArrowRight", shiftKey: true })).toEqual({ type: "days", delta: 7 });
  });

  it("maps page keys and home key", () => {
    expect(resolveTimelineShortcut({ key: "PageUp" })).toEqual({ type: "months", delta: -1 });
    expect(resolveTimelineShortcut({ key: "PageDown" })).toEqual({ type: "months", delta: 1 });
    expect(resolveTimelineShortcut({ key: "Home" })).toEqual({ type: "reset" });
  });

  it("returns null for unsupported keys", () => {
    expect(resolveTimelineShortcut({ key: "Enter" })).toBeNull();
  });
});
