"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useIrrigationZones(farmId: Id<"farms"> | undefined) {
  return useQuery(api.irrigationZones.list, farmId ? { farmId } : "skip");
}

export function useIrrigationZonesByField(fieldId: Id<"fields"> | undefined) {
  return useQuery(
    api.irrigationZones.listByField,
    fieldId ? { fieldId } : "skip"
  );
}

export function useCreateIrrigationZone() {
  return useMutation(api.irrigationZones.create);
}

export function useUpdateIrrigationZone() {
  return useMutation(api.irrigationZones.update);
}

export function useMarkZoneWatered() {
  return useMutation(api.irrigationZones.markWatered);
}

export function useMarkZoneSkipped() {
  return useMutation(api.irrigationZones.markSkipped);
}

export function useRemoveIrrigationZone() {
  return useMutation(api.irrigationZones.remove);
}

export function useGenerateIrrigationAdvice() {
  return useAction(api.irrigationAdvice.generateIrrigationAdvice);
}
