import { describe, expect, it } from "vitest";
import { CropCategory, SunlightLevel, TaskType, WaterLevel, type Crop, type Task } from "@/lib/types";
import { prioritizeWeeklyTasks } from "@/lib/utils/task-prioritizer";

const baseCrop: Crop = {
  id: "crop-1",
  name: "番茄",
  emoji: "🍅",
  color: "#f00",
  schemaVersion: 2,
  category: CropCategory.茄果類,
  plantingMonths: [1, 2, 3],
  harvestMonths: [4, 5, 6],
  growthDays: 90,
  spacing: { row: 60, plant: 40 },
  water: WaterLevel.適量,
  sunlight: SunlightLevel.全日照,
  temperatureRange: { min: 18, max: 30 },
  soilPhRange: { min: 6, max: 7 },
  pestSusceptibility: "高",
  yieldEstimateKgPerSqm: 3,
  stageProfiles: {},
  fertilizerIntervalDays: 14,
  needsPruning: false,
  pestControl: [],
  typhoonResistance: "低",
  hualienNotes: "",
};

function task(id: string, type: TaskType, dueDate: string): Task {
  return {
    id,
    type,
    title: id,
    cropId: "crop-1",
    dueDate,
    completed: false,
  };
}

describe("prioritizeWeeklyTasks", () => {
  it("prioritizes urgent and high impact tasks first", () => {
    const now = new Date("2026-02-17T00:00:00.000Z");
    const tasks: Task[] = [
      task("watering", TaskType.澆水, "2026-02-19T00:00:00.000Z"),
      task("harvest", TaskType.收成, "2026-02-17T00:00:00.000Z"),
      task("pest", TaskType.病蟲害防治, "2026-02-18T00:00:00.000Z"),
    ];

    const ranked = prioritizeWeeklyTasks(tasks, [baseCrop], now);

    expect(ranked[0].task.id).toBe("harvest");
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
  });

  it("returns deterministic order for same score by due date then id", () => {
    const now = new Date("2026-02-17T00:00:00.000Z");
    const tasks: Task[] = [
      task("b-task", TaskType.施肥, "2026-02-20T00:00:00.000Z"),
      task("a-task", TaskType.施肥, "2026-02-20T00:00:00.000Z"),
    ];

    const ranked = prioritizeWeeklyTasks(tasks, [baseCrop], now);

    expect(ranked.map((item) => item.task.id)).toEqual(["a-task", "b-task"]);
  });
});

