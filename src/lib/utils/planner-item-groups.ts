import type { Crop } from "@/lib/types";
import { isInfrastructureCategory } from "@/lib/types";

export function splitPlannerItemsByUsage(crops: Crop[]) {
  return {
    cropItems: crops.filter((crop) => !isInfrastructureCategory(crop.category)),
    facilityItems: crops.filter((crop) => isInfrastructureCategory(crop.category)),
  };
}
