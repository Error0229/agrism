"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Returns the current user's farmId from Convex.
 * Returns undefined while loading or when user has no farm.
 */
export function useFarmId(): Id<"farms"> | undefined {
  const result = useQuery(api.farms.getMyFarm);
  return result?.farm?._id;
}

/**
 * Returns farmId together with loading/status info so consumers can
 * distinguish between "loading", "no farm", and "has farm".
 */
export function useFarmIdWithStatus() {
  const result = useQuery(api.farms.getMyFarm);
  const isLoading = result === undefined;
  const farmId = result?.farm?._id;
  const hasFarm = !!farmId;
  return { farmId, isLoading, hasFarm } as const;
}

/**
 * Returns the ensureFarm mutation that creates a farm if none exists.
 */
export function useEnsureFarm() {
  return useMutation(api.farms.ensureFarm);
}
