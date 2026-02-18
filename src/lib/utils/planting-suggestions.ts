import type { Crop, Field, SoilProfile } from "@/lib/types";
import { rotationSuggestions } from "@/lib/data/crop-companions";
import { addDays, differenceInDays } from "date-fns";
import { formatSunHoursLabel, isSunlightCompatible } from "@/lib/utils/field-context";

export interface PlantingSuggestion {
  type: "pruning" | "rotation" | "seasonal" | "harvest-soon" | "field-context" | "soil-profile";
  title: string;
  description: string;
  cropId?: string;
  cropName?: string;
  fieldId?: string;
}

export function generatePlantingSuggestions(
  fields: Field[],
  allCrops: Crop[],
  currentMonth: number,
  options?: { soilProfilesByFieldId?: Map<string, SoilProfile> }
): PlantingSuggestion[] {
  const suggestions: PlantingSuggestion[] = [];
  const today = new Date();

  // 1. Check growing crops for pruning needs
  for (const field of fields) {
    for (const planted of field.plantedCrops) {
      if (planted.status !== "growing") continue;
      const crop = allCrops.find((c) => c.id === planted.cropId);
      if (!crop) continue;

      // Pruning suggestion
      if (crop.needsPruning && crop.pruningMonths?.includes(currentMonth)) {
        suggestions.push({
          type: "pruning",
          title: `${crop.emoji} ${crop.name} 需要剪枝`,
          description: `${field.name} 裡的${crop.name}本月適合進行剪枝作業。`,
          cropId: crop.id,
          cropName: crop.name,
          fieldId: field.id,
        });
      }

      // Harvest soon
      const plantDate = new Date(planted.plantedDate);
      const growthDays = planted.customGrowthDays ?? crop.growthDays;
      const harvestDate = addDays(plantDate, growthDays);
      const daysUntilHarvest = differenceInDays(harvestDate, today);
      if (daysUntilHarvest >= 0 && daysUntilHarvest <= 14) {
        suggestions.push({
          type: "harvest-soon",
          title: `${crop.emoji} ${crop.name} 即將收成`,
          description: `${field.name} 的${crop.name}預計 ${daysUntilHarvest} 天後可收成。`,
          cropId: crop.id,
          cropName: crop.name,
          fieldId: field.id,
        });
      }

      if (!isSunlightCompatible(crop.sunlight, field.context.sunHours)) {
        suggestions.push({
          type: "field-context",
          title: `${crop.emoji} ${crop.name} 可能日照不足`,
          description: `${field.name} 目前日照 ${formatSunHoursLabel(field.context.sunHours)}，與${crop.name}需求（${crop.sunlight}）可能不匹配。`,
          cropId: crop.id,
          cropName: crop.name,
          fieldId: field.id,
        });
      }

      const soilProfile = options?.soilProfilesByFieldId?.get(field.id);
      if (soilProfile?.ph != null && (soilProfile.ph < crop.soilPhRange.min || soilProfile.ph > crop.soilPhRange.max)) {
        suggestions.push({
          type: "soil-profile",
          title: `${crop.emoji} ${crop.name} 土壤 pH 需調整`,
          description: `${field.name} 目前 pH ${soilProfile.ph.toFixed(1)}，${crop.name}建議範圍 ${crop.soilPhRange.min}-${crop.soilPhRange.max}。`,
          cropId: crop.id,
          cropName: crop.name,
          fieldId: field.id,
        });
      }
    }
  }

  // 2. Rotation suggestions based on planted categories
  const plantedCategories = new Set(
    fields.flatMap((f) =>
      f.plantedCrops
        .filter((c) => c.status === "growing")
        .map((c) => allCrops.find((cr) => cr.id === c.cropId)?.category)
        .filter(Boolean)
    )
  );

  for (const category of plantedCategories) {
    if (!category) continue;
    const rotation = rotationSuggestions[category];
    if (!rotation) continue;
    for (const nextCat of rotation.next) {
      const candidates = allCrops.filter(
        (c) => c.category === nextCat && c.plantingMonths.includes(currentMonth)
      );
      if (candidates.length > 0) {
        const pick = candidates[0];
        suggestions.push({
          type: "rotation",
          title: `${pick.emoji} 建議輪作：${pick.name}`,
          description: `${rotation.reason}目前${currentMonth}月適合種植${pick.name}。`,
          cropId: pick.id,
          cropName: pick.name,
        });
        break;
      }
    }
  }

  // 3. Seasonal suggestions
  const seasonalCrops = allCrops
    .filter((c) => c.plantingMonths.includes(currentMonth))
    .filter((c) => !plantedCategories.has(c.category))
    .slice(0, 2);

  for (const crop of seasonalCrops) {
    suggestions.push({
      type: "seasonal",
      title: `${crop.emoji} ${currentMonth}月推薦：${crop.name}`,
      description: `${crop.name}適合在${currentMonth}月播種，生長天數約${crop.growthDays}天。${crop.hualienNotes.substring(0, 30)}...`,
      cropId: crop.id,
      cropName: crop.name,
    });
  }

  return suggestions.slice(0, 5);
}
