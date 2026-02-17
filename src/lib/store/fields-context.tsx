"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Field, PlantedCrop } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { bootstrapEventsFromFields, createPlannerEvent, replayPlannerEvents, type PlannerEvent } from "@/lib/planner/events";

interface FieldsContextType {
  fields: Field[];
  plannerEvents: PlannerEvent[];
  isLoaded: boolean;
  addField: (name: string, width: number, height: number) => Field;
  updateField: (id: string, updates: Partial<Omit<Field, "id">>) => void;
  removeField: (id: string) => void;
  addPlantedCrop: (fieldId: string, crop: Omit<PlantedCrop, "id">) => PlantedCrop;
  updatePlantedCrop: (fieldId: string, cropId: string, updates: Partial<PlantedCrop>) => void;
  removePlantedCrop: (fieldId: string, cropId: string) => void;
  getFieldsAt: (at: string | Date) => Field[];
}

const FieldsContext = createContext<FieldsContextType | null>(null);

export function FieldsProvider({ children }: { children: ReactNode }) {
  const [plannerEvents, setPlannerEvents, isLoaded] = useLocalStorage<PlannerEvent[]>("hualien-planner-events", []);
  const fields = useMemo(() => replayPlannerEvents(plannerEvents), [plannerEvents]);

  const appendEvent = useCallback(
    (event: PlannerEvent) => {
      setPlannerEvents((prev) => [...prev, event]);
      fetch("/api/planner/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }).catch(() => {
        // Keep local event store as source of truth even if remote sync fails.
      });
    },
    [setPlannerEvents]
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (plannerEvents.length > 0) return;
    if (typeof window === "undefined") return;

    try {
      const rawFields = window.localStorage.getItem("hualien-fields");
      if (!rawFields) return;
      const legacyFields = JSON.parse(rawFields) as Field[];
      if (!Array.isArray(legacyFields) || legacyFields.length === 0) return;
      setPlannerEvents(bootstrapEventsFromFields(legacyFields));
    } catch {
      // Ignore migration failure and keep empty stream.
    }
  }, [isLoaded, plannerEvents.length, setPlannerEvents]);

  const addField = useCallback(
    (name: string, width: number, height: number) => {
      const newField: Field = { id: uuidv4(), name, dimensions: { width, height }, plantedCrops: [] };
      appendEvent(
        createPlannerEvent({
          type: "field_created",
          fieldId: newField.id,
          payload: { id: newField.id, name, dimensions: { width, height } },
        })
      );
      return newField;
    },
    [appendEvent]
  );

  const updateField = useCallback(
    (id: string, updates: Partial<Omit<Field, "id">>) => {
      appendEvent(
        createPlannerEvent({
          type: "field_updated",
          fieldId: id,
          payload: updates,
        })
      );
    },
    [appendEvent]
  );

  const removeField = useCallback(
    (id: string) => {
      appendEvent(
        createPlannerEvent({
          type: "field_removed",
          fieldId: id,
          payload: {},
        })
      );
    },
    [appendEvent]
  );

  const addPlantedCrop = useCallback(
    (fieldId: string, crop: Omit<PlantedCrop, "id">) => {
      const newCrop: PlantedCrop = { ...crop, id: uuidv4() };
      appendEvent(
        createPlannerEvent({
          type: "crop_planted",
          fieldId,
          cropId: newCrop.id,
          payload: newCrop,
        })
      );
      return newCrop;
    },
    [appendEvent]
  );

  const updatePlantedCrop = useCallback(
    (fieldId: string, cropId: string, updates: Partial<PlantedCrop>) => {
      appendEvent(
        createPlannerEvent({
          type: "crop_updated",
          fieldId,
          cropId,
          payload: updates,
        })
      );
    },
    [appendEvent]
  );

  const removePlantedCrop = useCallback(
    (fieldId: string, cropId: string) => {
      appendEvent(
        createPlannerEvent({
          type: "crop_removed",
          fieldId,
          cropId,
          payload: {},
        })
      );
    },
    [appendEvent]
  );

  const getFieldsAt = useCallback(
    (at: string | Date) => replayPlannerEvents(plannerEvents, { at }),
    [plannerEvents]
  );

  return (
    <FieldsContext.Provider
      value={{
        fields,
        plannerEvents,
        isLoaded,
        addField,
        updateField,
        removeField,
        addPlantedCrop,
        updatePlantedCrop,
        removePlantedCrop,
        getFieldsAt,
      }}
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
