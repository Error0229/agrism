import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import type { Task } from "@/lib/types";
import { normalizeTaskEffort } from "@/lib/utils/task-effort";

export interface WorkloadForecastConfig {
  now?: Date;
  horizonDays?: number;
  dailyCapacityMinutes?: number;
  includeOverdueInToday?: boolean;
}

export interface WorkloadForecastDay {
  date: string;
  totalMinutes: number;
  taskCount: number;
  utilizationPct: number;
}

export interface WorkloadBottleneckWarning {
  date: string;
  totalMinutes: number;
  capacityMinutes: number;
  overloadMinutes: number;
  taskCount: number;
}

export interface WorkloadForecast {
  days: WorkloadForecastDay[];
  warnings: WorkloadBottleneckWarning[];
  totalMinutes: number;
  capacityMinutes: number;
}

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export function forecastWorkload(tasks: Task[], config?: WorkloadForecastConfig): WorkloadForecast {
  const now = startOfDay(config?.now ?? new Date());
  const horizonDays = config?.horizonDays ?? 7;
  const dailyCapacityMinutes = config?.dailyCapacityMinutes ?? 180;
  const includeOverdueInToday = config?.includeOverdueInToday ?? true;
  const horizonEnd = addDays(now, horizonDays - 1);

  const days: WorkloadForecastDay[] = [];
  const dayIndexByKey = new Map<string, number>();

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = addDays(now, offset);
    const date = toDateKey(day);
    dayIndexByKey.set(date, offset);
    days.push({
      date,
      totalMinutes: 0,
      taskCount: 0,
      utilizationPct: 0,
    });
  }

  for (const rawTask of tasks) {
    if (rawTask.completed) continue;
    const task = normalizeTaskEffort(rawTask);
    const due = startOfDay(new Date(task.dueDate));
    if (Number.isNaN(due.getTime())) continue;

    let bucketDate = due;
    if (due < now) {
      if (!includeOverdueInToday) continue;
      bucketDate = now;
    }
    if (bucketDate > horizonEnd) continue;

    const key = toDateKey(bucketDate);
    const idx = dayIndexByKey.get(key);
    if (idx === undefined) continue;

    days[idx].totalMinutes += task.effortMinutes ?? 0;
    days[idx].taskCount += 1;
  }

  for (const day of days) {
    day.utilizationPct = Math.round((day.totalMinutes / dailyCapacityMinutes) * 100);
  }

  const warnings = days
    .filter((day) => day.totalMinutes > dailyCapacityMinutes)
    .map((day) => ({
      date: day.date,
      totalMinutes: day.totalMinutes,
      capacityMinutes: dailyCapacityMinutes,
      overloadMinutes: day.totalMinutes - dailyCapacityMinutes,
      taskCount: day.taskCount,
    }))
    .sort((a, b) => b.overloadMinutes - a.overloadMinutes || a.date.localeCompare(b.date));

  const totalMinutes = days.reduce((sum, day) => sum + day.totalMinutes, 0);
  const capacityMinutes = horizonDays * dailyCapacityMinutes;

  return {
    days,
    warnings,
    totalMinutes,
    capacityMinutes,
  };
}

export function getTaskEffortSource(task: Task): "user" | "default" {
  return Number.isFinite(task.effortMinutes) && (task.effortMinutes ?? 0) > 0 ? "user" : "default";
}

export function getWorkloadLeadDays(forecast: WorkloadForecast): number {
  const firstBusyDay = forecast.days.find((day) => day.totalMinutes > 0);
  if (!firstBusyDay) return -1;
  const today = startOfDay(new Date());
  return differenceInCalendarDays(new Date(`${firstBusyDay.date}T00:00:00.000Z`), today);
}
