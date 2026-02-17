"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { CustomCrop, Crop } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import defaultCropsData from "@/lib/data/default-crops.json";

interface CustomCropsContextType {
  customCrops: CustomCrop[];
  isLoaded: boolean;
  addCustomCrop: (crop: Omit<CustomCrop, "id" | "isCustom" | "createdAt">) => CustomCrop;
  updateCustomCrop: (id: string, updates: Partial<CustomCrop>) => void;
  removeCustomCrop: (id: string) => void;
  importDefaultCrops: () => number;
}

const CustomCropsContext = createContext<CustomCropsContextType | null>(null);

export function CustomCropsProvider({ children }: { children: ReactNode }) {
  const [customCrops, setCustomCrops, isLoaded] = useLocalStorage<CustomCrop[]>("hualien-custom-crops", []);

  const addCustomCrop = useCallback(
    (crop: Omit<CustomCrop, "id" | "isCustom" | "createdAt">) => {
      const newCrop: CustomCrop = {
        ...crop,
        id: `custom-${uuidv4()}`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      setCustomCrops((prev) => [...prev, newCrop]);
      return newCrop;
    },
    [setCustomCrops]
  );

  const updateCustomCrop = useCallback(
    (id: string, updates: Partial<CustomCrop>) => {
      setCustomCrops((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
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
    const existingNames = new Set(customCrops.map((c) => c.name));
    const newCrops: CustomCrop[] = [];

    for (const crop of defaultCropsData as Crop[]) {
      if (existingNames.has(crop.name)) continue;
      newCrops.push({
        ...crop,
        id: `custom-${uuidv4()}`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      });
    }

    if (newCrops.length > 0) {
      setCustomCrops((prev) => [...prev, ...newCrops]);
    }

    return newCrops.length;
  }, [customCrops, setCustomCrops]);

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
