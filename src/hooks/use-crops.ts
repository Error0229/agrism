"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useCrops(farmId: Id<"farms"> | undefined) {
  return useQuery(api.crops.list, farmId ? { farmId } : "skip");
}

export function useCropById(cropId: Id<"crops"> | undefined) {
  return useQuery(api.crops.getById, cropId ? { cropId } : "skip");
}

export function useCreateCrop() {
  return useMutation(api.crops.create);
}

export function useUpdateCrop() {
  return useMutation(api.crops.update);
}

export function useDeleteCrop() {
  return useMutation(api.crops.remove);
}

export function useCropTemplates(farmId: Id<"farms"> | undefined) {
  return useQuery(api.crops.listTemplates, farmId ? { farmId } : "skip");
}

export function useCreateCropTemplate() {
  return useMutation(api.crops.createTemplate);
}

export function useApplyCropTemplate(templateId: Id<"cropTemplates"> | undefined) {
  return useQuery(api.crops.applyTemplate, templateId ? { templateId } : "skip");
}

export function useDeleteCropTemplate() {
  return useMutation(api.crops.removeTemplate);
}
