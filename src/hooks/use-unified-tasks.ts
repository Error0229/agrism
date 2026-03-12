"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Unified task stream: fetches all tasks + pending recommendations
 * merged into a single sorted list.
 */
export function useUnifiedTasks(
  farmId: Id<"farms"> | undefined,
  date?: string,
) {
  return useQuery(
    api.tasks.getUnifiedTasks,
    farmId ? { farmId, date } : "skip",
  );
}

/**
 * Promote a recommendation to a real task.
 */
export function usePromoteRecommendation() {
  return useMutation(api.tasks.promoteRecommendation);
}

/**
 * Skip a task with optional reason.
 */
export function useSkipTask() {
  return useMutation(api.tasks.skipTask);
}

/**
 * Complete a task (with timestamp + recommendation sync).
 */
export function useCompleteTask() {
  return useMutation(api.tasks.completeTask);
}

// ---------------------------------------------------------------------------
// Derived progress hook
// ---------------------------------------------------------------------------

export type DailyProgress = {
  total: number;
  completed: number;
  skipped: number;
  pending: number;
  completedPercent: number;
  remainingEffortMinutes: number;
  urgentCount: number;
};

/**
 * Compute today's progress stats from the unified task list.
 * Only counts "task" kind items (not unaccepted recommendations).
 */
export function useDailyProgress(
  unifiedItems:
    | Array<{
        kind: string;
        status?: string;
        priority?: string;
        effortMinutes?: number;
        dueDate?: string;
        completed?: boolean;
      }>
    | undefined,
): DailyProgress | undefined {
  if (!unifiedItems) return undefined;

  const today = new Date().toISOString().split("T")[0]!;

  // Only count actual tasks (not unaccepted recommendations), and only those due today or overdue
  const todayTasks = unifiedItems.filter(
    (item) =>
      item.kind === "task" &&
      item.dueDate &&
      item.dueDate <= today,
  );

  const completed = todayTasks.filter(
    (t) => t.status === "completed" || t.completed,
  ).length;
  const skipped = todayTasks.filter((t) => t.status === "skipped").length;
  const pending = todayTasks.length - completed - skipped;
  const total = todayTasks.length;

  const remainingEffortMinutes = todayTasks
    .filter(
      (t) => t.status !== "completed" && t.status !== "skipped" && !t.completed,
    )
    .reduce((sum, t) => sum + (t.effortMinutes ?? 0), 0);

  const urgentCount = todayTasks.filter(
    (t) =>
      t.priority === "urgent" &&
      t.status !== "completed" &&
      t.status !== "skipped" &&
      !t.completed,
  ).length;

  return {
    total,
    completed,
    skipped,
    pending,
    completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    remainingEffortMinutes,
    urgentCount,
  };
}
