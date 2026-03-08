"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function usePestObservations(farmId: Id<"farms"> | undefined) {
  return useQuery(api.pestObservations.list, farmId ? { farmId } : "skip");
}

export function usePestObservationsByCrop(cropId: Id<"crops"> | undefined) {
  return useQuery(api.pestObservations.listByCrop, cropId ? { cropId } : "skip");
}

export function useCreatePestObservation() {
  return useMutation(api.pestObservations.create);
}

export function useResolvePestObservation() {
  return useMutation(api.pestObservations.resolve);
}

export function useUpdatePestObservation() {
  return useMutation(api.pestObservations.update);
}

export function useTriageObservation() {
  return useAction(api.pestTriage.triageObservation);
}
