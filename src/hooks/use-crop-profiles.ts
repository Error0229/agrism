"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useCropProfiles(cropId: Id<"crops"> | undefined) {
  return useQuery(api.cropProfiles.getCropProfiles, cropId ? { cropId } : "skip");
}

export function useResolvedCropFacts(
  cropId: Id<"crops"> | undefined,
  farmId: Id<"farms"> | undefined,
) {
  return useQuery(
    api.cropProfiles.resolvedCropFacts,
    cropId ? { cropId, farmId } : "skip",
  );
}

export function useUpsertCropProfile() {
  return useMutation(api.cropProfiles.upsertCropProfile);
}

export function useUpdateCropFact() {
  return useMutation(api.cropProfiles.updateCropFact);
}

export function useTriggerCropMigration() {
  return useAction(api.cropProfiles.triggerMigration);
}
