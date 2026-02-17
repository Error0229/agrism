"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { CustomCrop, Crop } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import defaultCropsData from "@/lib/data/default-crops.json";
import { normalizeCrop, normalizeCustomCrop } from "@/lib/data/crop-schema";

interface CustomCropsContextType {
  customCrops: CustomCrop[];
  isLoaded: boolean;
  addCustomCrop: (crop: Omit<CustomCrop, "id" | "isCustom" | "createdAt" | "schemaVersion">) => CustomCrop;
  updateCustomCrop: (id: string, updates: Partial<CustomCrop>) => void;
  removeCustomCrop: (id: string) => void;
  importDefaultCrops: () => number;
}

const CustomCropsContext = createContext<CustomCropsContextType | null>(null);

export function CustomCropsProvider({ children }: { children: ReactNode }) {
  const [rawCustomCrops, setCustomCrops, isLoaded] = useLocalStorage<CustomCrop[]>("hualien-custom-crops", []);
  const customCrops = useMemo(
    () =>
      rawCustomCrops
        .filter((crop) => Boolean(crop?.id) && Boolean(crop?.name) && Boolean(crop?.category))
        .map((crop) => normalizeCustomCrop(crop)),
    [rawCustomCrops]
  );

  useEffect(() => {
    if (!isLoaded) return;

    const migrated = rawCustomCrops
      .filter((crop) => Boolean(crop?.id) && Boolean(crop?.name) && Boolean(crop?.category))
      .map((crop) => normalizeCustomCrop(crop));

    if (JSON.stringify(migrated) !== JSON.stringify(rawCustomCrops)) {
      setCustomCrops(migrated);
    }
  }, [isLoaded, rawCustomCrops, setCustomCrops]);

  const addCustomCrop = useCallback(
    (crop: Omit<CustomCrop, "id" | "isCustom" | "createdAt" | "schemaVersion">) => {
      const newCrop = normalizeCustomCrop({
        ...crop,
        id: `custom-${uuidv4()}`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      });
      setCustomCrops((prev) => [...prev, newCrop]);
      return newCrop;
    },
    [setCustomCrops]
  );

  const updateCustomCrop = useCallback(
    (id: string, updates: Partial<CustomCrop>) => {
      setCustomCrops((prev) =>
        prev.map((c) => (c.id === id ? normalizeCustomCrop({ ...c, ...updates, id: c.id, name: c.name, category: c.category }) : c))
      );
    },
    [setCustomCrops]
  );

  const removeCustomCrop = useCallback(
    (id: string) => {
      setCustomCrops((prev) => prev.filter((c) => c.id !== id));
    },
    [setCustomCrops]
  );

  const importDefaultCrops = useCallback(() => {
    const existingNames = new Set(rawCustomCrops.map((c) => c.name));
    const newCrops: CustomCrop[] = [];

    for (const crop of defaultCropsData as Crop[]) {
      if (existingNames.has(crop.name)) continue;
      newCrops.push(
        normalizeCustomCrop({
          ...normalizeCrop(crop),
          schemaVersion: 2,
          id: `custom-${uuidv4()}`,
          isCustom: true,
          createdAt: new Date().toISOString(),
        })
      );
    }

    if (newCrops.length > 0) {
      setCustomCrops((prev) => [...prev, ...newCrops]);
    }

    return newCrops.length;
  }, [rawCustomCrops, setCustomCrops]);

  return (
    <CustomCropsContext.Provider value={{ customCrops, isLoaded, addCustomCrop, updateCustomCrop, removeCustomCrop, importDefaultCrops }}>
      {children}
    </CustomCropsContext.Provider>
  );
}

export function useCustomCrops() {
  const ctx = useContext(CustomCropsContext);
  if (!ctx) throw new Error("useCustomCrops must be used within CustomCropsProvider");
  return ctx;
}
