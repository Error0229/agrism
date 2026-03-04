"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// --- Field Queries ---

export function useFields(farmId: Id<"farms"> | undefined) {
  return useQuery(api.fields.list, farmId ? { farmId } : "skip");
}

export function useFieldById(fieldId: Id<"fields"> | undefined) {
  return useQuery(api.fields.getById, fieldId ? { fieldId } : "skip");
}

// --- Field CRUD ---

export function useCreateField() {
  return useMutation(api.fields.create);
}

export function useUpdateField() {
  return useMutation(api.fields.update);
}

export function useUpdateFieldMemo() {
  return useMutation(api.fields.updateMemo);
}

export function useDeleteField() {
  return useMutation(api.fields.remove);
}

// --- Planted Crops ---

export function usePlantCrop() {
  return useMutation(api.fields.plantCrop);
}

export function useCreateRegion() {
  return useMutation(api.fields.createRegion);
}

export function useAssignCropToRegion() {
  return useMutation(api.fields.assignCropToRegion);
}

export function useUpdatePlantedCrop() {
  return useMutation(api.fields.updatePlantedCrop);
}

export function useHarvestCrop() {
  return useMutation(api.fields.harvestCrop);
}

export function useRemovePlantedCrop() {
  return useMutation(api.fields.removePlantedCrop);
}

export function useRestorePlantedCrop() {
  return useMutation(api.fields.restorePlantedCrop);
}

export function useDeletePlantedCropWithPlacement() {
  return useMutation(api.fields.deletePlantedCropWithPlacement);
}

export function useUpdateCropPlacement() {
  return useMutation(api.fields.updateCropPlacement);
}

// --- Facilities ---

export function useCreateFacility() {
  return useMutation(api.fields.createFacility);
}

export function useUpdateFacility() {
  return useMutation(api.fields.updateFacility);
}

export function useDeleteFacility() {
  return useMutation(api.fields.deleteFacility);
}

// --- Utility Nodes & Edges ---

export function useCreateUtilityNode() {
  return useMutation(api.fields.createUtilityNode);
}

export function useUpdateUtilityNode() {
  return useMutation(api.fields.updateUtilityNode);
}

export function useDeleteUtilityNode() {
  return useMutation(api.fields.deleteUtilityNode);
}

export function useCreateUtilityEdge() {
  return useMutation(api.fields.createUtilityEdge);
}

export function useDeleteUtilityEdge() {
  return useMutation(api.fields.deleteUtilityEdge);
}
