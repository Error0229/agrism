import { describe, expect, it } from "vitest";
import { TaskType, type Task } from "@/lib/types";
import { normalizeTaskEffort, parseToolList } from "@/lib/utils/task-effort";

describe("normalizeTaskEffort", () => {
  it("fills effort defaults for legacy tasks", () => {
    const task: Task = {
      id: "t1",
      type: TaskType.防颱,
      title: "防颱",
      cropId: "crop-1",
      dueDate: "2026-02-18T00:00:00.000Z",
      completed: false,
    };

    const normalized = normalizeTaskEffort(task);
    expect(normalized.effortMinutes).toBe(90);
    expect(normalized.difficulty).toBe("high");
    expect(normalized.requiredTools?.length).toBeGreaterThan(0);
  });
});

describe("parseToolList", () => {
  it("splits and trims comma-separated input", () => {
    expect(parseToolList(" 手鏟, 水管 ,, 剪刀 ")).toEqual(["手鏟", "水管", "剪刀"]);
  });
});
