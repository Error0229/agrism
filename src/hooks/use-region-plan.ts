"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Unified region plan query (issue #105).
 * Returns the current crop, linked successors, and orphan plans for a region.
 */
export function useRegionPlan(
  fieldId: Id<"fields"> | undefined,
  plantedCropId?: Id<"plantedCrops">,
  regionId?: string,
) {
  return useQuery(
    api.plannedPlantings.getRegionPlan,
    fieldId ? { fieldId, plantedCropId, regionId } : "skip",
  );
}

/**
 * Region history query (issue #105).
 * Returns past plantedCrops (harvested/removed) for a region, ordered desc.
 */
export function useRegionHistory(
  fieldId: Id<"fields"> | undefined,
  plantedCropId?: Id<"plantedCrops">,
  regionId?: string,
) {
  return useQuery(
    api.plannedPlantings.getRegionHistory,
    fieldId
      ? { fieldId, plantedCropId, regionId }
      : "skip",
  );
}
