import { companionConflicts, rotationSuggestions } from "@/lib/data/crop-companions";
import { isRotationEligibleCategory, type Crop, type Field, type PlantedCrop } from "@/lib/types";

export interface PlanningRuleWarning {
  id: string;
  type: "rotation" | "companion";
  severity: "warning";
  message: string;
  suggestions: string[];
}

function getCropMap(crops: Crop[]) {
  return new Map(crops.map((crop) => [crop.id, crop]));
}

function findPreviousCrop(current: PlantedCrop, field: Field) {
  const candidates = field.plantedCrops
    .filter((crop) => crop.id !== current.id)
    .filter((crop) => crop.status !== "growing")
    .filter((crop) => new Date(crop.plantedDate).getTime() < new Date(current.plantedDate).getTime())
    .sort((a, b) => new Date(b.plantedDate).getTime() - new Date(a.plantedDate).getTime());

  return candidates[0];
}

export function evaluateFieldPlanningRules(field: Field, allCrops: Crop[]): PlanningRuleWarning[] {
  const warnings: PlanningRuleWarning[] = [];
  const cropMap = getCropMap(allCrops);
  const growing = field.plantedCrops.filter((crop) => crop.status === "growing");

  for (const planted of growing) {
    const crop = cropMap.get(planted.cropId);
    if (!crop) continue;

    const previous = findPreviousCrop(planted, field);
    const previousCrop = previous ? cropMap.get(previous.cropId) : undefined;
    if (previousCrop) {
      if (!isRotationEligibleCategory(previousCrop.category) || !isRotationEligibleCategory(crop.category)) {
        continue;
      }
      const rotation = rotationSuggestions[previousCrop.category];
      if (rotation && !rotation.next.includes(crop.category)) {
        const alternatives = rotation.next
          .map((category) => allCrops.find((item) => item.category === category)?.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, 3);

        warnings.push({
          id: `rotation-${planted.id}`,
          type: "rotation",
          severity: "warning",
          message: `${crop.name} 接續種植在 ${previousCrop.name} 之後，可能不利輪作。`,
          suggestions: alternatives.length > 0 ? alternatives : ["改種其他類別作物以分散病蟲害壓力"],
        });
      }
    }
  }

  for (let i = 0; i < growing.length; i += 1) {
    for (let j = i + 1; j < growing.length; j += 1) {
      const first = cropMap.get(growing[i].cropId);
      const second = cropMap.get(growing[j].cropId);
      if (!first || !second) continue;
      if (!isRotationEligibleCategory(first.category) || !isRotationEligibleCategory(second.category)) continue;

      const firstConflict = companionConflicts[first.id];
      const secondConflict = companionConflicts[second.id];
      const hasConflict =
        (firstConflict?.avoid ?? []).includes(second.id) ||
        (secondConflict?.avoid ?? []).includes(first.id);

      if (!hasConflict) continue;

      const alternatives = [...(firstConflict?.alternatives ?? []), ...(secondConflict?.alternatives ?? [])]
        .map((cropId) => cropMap.get(cropId)?.name)
        .filter((name): name is string => Boolean(name))
        .slice(0, 3);

      warnings.push({
        id: `companion-${growing[i].id}-${growing[j].id}`,
        type: "companion",
        severity: "warning",
        message: `${first.name} 與 ${second.name} 可能是相斥搭配，建議調整配置。`,
        suggestions: alternatives.length > 0 ? alternatives : ["改搭配蔥類或辛香料作物"],
      });
    }
  }

  return warnings;
}

