"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useTasks(
  farmId: Id<"farms"> | undefined,
  filters?: {
    fieldId?: Id<"fields">;
    cropId?: Id<"crops">;
    completed?: boolean;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  return useQuery(
    api.tasks.list,
    farmId ? { farmId, ...filters } : "skip",
  );
}

export function useCreateTask() {
  return useMutation(api.tasks.create);
}

export function useUpdateTask() {
  return useMutation(api.tasks.update);
}

export function useDeleteTask() {
  return useMutation(api.tasks.remove);
}

export function useToggleTask() {
  return useMutation(api.tasks.toggleComplete);
}
