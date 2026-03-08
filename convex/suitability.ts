import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";
import type { Doc } from "./_generated/dataModel";

// === Types ===

type ConstraintStatus = "ok" | "warning" | "critical";
type SuitabilityScore = "recommended" | "marginal" | "risky";

type Constraint = {
  factor: string;
  status: ConstraintStatus;
  cropNeed: string;
  fieldValue: string;
  explanation: string;
};

type SuitabilityResult = {
  score: SuitabilityScore;
  constraints: Constraint[];
  overallNotes: string;
};

// === Label Maps ===

const sunlightLabels: Record<string, string> = {
  full_sun: "全日照",
  partial_shade: "半日照",
  shade: "遮蔭",
};

const sunHoursLabels: Record<string, string> = {
  lt4: "少於4小時",
  h4_6: "4-6小時",
  h6_8: "6-8小時",
  gt8: "超過8小時",
};

const windExposureLabels: Record<string, string> = {
  sheltered: "避風",
  moderate: "中度",
  exposed: "迎風",
};

const windSensitivityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const drainageLabels: Record<string, string> = {
  poor: "不良",
  moderate: "普通",
  good: "良好",
};

const waterloggingLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

// === Pure Suitability Logic ===

function checkSunlight(crop: Doc<"crops">, field: Doc<"fields">): Constraint | null {
  if (!crop.sunlight || !field.sunHours) return null;

  const cropNeed = sunlightLabels[crop.sunlight] ?? crop.sunlight;
  const fieldValue = sunHoursLabels[field.sunHours] ?? field.sunHours;
  let status: ConstraintStatus = "ok";
  let explanation = "日照條件符合需求";

  if (crop.sunlight === "full_sun") {
    if (field.sunHours === "h6_8" || field.sunHours === "gt8") {
      status = "ok";
    } else if (field.sunHours === "h4_6") {
      status = "warning";
      explanation = "日照時數偏低，可能影響生長";
    } else {
      status = "critical";
      explanation = "日照嚴重不足，不適合全日照作物";
    }
  } else if (crop.sunlight === "partial_shade") {
    if (field.sunHours === "h4_6" || field.sunHours === "h6_8") {
      status = "ok";
    } else if (field.sunHours === "gt8") {
      status = "warning";
      explanation = "曝曬過度，半日照作物可能需要遮蔭";
    } else {
      status = "warning";
      explanation = "日照偏少，可能影響半日照作物生長";
    }
  } else if (crop.sunlight === "shade") {
    if (field.sunHours === "lt4" || field.sunHours === "h4_6") {
      status = "ok";
    } else if (field.sunHours === "h6_8") {
      status = "warning";
      explanation = "日照偏多，遮蔭作物可能需要額外遮蔽";
    } else {
      status = "critical";
      explanation = "日照過強，不適合遮蔭作物";
    }
  }

  return { factor: "日照", status, cropNeed, fieldValue, explanation };
}

function checkWind(crop: Doc<"crops">, field: Doc<"fields">): Constraint | null {
  if (!crop.windSensitivity || !field.windExposure) return null;

  const cropNeed = windSensitivityLabels[crop.windSensitivity] ?? crop.windSensitivity;
  const fieldValue = windExposureLabels[field.windExposure] ?? field.windExposure;
  let status: ConstraintStatus = "ok";
  let explanation = "風力條件符合需求";

  if (crop.windSensitivity === "high") {
    if (field.windExposure === "exposed") {
      status = "critical";
      explanation = "田區迎風且作物風敏感度高，容易受風害";
    } else if (field.windExposure === "moderate") {
      status = "warning";
      explanation = "作物風敏感度高，中度風力仍可能造成損害";
    }
  } else if (crop.windSensitivity === "medium") {
    if (field.windExposure === "exposed") {
      status = "warning";
      explanation = "田區迎風，中等風敏感度作物需注意防風";
    }
  }

  return { factor: "風力", status, cropNeed: `風敏感度${cropNeed}`, fieldValue, explanation };
}

function checkDrainage(crop: Doc<"crops">, field: Doc<"fields">): Constraint | null {
  if (!field.drainage) return null;
  // Need either waterloggingTolerance or water info
  if (!crop.waterloggingTolerance && !crop.water) return null;

  const fieldValue = drainageLabels[field.drainage] ?? field.drainage;
  const constraints: Constraint[] = [];

  // Check waterlogging tolerance
  if (crop.waterloggingTolerance) {
    const cropNeed = waterloggingLabels[crop.waterloggingTolerance] ?? crop.waterloggingTolerance;
    let status: ConstraintStatus = "ok";
    let explanation = "排水條件符合需求";

    if (crop.waterloggingTolerance === "low") {
      if (field.drainage === "poor") {
        status = "critical";
        explanation = "排水不良易爛根，此作物耐澇性低";
      } else if (field.drainage === "moderate") {
        status = "warning";
        explanation = "排水普通，耐澇性低的作物需注意排水管理";
      }
    }

    constraints.push({
      factor: "排水",
      status,
      cropNeed: `耐澇性${cropNeed}`,
      fieldValue,
      explanation,
    });
  }

  // Check if high-water crop is on well-drained, non-flat land
  if (crop.water === "abundant" && field.drainage === "good" && field.slope && field.slope !== "flat") {
    constraints.push({
      factor: "保水",
      status: "warning",
      cropNeed: "需水量大",
      fieldValue: `排水${fieldValue}`,
      explanation: "水分流失快，需水量大的作物可能缺水",
    });
  }

  // Return the most severe constraint
  if (constraints.length === 0) return null;
  const critical = constraints.find((c) => c.status === "critical");
  if (critical) return critical;
  const warning = constraints.find((c) => c.status === "warning");
  if (warning) return warning;
  return constraints[0];
}

