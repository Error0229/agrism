"use client";

import { useMemo } from "react";
import { useCustomCrops } from "@/lib/store/custom-crops-context";
import type { Crop, CustomCrop } from "@/lib/types";

export function getAllCrops(customCrops: CustomCrop[]): Crop[] {
  return customCrops;
}

export function getCropByIdFromAll(id: string, customCrops: CustomCrop[]): Crop | undefined {
  return customCrops.find((c) => c.id === id);
}

export function useAllCrops(): Crop[] {
  const { customCrops } = useCustomCrops();
  return useMemo(() => getAllCrops(customCrops), [customCrops]);
}

export function useCropById(id: string): Crop | undefined {
  const allCrops = useAllCrops();
  return useMemo(() => allCrops.find((c) => c.id === id), [allCrops, id]);
}
