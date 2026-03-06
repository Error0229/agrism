"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// --- Queries ---

export function usePlannedPlantingsByField(fieldId: Id<"fields"> | undefined) {
  return useQuery(
    api.plannedPlantings.getByField,
    fieldId ? { fieldId } : "skip",
  );
}

export function usePlannedPlantingsByFarm(farmId: Id<"farms"> | undefined) {
  return useQuery(
    api.plannedPlantings.getByFarm,
    farmId ? { farmId } : "skip",
  );
}

export function useFieldOccupancy(fieldId: Id<"fields"> | undefined) {
  return useQuery(
    api.plannedPlantings.getFieldOccupancy,
    fieldId ? { fieldId } : "skip",
  );
}

// --- Mutations ---

export function useCreatePlannedPlanting() {
  return useMutation(api.plannedPlantings.create);
}

export function useUpdatePlannedPlanting() {
  return useMutation(api.plannedPlantings.update);
}

export function useDeletePlannedPlanting() {
  return useMutation(api.plannedPlantings.remove);
}

export function useConfirmPlannedPlanting() {
  return useMutation(api.plannedPlantings.confirm);
}

export function useCompletePlannedPlanting() {
  return useMutation(api.plannedPlantings.complete);
}

export function useCancelPlannedPlanting() {
  return useMutation(api.plannedPlantings.cancel);
}
