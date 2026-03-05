"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useWeatherLogs(farmId: Id<"farms"> | undefined) {
  return useQuery(api.weather.list, farmId ? { farmId } : "skip");
}

export function useCreateWeatherLog() {
  return useMutation(api.weather.create);
}

export function useDeleteWeatherLog() {
  return useMutation(api.weather.remove);
}
