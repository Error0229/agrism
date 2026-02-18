import type { UtilityKind, UtilityNode, UtilityNodeType } from "@/lib/types";

const utilityNodeTypeByKind: Record<UtilityKind, UtilityNodeType[]> = {
  water: ["pump", "tank", "valve", "junction", "custom"],
  electric: ["outlet", "junction", "custom"],
};

const utilityNodeTypeLabels: Record<UtilityNodeType, string> = {
  pump: "馬達",
  tank: "蓄水池",
  valve: "閥門",
  outlet: "插座",
  junction: "節點",
  custom: "自訂",
};

export function getDefaultUtilityNodeType(kind: UtilityKind): UtilityNodeType {
  return kind === "water" ? "junction" : "outlet";
}

export function getUtilityNodeTypeOptions(kind: UtilityKind): UtilityNodeType[] {
  return utilityNodeTypeByKind[kind];
}

export function getUtilityNodeTypeLabel(type: UtilityNodeType): string {
  return utilityNodeTypeLabels[type];
}

export function normalizeUtilityNodeType(kind: UtilityKind, nodeType: unknown): UtilityNodeType {
  if (typeof nodeType !== "string") return getDefaultUtilityNodeType(kind);
  const typed = nodeType as UtilityNodeType;
  return utilityNodeTypeByKind[kind].includes(typed) ? typed : getDefaultUtilityNodeType(kind);
}

export function formatUtilityNodeDisplayLabel(node: Pick<UtilityNode, "label" | "kind" | "nodeType">): string {
  const typeLabel = getUtilityNodeTypeLabel(normalizeUtilityNodeType(node.kind, node.nodeType));
  const rawLabel = typeof node.label === "string" ? node.label.trim() : "";
  if (!rawLabel) return typeLabel;
  if (rawLabel.startsWith(typeLabel)) return rawLabel;
  return `${typeLabel} - ${rawLabel}`;
}
