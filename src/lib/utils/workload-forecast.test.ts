import { describe, expect, it } from "vitest";
import { TaskType, type Task } from "@/lib/types";
import { forecastWorkload } from "@/lib/utils/workload-forecast";

function task(input: Partial<Task> & Pick<Task, "id" | "type" | "cropId" | "title" | "dueDate">): Task {
  return {
    completed: false,
    ...input,
  };
}

describe("forecastWorkload", () => {
  it("emits bottleneck warnings when day load exceeds capacity", () => {
    const now = new Date("2026-02-18T00:00:00.000Z");
    const tasks: Task[] = [
      task({ id: "a", type: TaskType.防颱, cropId: "crop-1", title: "A", dueDate: "2026-02-18T00:00:00.000Z", effortMinutes: 120 }),
      task({ id: "b", type: TaskType.收成, cropId: "crop-1", title: "B", dueDate: "2026-02-18T00:00:00.000Z", effortMinutes: 90 }),
    ];

    const forecast = forecastWorkload(tasks, { now, dailyCapacityMinutes: 180, horizonDays: 7 });

    expect(forecast.warnings).toHaveLength(1);
    expect(forecast.warnings[0]?.overloadMinutes).toBe(30);
  });

  it("uses default effort presets when effortMinutes is not provided", () => {
    const now = new Date("2026-02-18T00:00:00.000Z");
    const tasks: Task[] = [
      task({ id: "watering", type: TaskType.澆水, cropId: "crop-1", title: "澆水", dueDate: "2026-02-18T00:00:00.000Z" }),
    ];

    const forecast = forecastWorkload(tasks, { now, dailyCapacityMinutes: 200, horizonDays: 1 });

    expect(forecast.totalMinutes).toBe(20);
    expect(forecast.days[0]?.taskCount).toBe(1);
  });

  it("buckets overdue tasks into today by default", () => {
    const now = new Date("2026-02-18T00:00:00.000Z");
    const tasks: Task[] = [
      task({ id: "overdue", type: TaskType.施肥, cropId: "crop-1", title: "overdue", dueDate: "2026-02-16T00:00:00.000Z", effortMinutes: 40 }),
    ];

    const forecast = forecastWorkload(tasks, { now, horizonDays: 1 });
    expect(forecast.days[0]?.totalMinutes).toBe(40);
  });
});
