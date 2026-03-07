"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useCropFieldSuitability(
  cropId: Id<"crops"> | undefined,
  fieldId: Id<"fields"> | undefined,
) {
  return useQuery(
    api.suitability.evaluateSuitability,
    cropId && fieldId ? { cropId, fieldId } : "skip",
  );
}

export function useFieldCropSuitabilities(
  fieldId: Id<"fields"> | undefined,
  farmId: Id<"farms"> | undefined,
) {
  return useQuery(
    api.suitability.evaluateFieldCrops,
    fieldId && farmId ? { fieldId, farmId } : "skip",
  );
}

export function useCropFieldsSuitabilities(
  cropId: Id<"crops"> | undefined,
  farmId: Id<"farms"> | undefined,
) {
  return useQuery(
    api.suitability.evaluateCropFields,
    cropId && farmId ? { cropId, farmId } : "skip",
  );
}
