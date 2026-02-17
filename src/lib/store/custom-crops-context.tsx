"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { CropTemplate, CustomCrop, Crop } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import defaultCropsData from "@/lib/data/default-crops.json";
import { normalizeCrop, normalizeCustomCrop } from "@/lib/data/crop-schema";

type AddCustomCropInput = Omit<CustomCrop, "id" | "isCustom" | "createdAt" | "schemaVersion" | "stageProfiles"> & {
  stageProfiles?: CustomCrop["stageProfiles"];
};

interface CustomCropsContextType {
  customCrops: CustomCrop[];
  cropTemplates: CropTemplate[];
  isLoaded: boolean;
  addCustomCrop: (crop: AddCustomCropInput) => CustomCrop;
  updateCustomCrop: (id: string, updates: Partial<CustomCrop>) => void;
  removeCustomCrop: (id: string) => void;
  importDefaultCrops: () => number;
  saveCurrentAsTemplate: (name: string) => CropTemplate | null;
  applyTemplate: (templateId: string) => number;
  exportTemplates: () => string;
  importTemplates: (jsonText: string) => number;
  removeTemplate: (templateId: string) => void;
}

const CustomCropsContext = createContext<CustomCropsContextType | null>(null);

export function CustomCropsProvider({ children }: { children: ReactNode }) {
  const [rawCustomCrops, setCustomCrops, isLoaded] = useLocalStorage<CustomCrop[]>("hualien-custom-crops", []);
  const [rawTemplates, setTemplates] = useLocalStorage<CropTemplate[]>("hualien-crop-templates", []);
  const customCrops = useMemo(
    () =>
      rawCustomCrops
        .filter((crop) => Boolean(crop?.id) && Boolean(crop?.name) && Boolean(crop?.category))
        .map((crop) => normalizeCustomCrop(crop)),
    [rawCustomCrops]
  );

  const cropTemplates = useMemo(
    () =>
      rawTemplates
        .filter((template) => Boolean(template?.id) && Boolean(template?.name))
        .map((template) => ({
          ...template,
          crops: (template.crops ?? [])
            .filter((crop) => Boolean(crop?.id) && Boolean(crop?.name) && Boolean(crop?.category))
            .map((crop) => normalizeCustomCrop(crop)),
        })),
    [rawTemplates]
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

  useEffect(() => {
    if (!isLoaded) return;

    const migrated = rawTemplates
      .filter((template) => Boolean(template?.id) && Boolean(template?.name))
      .map((template) => ({
        ...template,
        crops: (template.crops ?? [])
          .filter((crop) => Boolean(crop?.id) && Boolean(crop?.name) && Boolean(crop?.category))
          .map((crop) => normalizeCustomCrop(crop)),
      }));

    if (JSON.stringify(migrated) !== JSON.stringify(rawTemplates)) {
      setTemplates(migrated);
    }
  }, [isLoaded, rawTemplates, setTemplates]);

  const addCustomCrop = useCallback(
    (crop: AddCustomCropInput) => {
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

  const saveCurrentAsTemplate = useCallback(
    (name: string) => {
      const templateName = name.trim();
      if (!templateName || customCrops.length === 0) return null;

      const nextTemplate: CropTemplate = {
        id: `template-${uuidv4()}`,
        name: templateName,
        createdAt: new Date().toISOString(),
        crops: customCrops.map((crop) => normalizeCustomCrop(crop)),
      };

      setTemplates((prev) => [...prev, nextTemplate]);
      return nextTemplate;
    },
    [customCrops, setTemplates]
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = cropTemplates.find((item) => item.id === templateId);
      if (!template) return 0;

      const existingNames = new Set(customCrops.map((crop) => crop.name));
      const newCrops = template.crops
        .filter((crop) => !existingNames.has(crop.name))
        .map((crop) =>
          normalizeCustomCrop({
            ...crop,
            id: `custom-${uuidv4()}`,
            createdAt: new Date().toISOString(),
            isCustom: true,
          })
        );

      if (newCrops.length > 0) {
        setCustomCrops((prev) => [...prev, ...newCrops]);
      }

      return newCrops.length;
    },
    [cropTemplates, customCrops, setCustomCrops]
  );

  const exportTemplates = useCallback(() => {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), templates: cropTemplates }, null, 2);
  }, [cropTemplates]);

  const importTemplates = useCallback(
    (jsonText: string) => {
      const parsed = JSON.parse(jsonText) as { templates?: CropTemplate[] };
      const incoming = (parsed.templates ?? [])
        .filter((template) => Boolean(template?.id) && Boolean(template?.name))
        .map((template) => ({
          ...template,
          id: `template-${uuidv4()}`,
          createdAt: String(template.createdAt ?? new Date().toISOString()),
          crops: (template.crops ?? [])
            .filter((crop) => Boolean(crop?.id) && Boolean(crop?.name) && Boolean(crop?.category))
            .map((crop) =>
              normalizeCustomCrop({
                ...crop,
                id: `custom-${uuidv4()}`,
                createdAt: String(crop.createdAt ?? new Date().toISOString()),
                isCustom: true,
              })
            ),
        }));

      if (incoming.length > 0) {
        setTemplates((prev) => [...prev, ...incoming]);
      }

      return incoming.length;
    },
    [setTemplates]
  );

  const removeTemplate = useCallback(
    (templateId: string) => {
      setTemplates((prev) => prev.filter((template) => template.id !== templateId));
    },
    [setTemplates]
  );

  return (
    <CustomCropsContext.Provider
      value={{
        customCrops,
        cropTemplates,
        isLoaded,
        addCustomCrop,
        updateCustomCrop,
        removeCustomCrop,
        importDefaultCrops,
        saveCurrentAsTemplate,
        applyTemplate,
        exportTemplates,
        importTemplates,
        removeTemplate,
      }}
    >
      {children}
    </CustomCropsContext.Provider>
  );
}

export function useCustomCrops() {
  const ctx = useContext(CustomCropsContext);
  if (!ctx) throw new Error("useCustomCrops must be used within CustomCropsProvider");
  return ctx;
}
