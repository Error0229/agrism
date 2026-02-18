import { describe, expect, it } from "vitest";
import { SunlightLevel, type Field } from "@/lib/types";
import {
  defaultFieldContext,
  isSunlightCompatible,
  normalizeField,
  normalizeFieldContext,
  normalizeUtilityNetwork,
} from "@/lib/utils/field-context";

describe("field context normalization", () => {
  it("returns defaults when context is missing or invalid", () => {
    expect(normalizeFieldContext()).toEqual(defaultFieldContext);
    expect(normalizeFieldContext({ sunHours: "not-valid" as never })).toEqual(defaultFieldContext);
  });

  it("upgrades legacy field objects by injecting default context", () => {
    const legacy = {
      id: "field-1",
      name: "A 區",
      dimensions: { width: 5, height: 4 },
      plantedCrops: [],
    } as Omit<Field, "context">;

    expect(normalizeField(legacy)).toEqual({
      ...legacy,
      context: defaultFieldContext,
      utilityNodes: [],
      utilityEdges: [],
    });
  });

  it("drops orphan utility edges when normalizing legacy fields", () => {
    const legacy = {
      id: "field-2",
      name: "B 區",
      dimensions: { width: 6, height: 3 },
      plantedCrops: [],
      utilityNodes: [
        { id: "n1", label: "水節點 1", kind: "water", position: { x: 10, y: 10 } },
        { id: "n2", label: "電節點 1", kind: "electric", position: { x: 30, y: 20 } },
        { id: "n3", label: "水節點 2", kind: "water", position: { x: 50, y: 20 } },
      ],
      utilityEdges: [
        { id: "e1", fromNodeId: "n1", toNodeId: "n3", kind: "water" },
        { id: "e2", fromNodeId: "n1", toNodeId: "missing", kind: "water" },
      ],
    } as unknown as Omit<Field, "context">;

    const normalized = normalizeField(legacy);
    expect(normalized.utilityNodes).toEqual([
      { id: "n1", label: "水節點 1", kind: "water", nodeType: "junction", position: { x: 10, y: 10 } },
      { id: "n2", label: "電節點 1", kind: "electric", nodeType: "outlet", position: { x: 30, y: 20 } },
      { id: "n3", label: "水節點 2", kind: "water", nodeType: "junction", position: { x: 50, y: 20 } },
    ]);
    expect(normalized.utilityEdges).toEqual([{ id: "e1", fromNodeId: "n1", toNodeId: "n3", kind: "water" }]);
  });

  it("normalizes utility nodes/edges and filters invalid entries", () => {
    const normalized = normalizeUtilityNetwork({
      utilityNodes: [
        { id: "n1", label: "水節點", kind: "water", position: { x: "12", y: 30 } },
        { id: "n2", label: "電節點", kind: "electric", position: { x: 40, y: 30 } },
        { id: "", label: "無效", kind: "water", position: { x: 0, y: 0 } },
      ],
      utilityEdges: [
        { id: "e1", fromNodeId: "n1", toNodeId: "n2", kind: "water" },
        { id: "e2", fromNodeId: "n1", toNodeId: "n1", kind: "water" },
        { id: "e3", fromNodeId: "n1", toNodeId: "n2", kind: "electric" },
      ],
    });

    expect(normalized.utilityNodes).toEqual([
      { id: "n1", label: "水節點", kind: "water", nodeType: "junction", position: { x: 12, y: 30 } },
      { id: "n2", label: "電節點", kind: "electric", nodeType: "outlet", position: { x: 40, y: 30 } },
    ]);
    expect(normalized.utilityEdges).toEqual([]);
  });

  it("normalizes utility node type by kind and falls back for invalid combos", () => {
    const normalized = normalizeUtilityNetwork({
      utilityNodes: [
        { id: "w1", label: "水點", kind: "water", nodeType: "outlet", position: { x: 10, y: 10 } },
        { id: "e1", label: "電點", kind: "electric", nodeType: "pump", position: { x: 20, y: 20 } },
      ],
      utilityEdges: [],
    });

    expect(normalized.utilityNodes).toEqual([
      { id: "w1", label: "水點", kind: "water", nodeType: "junction", position: { x: 10, y: 10 } },
      { id: "e1", label: "電點", kind: "electric", nodeType: "outlet", position: { x: 20, y: 20 } },
    ]);
  });
});

describe("sunlight compatibility", () => {
  it("flags full-sun crops as incompatible in low-sun fields", () => {
    expect(isSunlightCompatible(SunlightLevel.全日照, "lt4")).toBe(false);
    expect(isSunlightCompatible(SunlightLevel.全日照, "h6_8")).toBe(true);
  });

  it("allows shade crops in all sun bands", () => {
    expect(isSunlightCompatible(SunlightLevel.耐陰, "lt4")).toBe(true);
    expect(isSunlightCompatible(SunlightLevel.耐陰, "gt8")).toBe(true);
  });
});
