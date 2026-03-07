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

export function useCheckOverlap(
  fieldId: Id<"fields"> | undefined,
  startEarliest: number | undefined,
  endLatest: number | undefined,
  excludePlanId?: Id<"plannedPlantings">,
) {
  return useQuery(
    api.plannedPlantings.checkOverlap,
    fieldId && (startEarliest || endLatest)
      ? { fieldId, startEarliest, endLatest, excludePlanId }
      : "skip",
  );
}

export function useSuccessionChain(
  fieldId: Id<"fields"> | undefined,
  plantedCropId: Id<"plantedCrops"> | undefined,
) {
  return useQuery(
    api.plannedPlantings.getSuccessionChain,
    fieldId && plantedCropId ? { fieldId, plantedCropId } : "skip",
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
