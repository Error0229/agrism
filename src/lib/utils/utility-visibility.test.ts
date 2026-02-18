import { describe, expect, it } from "vitest";
import { filterVisibleUtilityEdges, filterVisibleUtilityNodes, isUtilityKindVisible } from "@/lib/utils/utility-visibility";

describe("utility visibility filters", () => {
  it("hides all utilities when global toggle is off", () => {
    expect(isUtilityKindVisible("water", { showUtilities: false, showWaterUtilities: true, showElectricUtilities: true })).toBe(false);
    expect(isUtilityKindVisible("electric", { showUtilities: false, showWaterUtilities: true, showElectricUtilities: true })).toBe(false);
  });

  it("shows only enabled utility kinds", () => {
    expect(isUtilityKindVisible("water", { showUtilities: true, showWaterUtilities: true, showElectricUtilities: false })).toBe(true);
    expect(isUtilityKindVisible("electric", { showUtilities: true, showWaterUtilities: true, showElectricUtilities: false })).toBe(false);
  });

  it("filters nodes and edges by utility visibility", () => {
    const nodes = [
      { id: "w1", label: "W1", kind: "water" as const, position: { x: 0, y: 0 } },
      { id: "e1", label: "E1", kind: "electric" as const, position: { x: 10, y: 0 } },
    ];
    const edges = [
      { id: "we", fromNodeId: "w1", toNodeId: "w1", kind: "water" as const },
      { id: "ee", fromNodeId: "e1", toNodeId: "e1", kind: "electric" as const },
    ];

    const visibility = { showUtilities: true, showWaterUtilities: false, showElectricUtilities: true };
    expect(filterVisibleUtilityNodes(nodes, visibility).map((item) => item.id)).toEqual(["e1"]);
    expect(filterVisibleUtilityEdges(edges, visibility).map((item) => item.id)).toEqual(["ee"]);
  });
});
