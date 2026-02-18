import { describe, expect, it } from "vitest";
import { formatUtilityNodeDisplayLabel, normalizeUtilityNodeType } from "@/lib/utils/utility-node";

describe("utility node type normalization", () => {
  it("accepts valid type/kind pairs", () => {
    expect(normalizeUtilityNodeType("water", "pump")).toBe("pump");
    expect(normalizeUtilityNodeType("electric", "junction")).toBe("junction");
  });

  it("falls back when type is invalid for kind", () => {
    expect(normalizeUtilityNodeType("water", "outlet")).toBe("junction");
    expect(normalizeUtilityNodeType("electric", "tank")).toBe("outlet");
  });
});

describe("utility node display label", () => {
  it("prefixes label with node type", () => {
    expect(formatUtilityNodeDisplayLabel({ kind: "water", nodeType: "tank", label: "北側" })).toBe("蓄水池 - 北側");
  });

  it("avoids duplicate prefix when label already contains type", () => {
    expect(formatUtilityNodeDisplayLabel({ kind: "electric", nodeType: "outlet", label: "插座 A1" })).toBe("插座 A1");
  });
});
