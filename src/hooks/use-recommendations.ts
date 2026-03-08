"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useActiveRecommendations(farmId: Id<"farms"> | undefined) {
  return useQuery(api.recommendations.getActive, farmId ? { farmId } : "skip");
}

export function useRecommendationHistory(farmId: Id<"farms"> | undefined) {
  return useQuery(
    api.recommendations.getHistory,
    farmId ? { farmId } : "skip"
  );
}

export function useAcceptRecommendation() {
  return useMutation(api.recommendations.accept);
}

export function useSnoozeRecommendation() {
  return useMutation(api.recommendations.snooze);
}

export function useDismissRecommendation() {
  return useMutation(api.recommendations.dismiss);
}

export function useCompleteRecommendation() {
  return useMutation(api.recommendations.complete);
}

export function useGenerateBriefing() {
  return useAction(api.briefingGeneration.generateBriefing);
}
