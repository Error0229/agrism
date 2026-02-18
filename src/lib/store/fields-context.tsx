"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Field, FieldContext, PlantedCrop } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { bootstrapEventsFromFields, createPlannerEvent, replayPlannerEvents, type PlannerEvent } from "@/lib/planner/events";
import { normalizeField, normalizeFieldContext, type LegacyField } from "@/lib/utils/field-context";

interface FieldsContextType {
  fields: Field[];
  plannerEvents: PlannerEvent[];
  isLoaded: boolean;
  showHarvestedCrops: boolean;
  setShowHarvestedCrops: (show: boolean) => void;
  addField: (
    name: string,
    width: number,
    height: number,
    options?: { occurredAt?: string; context?: Partial<FieldContext> }
  ) => Field;
  updateField: (id: string, updates: Partial<Omit<Field, "id">>, options?: { occurredAt?: string }) => void;
  removeField: (id: string, options?: { occurredAt?: string }) => void;
  addPlantedCrop: (fieldId: string, crop: Omit<PlantedCrop, "id">, options?: { occurredAt?: string }) => PlantedCrop;
  updatePlantedCrop: (
    fieldId: string,
    cropId: string,
    updates: Partial<PlantedCrop>,
    options?: { occurredAt?: string }
  ) => void;
  removePlantedCrop: (fieldId: string, cropId: string, options?: { occurredAt?: string }) => void;
  harvestPlantedCrop: (
    fieldId: string,
    cropId: string,
    harvestedDate?: string,
    options?: { occurredAt?: string }
  ) => void;
  getFieldsAt: (at: string | Date, options?: { respectPlantedDate?: boolean }) => Field[];
}

const FieldsContext = createContext<FieldsContextType | null>(null);

export function FieldsProvider({ children }: { children: ReactNode }) {
  const [plannerEvents, setPlannerEvents, isLoaded] = useLocalStorage<PlannerEvent[]>("hualien-planner-events", []);
  const [showHarvestedCrops, setShowHarvestedCrops] = useLocalStorage<boolean>("hualien-show-harvested", true);
  const fields = useMemo(() => replayPlannerEvents(plannerEvents).map(normalizeField), [plannerEvents]);

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
      const legacyFields = JSON.parse(rawFields) as LegacyField[];
      if (!Array.isArray(legacyFields) || legacyFields.length === 0) return;
      setPlannerEvents(bootstrapEventsFromFields(legacyFields.map(normalizeField)));
    } catch {
      // Ignore migration failure and keep empty stream.
    }
  }, [isLoaded, plannerEvents.length, setPlannerEvents]);

  const addField = useCallback(
    (name: string, width: number, height: number, options?: { occurredAt?: string; context?: Partial<FieldContext> }) => {
      const context = normalizeFieldContext(options?.context);
      const newField: Field = { id: uuidv4(), name, dimensions: { width, height }, context, plantedCrops: [] };
      appendEvent(
        createPlannerEvent({
          type: "field_created",
          occurredAt: options?.occurredAt,
          fieldId: newField.id,
          payload: { id: newField.id, name, dimensions: { width, height }, context },
        })
      );
      return newField;
    },
    [appendEvent]
  );

  const updateField = useCallback(
    (id: string, updates: Partial<Omit<Field, "id">>, options?: { occurredAt?: string }) => {
      appendEvent(
        createPlannerEvent({
          type: "field_updated",
          occurredAt: options?.occurredAt,
          fieldId: id,
          payload: updates,
        })
      );
    },
    [appendEvent]
  );

  const removeField = useCallback(
    (id: string, options?: { occurredAt?: string }) => {
      appendEvent(
        createPlannerEvent({
          type: "field_removed",
          occurredAt: options?.occurredAt,
          fieldId: id,
          payload: {},
        })
      );
    },
    [appendEvent]
  );

  const addPlantedCrop = useCallback(
    (fieldId: string, crop: Omit<PlantedCrop, "id">, options?: { occurredAt?: string }) => {
      const newCrop: PlantedCrop = { ...crop, id: uuidv4() };
      appendEvent(
        createPlannerEvent({
          type: "crop_planted",
          occurredAt: options?.occurredAt,
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
    (fieldId: string, cropId: string, updates: Partial<PlantedCrop>, options?: { occurredAt?: string }) => {
      appendEvent(
        createPlannerEvent({
          type: "crop_updated",
          occurredAt: options?.occurredAt,
          fieldId,
          cropId,
          payload: updates,
        })
      );
    },
    [appendEvent]
  );

  const removePlantedCrop = useCallback(
    (fieldId: string, cropId: string, options?: { occurredAt?: string }) => {
      appendEvent(
        createPlannerEvent({
          type: "crop_removed",
          occurredAt: options?.occurredAt,
          fieldId,
          cropId,
          payload: {},
        })
      );
    },
    [appendEvent]
  );

  const harvestPlantedCrop = useCallback(
    (fieldId: string, cropId: string, harvestedDate?: string, options?: { occurredAt?: string }) => {
      appendEvent(
        createPlannerEvent({
          type: "crop_harvested",
          occurredAt: options?.occurredAt ?? harvestedDate,
          fieldId,
          cropId,
          payload: {
            harvestedDate: harvestedDate ?? new Date().toISOString(),
          },
        })
      );
    },
    [appendEvent]
  );

  const getFieldsAt = useCallback(
    (at: string | Date, options?: { respectPlantedDate?: boolean }) =>
      replayPlannerEvents(plannerEvents, { at, respectPlantedDate: options?.respectPlantedDate }).map(normalizeField),
    [plannerEvents]
  );

  return (
    <FieldsContext.Provider
      value={{
        fields,
        plannerEvents,
        isLoaded,
        showHarvestedCrops,
        setShowHarvestedCrops,
        addField,
        updateField,
        removeField,
        addPlantedCrop,
        updatePlantedCrop,
        removePlantedCrop,
        harvestPlantedCrop,
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
