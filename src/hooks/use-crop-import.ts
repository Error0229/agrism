"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useImportCropWithEvidence() {
  return useAction(api.cropImport.importCropWithEvidence);
}

export function useApproveImport() {
  return useMutation(api.crops.approveImport);
}

export function useRejectImport() {
  return useMutation(api.crops.rejectImport);
}

export function usePendingImport(cropId: Id<"crops"> | undefined) {
  return useQuery(api.crops.getPendingImport, cropId ? { cropId } : "skip");
}

export function usePendingImports(farmId: Id<"farms"> | undefined) {
  return useQuery(api.crops.listPendingImports, farmId ? { farmId } : "skip");
}
