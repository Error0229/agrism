"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Field, PlantedCrop } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface FieldsContextType {
  fields: Field[];
  isLoaded: boolean;
  addField: (name: string, width: number, height: number) => Field;
  updateField: (id: string, updates: Partial<Omit<Field, "id">>) => void;
  removeField: (id: string) => void;
  addPlantedCrop: (fieldId: string, crop: Omit<PlantedCrop, "id">) => PlantedCrop;
  updatePlantedCrop: (fieldId: string, cropId: string, updates: Partial<PlantedCrop>) => void;
  removePlantedCrop: (fieldId: string, cropId: string) => void;
}

const FieldsContext = createContext<FieldsContextType | null>(null);

export function FieldsProvider({ children }: { children: ReactNode }) {
  const [fields, setFields, isLoaded] = useLocalStorage<Field[]>("hualien-fields", []);

  const addField = useCallback(
    (name: string, width: number, height: number) => {
      const newField: Field = { id: uuidv4(), name, dimensions: { width, height }, plantedCrops: [] };
      setFields((prev) => [...prev, newField]);
      return newField;
    },
    [setFields]
  );

  const updateField = useCallback(
    (id: string, updates: Partial<Omit<Field, "id">>) => {
      setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    },
    [setFields]
  );

  const removeField = useCallback(
    (id: string) => {
      setFields((prev) => prev.filter((f) => f.id !== id));
    },
    [setFields]
  );

  const addPlantedCrop = useCallback(
    (fieldId: string, crop: Omit<PlantedCrop, "id">) => {
      const newCrop: PlantedCrop = { ...crop, id: uuidv4() };
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, plantedCrops: [...f.plantedCrops, newCrop] } : f))
      );
      return newCrop;
    },
    [setFields]
  );

  const updatePlantedCrop = useCallback(
    (fieldId: string, cropId: string, updates: Partial<PlantedCrop>) => {
      setFields((prev) =>
        prev.map((f) =>
          f.id === fieldId
            ? { ...f, plantedCrops: f.plantedCrops.map((c) => (c.id === cropId ? { ...c, ...updates } : c)) }
            : f
        )
      );
    },
    [setFields]
  );

  const removePlantedCrop = useCallback(
    (fieldId: string, cropId: string) => {
      setFields((prev) =>
        prev.map((f) =>
          f.id === fieldId ? { ...f, plantedCrops: f.plantedCrops.filter((c) => c.id !== cropId) } : f
        )
      );
    },
    [setFields]
  );

  return (
    <FieldsContext.Provider
      value={{ fields, isLoaded, addField, updateField, removeField, addPlantedCrop, updatePlantedCrop, removePlantedCrop }}
    >
      {children}
    </FieldsContext.Provider>
  );
}

export function useFields() {
  const ctx = useContext(FieldsContext);
  if (!ctx) throw new Error("useFields must be used within FieldsProvider");
  return ctx;
}
