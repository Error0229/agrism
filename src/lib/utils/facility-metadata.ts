import { CropCategory, type FacilityType, type PlantedCrop } from "@/lib/types";

const facilityTypeLabels: Record<FacilityType, string> = {
  water_tank: "蓄水池",
  motor: "馬達",
  road: "道路",
  tool_shed: "工具間",
  house: "房舍",
  custom: "其它設施",
};

const facilityTypeOptions = Object.keys(facilityTypeLabels) as FacilityType[];
const facilityTypeSet = new Set<FacilityType>(facilityTypeOptions);
const facilityTypeByCropName: Record<string, FacilityType> = {
  蓄水池: "water_tank",
  馬達: "motor",
  道路: "road",
  工具間: "tool_shed",
  房舍: "house",
};

export function getFacilityTypeOptions(): Array<{ value: FacilityType; label: string }> {
  return facilityTypeOptions.map((value) => ({
    value,
    label: facilityTypeLabels[value],
  }));
}

export function getFacilityTypeLabel(type: FacilityType): string {
  return facilityTypeLabels[type];
}

export function normalizeFacilityType(input: unknown): FacilityType | undefined {
  if (typeof input !== "string") return undefined;
  if (!facilityTypeSet.has(input as FacilityType)) return undefined;
  return input as FacilityType;
}

export function normalizeFacilityName(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function inferFacilityTypeFromCropName(cropName: unknown): FacilityType | undefined {
  if (typeof cropName !== "string") return undefined;
  const normalizedName = cropName.trim();
  if (!normalizedName) return undefined;
  return facilityTypeByCropName[normalizedName];
}

export function deriveFacilityTypeFromCrop(crop?: { category: CropCategory; name: string }): FacilityType | undefined {
  if (!crop || crop.category !== CropCategory.其它類) return undefined;
  return inferFacilityTypeFromCropName(crop.name);
}

function resolveFacilityTypeWithFallback(facilityType: unknown, cropName?: string): FacilityType | undefined {
  return normalizeFacilityType(facilityType) ?? inferFacilityTypeFromCropName(cropName);
}

export function normalizeLinkedUtilityNodeIds(input: unknown, validNodeIds?: Set<string>): string[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (typeof item !== "string") continue;
    const nodeId = item.trim();
    if (!nodeId) continue;
    if (validNodeIds && !validNodeIds.has(nodeId)) continue;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    deduped.push(nodeId);
  }

  return deduped.length > 0 ? deduped : undefined;
}

export function normalizePlantedCropFacilityMetadata(
  plantedCrop: PlantedCrop,
  category?: CropCategory,
  validUtilityNodeIds?: Set<string>,
  cropName?: string
): PlantedCrop {
  if (category === undefined) {
    return {
      ...plantedCrop,
      facilityType: normalizeFacilityType(plantedCrop.facilityType),
      facilityName: normalizeFacilityName(plantedCrop.facilityName),
      linkedUtilityNodeIds: normalizeLinkedUtilityNodeIds(plantedCrop.linkedUtilityNodeIds, validUtilityNodeIds),
    };
  }

  if (category !== CropCategory.其它類) {
    const withoutFacilityFields = { ...plantedCrop };
    delete withoutFacilityFields.facilityType;
    delete withoutFacilityFields.facilityName;
    delete withoutFacilityFields.linkedUtilityNodeIds;
    return withoutFacilityFields;
  }

  return {
    ...plantedCrop,
    facilityType: resolveFacilityTypeWithFallback(plantedCrop.facilityType, cropName),
    facilityName: normalizeFacilityName(plantedCrop.facilityName),
    linkedUtilityNodeIds: normalizeLinkedUtilityNodeIds(plantedCrop.linkedUtilityNodeIds, validUtilityNodeIds),
  };
}

export function getPlantedCropDisplayLabel(
  plantedCrop: Pick<PlantedCrop, "facilityType" | "facilityName">,
  cropName: string,
  category?: CropCategory
): string {
  if (category !== CropCategory.其它類) return cropName;

  const facilityName = normalizeFacilityName(plantedCrop.facilityName);
  if (facilityName) return facilityName;

  const facilityType = normalizeFacilityType(plantedCrop.facilityType);
  if (facilityType) return getFacilityTypeLabel(facilityType);

  return cropName;
}

export function getLinkedUtilitySummary(
  plantedCrop: Pick<PlantedCrop, "linkedUtilityNodeIds">,
  category?: CropCategory
): string | null {
  if (category !== CropCategory.其它類) return null;
  const linked = normalizeLinkedUtilityNodeIds(plantedCrop.linkedUtilityNodeIds);
  if (!linked || linked.length === 0) return null;
  return `已連結 ${linked.length} 節點`;
}
