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

export function normalizePlantedCropFacilityMetadata(plantedCrop: PlantedCrop, category?: CropCategory): PlantedCrop {
  if (category === undefined) {
    return {
      ...plantedCrop,
      facilityType: normalizeFacilityType(plantedCrop.facilityType),
      facilityName: normalizeFacilityName(plantedCrop.facilityName),
    };
  }

  if (category !== CropCategory.其它類) {
    const withoutFacilityFields = { ...plantedCrop };
    delete withoutFacilityFields.facilityType;
    delete withoutFacilityFields.facilityName;
    return withoutFacilityFields;
  }

  return {
    ...plantedCrop,
    facilityType: normalizeFacilityType(plantedCrop.facilityType),
    facilityName: normalizeFacilityName(plantedCrop.facilityName),
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
