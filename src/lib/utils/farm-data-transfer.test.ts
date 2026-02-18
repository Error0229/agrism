import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/types";
import {
  applyFarmDataImport,
  exportFinanceCsv,
  exportHarvestCsv,
  exportTasksCsv,
  parseFarmDataPackage,
  type FarmDataSnapshot,
} from "@/lib/utils/farm-data-transfer";

function baseSnapshot(): FarmDataSnapshot {
  return {
    plannerEvents: [],
    tasks: [],
    customCrops: [],
    cropTemplates: [],
    harvestLogs: [],
    financeRecords: [],
    soilNotes: [],
    soilProfiles: [],
    soilAmendments: [],
    weatherLogs: [],
  };
}

describe("parseFarmDataPackage", () => {
  it("supports legacy fields payload by converting to plannerEvents", () => {
    const parsed = parseFarmDataPackage(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-02-01T00:00:00.000Z",
        data: {
          fields: [{ id: "field-1", name: "A 區", dimensions: { width: 5, height: 4 }, plantedCrops: [] }],
        },
      })
    );

    expect(parsed.snapshot.plannerEvents?.length).toBeGreaterThan(0);
    expect(parsed.warnings.some((item) => item.includes("legacy fields"))).toBe(true);
  });
});

describe("applyFarmDataImport", () => {
  it("merges by id in merge mode", () => {
    const current = baseSnapshot();
    current.tasks = [
      {
        id: "old",
        type: "澆水",
        title: "old",
        cropId: "crop-1",
        dueDate: "2026-02-20T00:00:00.000Z",
        completed: false,
      } as Task,
    ];

    const merged = applyFarmDataImport(
      current,
      {
        tasks: [
          {
            id: "new",
            type: "施肥",
            title: "new",
            cropId: "crop-1",
            dueDate: "2026-02-21T00:00:00.000Z",
            completed: false,
          } as Task,
        ],
      },
      "merge"
    );

    expect(merged.tasks.map((task) => task.id).sort()).toEqual(["new", "old"]);
  });

  it("replaces included sections in replace mode while preserving unspecified sections", () => {
    const current = baseSnapshot();
    current.tasks = [
      {
        id: "old",
        type: "澆水",
        title: "old",
        cropId: "crop-1",
        dueDate: "2026-02-20T00:00:00.000Z",
        completed: false,
      } as Task,
    ];
    current.weatherLogs = [{ id: "w1", date: "2026-02-20T00:00:00.000Z" }];

    const replaced = applyFarmDataImport(
      current,
      {
        tasks: [
          {
            id: "incoming",
            type: "施肥",
            title: "incoming",
            cropId: "crop-1",
            dueDate: "2026-02-21T00:00:00.000Z",
            completed: false,
          } as Task,
        ],
      },
      "replace"
    );

    expect(replaced.tasks.map((task) => task.id)).toEqual(["incoming"]);
    expect(replaced.weatherLogs).toHaveLength(1);
  });
});

describe("CSV exporters", () => {
  it("includes headers and serialized rows", () => {
    const tasksCsv = exportTasksCsv([
      {
        id: "t1",
        type: "澆水",
        title: "澆水任務",
        cropId: "crop-1",
        dueDate: "2026-02-20T00:00:00.000Z",
        completed: false,
      } as Task,
    ]);
    expect(tasksCsv.split("\n")[0]).toContain("id,type,title");

    const harvestCsv = exportHarvestCsv([
      { id: "h1", fieldId: "f1", cropId: "c1", date: "2026-02-20T00:00:00.000Z", quantity: 3.2, unit: "kg" },
    ]);
    expect(harvestCsv.split("\n")).toHaveLength(2);

    const financeCsv = exportFinanceCsv([
      { id: "r1", type: "expense", category: "seed", amount: 100, date: "2026-02-20T00:00:00.000Z", description: "seed" },
    ]);
    expect(financeCsv.split("\n")[1]).toContain("expense");
  });
});
