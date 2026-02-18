import { SunlightLevel, type Field, type FieldContext, type FieldSunHours, type UtilityEdge, type UtilityNode } from "@/lib/types";
import { normalizeUtilityNodeType } from "@/lib/utils/utility-node";

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

function normalizeUtilityNode(input: unknown): UtilityNode | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<UtilityNode>;
  if (typeof raw.id !== "string" || raw.id.trim().length === 0) return null;
  if (typeof raw.label !== "string" || raw.label.trim().length === 0) return null;
  if (raw.kind !== "water" && raw.kind !== "electric") return null;
  if (!raw.position || typeof raw.position !== "object") return null;
  const x = Number(raw.position.x);
  const y = Number(raw.position.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    id: raw.id,
    label: raw.label,
    kind: raw.kind,
    nodeType: normalizeUtilityNodeType(raw.kind, raw.nodeType),
    position: { x, y },
  };
}

function normalizeUtilityEdge(input: unknown): UtilityEdge | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<UtilityEdge>;
  if (typeof raw.id !== "string" || raw.id.trim().length === 0) return null;
  if (typeof raw.fromNodeId !== "string" || raw.fromNodeId.trim().length === 0) return null;
  if (typeof raw.toNodeId !== "string" || raw.toNodeId.trim().length === 0) return null;
  if (raw.fromNodeId === raw.toNodeId) return null;
  if (raw.kind !== "water" && raw.kind !== "electric") return null;

  return {
    id: raw.id,
    fromNodeId: raw.fromNodeId,
    toNodeId: raw.toNodeId,
    kind: raw.kind,
  };
}

export function normalizeUtilityNetwork(input?: {
  utilityNodes?: unknown;
  utilityEdges?: unknown;
}): { utilityNodes: UtilityNode[]; utilityEdges: UtilityEdge[] } {
  const nodes = (Array.isArray(input?.utilityNodes) ? input?.utilityNodes : [])
    .map((item) => normalizeUtilityNode(item))
    .filter((item): item is UtilityNode => item !== null);
  const nodeKindById = new Map(nodes.map((node) => [node.id, node.kind]));
  const edges = (Array.isArray(input?.utilityEdges) ? input?.utilityEdges : [])
    .map((item) => normalizeUtilityEdge(item))
    .filter((item): item is UtilityEdge => item !== null)
    .filter((edge) => {
      const fromKind = nodeKindById.get(edge.fromNodeId);
      const toKind = nodeKindById.get(edge.toNodeId);
      return fromKind === edge.kind && toKind === edge.kind;
    });
  return { utilityNodes: nodes, utilityEdges: edges };
}

export function normalizeField(field: LegacyField): Field {
  const utility = normalizeUtilityNetwork(field);
  return {
    ...field,
    context: normalizeFieldContext(field.context),
    utilityNodes: utility.utilityNodes,
    utilityEdges: utility.utilityEdges,
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
