import { SunlightLevel, type Field, type FieldContext, type FieldSunHours } from "@/lib/types";

export const defaultFieldContext: FieldContext = {
  plotType: "open_field",
  sunHours: "h6_8",
  drainage: "moderate",
  slope: "flat",
  windExposure: "moderate",
};

const plotTypeOptions = new Set<FieldContext["plotType"]>(["open_field", "raised_bed", "container", "greenhouse"]);
const sunHoursOptions = new Set<FieldContext["sunHours"]>(["lt4", "h4_6", "h6_8", "gt8"]);
const drainageOptions = new Set<FieldContext["drainage"]>(["poor", "moderate", "good"]);
const slopeOptions = new Set<FieldContext["slope"]>(["flat", "gentle", "steep"]);
const windOptions = new Set<FieldContext["windExposure"]>(["sheltered", "moderate", "exposed"]);

export type LegacyField = Omit<Field, "context"> & { context?: Partial<FieldContext> | null };

export function normalizeFieldContext(input?: Partial<FieldContext> | null): FieldContext {
  const raw = input ?? {};
  return {
    plotType: plotTypeOptions.has(raw.plotType as FieldContext["plotType"]) ? raw.plotType! : defaultFieldContext.plotType,
    sunHours: sunHoursOptions.has(raw.sunHours as FieldContext["sunHours"]) ? raw.sunHours! : defaultFieldContext.sunHours,
    drainage: drainageOptions.has(raw.drainage as FieldContext["drainage"]) ? raw.drainage! : defaultFieldContext.drainage,
    slope: slopeOptions.has(raw.slope as FieldContext["slope"]) ? raw.slope! : defaultFieldContext.slope,
    windExposure: windOptions.has(raw.windExposure as FieldContext["windExposure"])
      ? raw.windExposure!
      : defaultFieldContext.windExposure,
  };
}

export function normalizeField(field: LegacyField): Field {
  return {
    ...field,
    context: normalizeFieldContext(field.context),
  };
}

export function isSunlightCompatible(cropSunlight: SunlightLevel, sunHours: FieldSunHours): boolean {
  if (cropSunlight === SunlightLevel.全日照) return sunHours === "h6_8" || sunHours === "gt8";
  if (cropSunlight === SunlightLevel.半日照) return sunHours !== "lt4";
  return true;
}

export function formatSunHoursLabel(sunHours: FieldSunHours): string {
  switch (sunHours) {
    case "lt4":
      return "少於 4 小時";
    case "h4_6":
      return "4-6 小時";
    case "h6_8":
      return "6-8 小時";
    case "gt8":
      return "8 小時以上";
    default:
      return "未知";
  }
}
