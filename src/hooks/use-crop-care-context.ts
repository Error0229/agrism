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
  // Compute today on the client for Convex query determinism
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });

  const data = useQuery(
    api.fields.getCropCareContext,
    plantedCropId ? { plantedCropId, today } : "skip",
  );

  return {
    data: data ?? null,
    isLoading: data === undefined && plantedCropId !== undefined,
  };
}