function checkSlope(crop: Doc<"crops">, field: Doc<"fields">): Constraint | null {
  if (!crop.water || !field.slope) return null;
  if (crop.water !== "abundant" || field.slope !== "steep") return null;

  return {
    factor: "坡度",
    status: "warning",
    cropNeed: "需水量大",
    fieldValue: "陡坡",
    explanation: "坡地水分保持困難，需水量大的作物可能缺水",
  };
}

function checkSoilPh(crop: Doc<"crops">, field: Doc<"fields">): Constraint | null {
  if (crop.soilPhMin == null || crop.soilPhMax == null || field.soilPh == null) return null;

  const cropNeed = `pH ${crop.soilPhMin}-${crop.soilPhMax}`;
  const fieldValue = `pH ${field.soilPh}`;
  let status: ConstraintStatus = "ok";
  let explanation = "土壤酸鹼度符合需求";

  if (field.soilPh < crop.soilPhMin - 0.5 || field.soilPh > crop.soilPhMax + 0.5) {
    status = "critical";
    explanation =
      field.soilPh < crop.soilPhMin
        ? "土壤過酸，嚴重偏離作物適宜範圍"
        : "土壤過鹼，嚴重偏離作物適宜範圍";
  } else if (field.soilPh < crop.soilPhMin || field.soilPh > crop.soilPhMax) {
    status = "warning";
    explanation =
      field.soilPh < crop.soilPhMin
        ? "土壤偏酸，略低於作物適宜範圍"
        : "土壤偏鹼，略高於作物適宜範圍";
  }

  return { factor: "土壤酸鹼度", status, cropNeed, fieldValue, explanation };
}

function computeSuitability(crop: Doc<"crops">, field: Doc<"fields">): SuitabilityResult {
  const checks = [
    checkSunlight(crop, field),
    checkWind(crop, field),
    checkDrainage(crop, field),
    checkSlope(crop, field),
    checkSoilPh(crop, field),
  ];

  const constraints = checks.filter((c): c is Constraint => c !== null);

  const hasCritical = constraints.some((c) => c.status === "critical");
  const hasWarning = constraints.some((c) => c.status === "warning");

  let score: SuitabilityScore;
  let overallNotes: string;

  if (hasCritical) {
    score = "risky";
    const factors = constraints
      .filter((c) => c.status === "critical")
      .map((c) => c.factor)
      .join("、");
    overallNotes = `此作物在此田區有風險：${factors}`;
  } else if (hasWarning) {
    score = "marginal";
    const factors = constraints
      .filter((c) => c.status === "warning")
      .map((c) => c.factor)
      .join("、");
    overallNotes = `此作物可在此田區種植，但需注意${factors}`;
  } else {
    score = "recommended";
    overallNotes = "此作物適合在此田區種植";
  }

  return { score, constraints, overallNotes };
}

// === Convex Queries ===

export const evaluateSuitability = query({
  args: { cropId: v.id("crops"), fieldId: v.id("fields") },
  handler: async (ctx, { cropId, fieldId }) => {
    const field = await ctx.db.get(fieldId);
    if (!field) throw new Error("田區不存在");
    await requireFarmMembership(ctx, field.farmId);
    const crop = await ctx.db.get(cropId);
    if (!crop) throw new Error("作物不存在");
    if (crop.farmId !== field.farmId) throw new Error("作物與田區不屬於同一農場");

    return computeSuitability(crop, field);
  },
});

export const evaluateFieldCrops = query({
  args: { fieldId: v.id("fields"), farmId: v.id("farms") },
  handler: async (ctx, { fieldId, farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const field = await ctx.db.get(fieldId);
    if (!field) return [];

    const crops = await ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    return crops.map((crop) => ({
      cropId: crop._id,
      cropName: crop.name,
      emoji: crop.emoji,
      category: crop.category,
      ...computeSuitability(crop, field),
    }));
  },
});

export const evaluateCropFields = query({
  args: { cropId: v.id("crops"), farmId: v.id("farms") },
  handler: async (ctx, { cropId, farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const crop = await ctx.db.get(cropId);
    if (!crop) return [];

    const fields = await ctx.db
      .query("fields")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    return fields.map((field) => ({
      fieldId: field._id,
      fieldName: field.name,
      ...computeSuitability(crop, field),
    }));
  },
});
