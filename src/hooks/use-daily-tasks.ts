"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useGenerateDailyTasks() {
  return useMutation(api.dailyTaskGeneration.generateDailyTasks);
}
