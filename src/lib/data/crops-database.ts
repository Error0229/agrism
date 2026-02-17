import { Crop, CropCategory } from "@/lib/types";

export const cropsDatabase: Crop[] = [];

export function getCropById(id: string): Crop | undefined {
  return cropsDatabase.find((crop) => crop.id === id);
}

export function getCropsByCategory(category: CropCategory): Crop[] {
  return cropsDatabase.filter((crop) => crop.category === category);
}

export function getCropsByMonth(month: number): Crop[] {
  return cropsDatabase.filter((crop) => crop.plantingMonths.includes(month));
}
