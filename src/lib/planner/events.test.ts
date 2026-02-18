import { describe, expect, it } from "vitest";
import type { PlantedCrop } from "@/lib/types";
import { detectSpatialConflictsAt, replayPlannerEvents, type PlannerEvent } from "@/lib/planner/events";
import { defaultFieldContext } from "@/lib/utils/field-context";

function plantedCrop(overrides?: Partial<PlantedCrop>): PlantedCrop {
  return {
    id: "pc-1",
    cropId: "crop-1",
    fieldId: "field-1",
    plantedDate: "2026-03-01T00:00:00.000Z",
    status: "growing",
    position: { x: 10, y: 10 },
    size: { width: 30, height: 30 },
    ...overrides,
  };
}

describe("replayPlannerEvents", () => {
  it("can hide planned future crops when respectPlantedDate is enabled", () => {
    const events: PlannerEvent[] = [
      {
        id: "1",
        type: "field_created",
        occurredAt: "2026-02-10T00:00:00.000Z",
        fieldId: "field-1",
        payload: { id: "field-1", name: "A 區", dimensions: { width: 5, height: 4 } },
      },
      {
        id: "2",
        type: "crop_planted",
        occurredAt: "2026-02-11T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-1",
        payload: plantedCrop(),
      },
    ];

    const at = new Date("2026-02-15T23:59:59.999Z");

    const withoutRespect = replayPlannerEvents(events, { at, respectPlantedDate: false });
    const withRespect = replayPlannerEvents(events, { at, respectPlantedDate: true });

    expect(withoutRespect[0]?.plantedCrops).toHaveLength(1);
    expect(withRespect[0]?.plantedCrops).toHaveLength(0);
  });

  it("re-evaluates visibility when crop plantedDate is updated", () => {
    const events: PlannerEvent[] = [
      {
        id: "1",
        type: "field_created",
        occurredAt: "2026-02-10T00:00:00.000Z",
        fieldId: "field-1",
        payload: { id: "field-1", name: "A 區", dimensions: { width: 5, height: 4 } },
      },
      {
        id: "2",
        type: "crop_planted",
        occurredAt: "2026-02-11T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-1",
        payload: plantedCrop({ plantedDate: "2026-02-12T00:00:00.000Z" }),
      },
      {
        id: "3",
        type: "crop_updated",
        occurredAt: "2026-02-13T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-1",
        payload: { plantedDate: "2026-03-10T00:00:00.000Z" },
      },
    ];

    const at = new Date("2026-02-15T23:59:59.999Z");
    const result = replayPlannerEvents(events, { at, respectPlantedDate: true });

    expect(result[0]?.plantedCrops).toHaveLength(0);
  });

  it("marks crop harvested and removes overlap conflict after harvest date", () => {
    const events: PlannerEvent[] = [
      {
        id: "1",
        type: "field_created",
        occurredAt: "2026-02-10T00:00:00.000Z",
        fieldId: "field-1",
        payload: { id: "field-1", name: "A 區", dimensions: { width: 5, height: 4 } },
      },
      {
        id: "2",
        type: "crop_planted",
        occurredAt: "2026-02-11T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-1",
        payload: plantedCrop({
          id: "pc-1",
          plantedDate: "2026-02-11T00:00:00.000Z",
          position: { x: 0, y: 0 },
          size: { width: 50, height: 50 },
        }),
      },
      {
        id: "3",
        type: "crop_planted",
        occurredAt: "2026-02-12T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-2",
        payload: plantedCrop({
          id: "pc-2",
          plantedDate: "2026-02-12T00:00:00.000Z",
          position: { x: 20, y: 20 },
          size: { width: 50, height: 50 },
        }),
      },
      {
        id: "4",
        type: "crop_harvested",
        occurredAt: "2026-02-13T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-1",
        payload: { harvestedDate: "2026-02-13T00:00:00.000Z" },
      },
    ];

    const duringOverlap = detectSpatialConflictsAt(events, "2026-02-12T12:00:00.000Z");
    const afterHarvest = detectSpatialConflictsAt(events, "2026-02-14T00:00:00.000Z");
    const stateAfterHarvest = replayPlannerEvents(events, { at: "2026-02-14T00:00:00.000Z", respectPlantedDate: true });

    expect(duringOverlap.length).toBeGreaterThan(0);
    expect(afterHarvest).toHaveLength(0);
    expect(stateAfterHarvest[0]?.plantedCrops.find((crop) => crop.id === "pc-1")?.status).toBe("harvested");
  });

  it("fills default field context for legacy field events and merges partial context updates", () => {
    const events: PlannerEvent[] = [
      {
        id: "1",
        type: "field_created",
        occurredAt: "2026-02-10T00:00:00.000Z",
        fieldId: "field-1",
        payload: { id: "field-1", name: "A 區", dimensions: { width: 5, height: 4 } },
      },
      {
        id: "2",
        type: "field_updated",
        occurredAt: "2026-02-11T00:00:00.000Z",
        fieldId: "field-1",
        payload: { context: { sunHours: "lt4" } },
      },
    ];

    const result = replayPlannerEvents(events);
    expect(result[0]?.context).toEqual({
      ...defaultFieldContext,
      sunHours: "lt4",
    });
  });

  it("detects spatial conflict when polygon shape overlaps another region", () => {
    const events: PlannerEvent[] = [
      {
        id: "1",
        type: "field_created",
        occurredAt: "2026-02-10T00:00:00.000Z",
        fieldId: "field-1",
        payload: { id: "field-1", name: "A 區", dimensions: { width: 5, height: 4 } },
      },
      {
        id: "2",
        type: "crop_planted",
        occurredAt: "2026-02-11T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-1",
        payload: plantedCrop({
          id: "pc-1",
          plantedDate: "2026-02-11T00:00:00.000Z",
          position: { x: 0, y: 0 },
          size: { width: 60, height: 40 },
          shape: {
            kind: "polygon",
            points: [
              { x: 0, y: 0 },
              { x: 80, y: 0 },
              { x: 80, y: 80 },
              { x: 0, y: 80 },
            ],
          },
        }),
      },
      {
        id: "3",
        type: "crop_planted",
        occurredAt: "2026-02-11T00:00:00.000Z",
        fieldId: "field-1",
        cropId: "pc-2",
        payload: plantedCrop({
          id: "pc-2",
          plantedDate: "2026-02-11T00:00:00.000Z",
          position: { x: 40, y: 20 },
          size: { width: 40, height: 40 },
        }),
      },
    ];

    const conflicts = detectSpatialConflictsAt(events, "2026-02-12T00:00:00.000Z");
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
