"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useHarvestLogs(farmId: Id<"farms"> | undefined) {
  return useQuery(api.harvest.list, farmId ? { farmId } : "skip");
}

export function useCreateHarvestLog() {
  return useMutation(api.harvest.create);
}

export function useDeleteHarvestLog() {
  return useMutation(api.harvest.remove);
}
