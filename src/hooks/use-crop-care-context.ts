"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Hook to fetch crop care context data for the SmartCropCard.
 * Uses the getCropCareContext query that computes growth stage,
 * stage-specific care tips, contextual alerts, and reference data.
 */
export function useCropCareContext(
  plantedCropId: Id<"plantedCrops"> | undefined,
) {
  const data = useQuery(
    api.fields.getCropCareContext,
    plantedCropId ? { plantedCropId } : "skip",
  );

  return {
    data: data ?? null,
    isLoading: data === undefined && plantedCropId !== undefined,
  };
}
