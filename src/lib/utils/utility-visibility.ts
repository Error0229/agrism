import type { UtilityEdge, UtilityKind, UtilityNode } from "@/lib/types";

export interface UtilityVisibility {
  showUtilities: boolean;
  showWaterUtilities: boolean;
  showElectricUtilities: boolean;
}

export function isUtilityKindVisible(kind: UtilityKind, visibility: UtilityVisibility): boolean {
  if (!visibility.showUtilities) return false;
  if (kind === "water") return visibility.showWaterUtilities;
  return visibility.showElectricUtilities;
}

export function filterVisibleUtilityNodes(nodes: UtilityNode[], visibility: UtilityVisibility): UtilityNode[] {
  return nodes.filter((node) => isUtilityKindVisible(node.kind, visibility));
}

export function filterVisibleUtilityEdges(edges: UtilityEdge[], visibility: UtilityVisibility): UtilityEdge[] {
  return edges.filter((edge) => isUtilityKindVisible(edge.kind, visibility));
}
