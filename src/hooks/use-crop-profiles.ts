"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/** All profiles for a crop (base, location, farm), ordered by scope. */
export function useCropProfiles(cropId: Id<"crops"> | undefined) {
  return useQuery(api.cropProfiles.getCropProfiles, cropId ? { cropId } : "skip");
}

/** All localized (location-scoped) profiles for a crop across geographies. */
export function useLocalizedProfiles(cropId: Id<"crops"> | undefined) {
  return useQuery(api.cropProfiles.getLocalizedProfiles, cropId ? { cropId } : "skip");
}

/** Resolved facts walking the full hierarchy (base -> country -> county -> district -> farm). */
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

/** Upsert a localized profile using a geography key (e.g., "TW-HUA"). */
export function useUpsertLocalizedProfile() {
  return useMutation(api.cropProfiles.upsertLocalizedProfile);
}

export function useUpdateCropFact() {
  return useMutation(api.cropProfiles.updateCropFact);
}

/** Update a single fact within a localized profile. */
export function useUpdateLocalizedFact() {
  return useMutation(api.cropProfiles.updateLocalizedFact);
}

export function useTriggerCropMigration() {
  return useAction(api.cropProfiles.triggerMigration);
}

/** Trigger migration of legacy "花蓮縣" scopeKeys to geography keys. */
export function useTriggerHualienMigration() {
  return useAction(api.cropProfiles.triggerHualienMigration);
}
