import { addDays, differenceInCalendarDays, isBefore } from "date-fns";
import type { Crop, Task } from "@/lib/types";

export interface PrioritizedTask {
  task: Task;
  score: number;
  reasons: string[];
}

const TASK_IMPACT: Record<Task["type"], number> = {
  收成: 32,
  防颱: 30,
  病蟲害防治: 28,
  澆水: 24,
  施肥: 18,
  播種: 16,
  剪枝: 14,
};

function getUrgencyScore(task: Task, now: Date) {
  const dueDate = new Date(task.dueDate);
  const daysUntilDue = differenceInCalendarDays(dueDate, now);

  if (daysUntilDue < 0) return 50;
  if (daysUntilDue === 0) return 42;
  if (daysUntilDue <= 2) return 30;
  if (daysUntilDue <= 4) return 18;
  return 8;
}

function getRiskScore(task: Task, crop: Crop | undefined, now: Date) {
  let score = 0;

  if (isBefore(new Date(task.dueDate), now)) {
    score += 18;
  }

  if (task.type === "收成" && crop?.growthDays && crop.growthDays > 120) {
    score += 8;
  }

  if (task.type === "防颱" && crop?.typhoonResistance === "低") {
    score += 10;
  }

  if (task.type === "病蟲害防治") {
    score += crop?.pestSusceptibility === "高" ? 10 : crop?.pestSusceptibility === "中" ? 6 : 3;
  }

  return score;
}

function buildReasons(task: Task, crop: Crop | undefined, now: Date) {
  const reasons: string[] = [];
  const daysUntilDue = differenceInCalendarDays(new Date(task.dueDate), now);

  if (daysUntilDue < 0) reasons.push("已逾期");
  else if (daysUntilDue === 0) reasons.push("今日到期");
  else if (daysUntilDue <= 2) reasons.push("近期到期");

  if (task.type === "收成") reasons.push("影響收成品質");
  if (task.type === "防颱") reasons.push("降低天候損失風險");
  if (task.type === "病蟲害防治") reasons.push("降低病蟲害擴散風險");
  if (task.type === "澆水") reasons.push("維持作物生長穩定");

  if (crop?.typhoonResistance === "低" && task.type === "防颱") reasons.push("作物抗風性較低");
  if (crop?.pestSusceptibility === "高" && task.type === "病蟲害防治") reasons.push("作物病蟲害敏感度高");

  return reasons.slice(0, 3);
}

export function prioritizeWeeklyTasks(tasks: Task[], crops: Crop[], now = new Date()): PrioritizedTask[] {
  const cropById = new Map(crops.map((crop) => [crop.id, crop]));
  const weekEnd = addDays(now, 7);

  return tasks
    .filter((task) => !task.completed)
    .filter((task) => {
      const dueDate = new Date(task.dueDate);
      return dueDate <= weekEnd;
    })
    .map((task) => {
      const crop = cropById.get(task.cropId);
      const score = getUrgencyScore(task, now) + (TASK_IMPACT[task.type] ?? 10) + getRiskScore(task, crop, now);
      return {
        task,
        score,
        reasons: buildReasons(task, crop, now),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dueDiff = new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime();
      if (dueDiff !== 0) return dueDiff;
      return a.task.id.localeCompare(b.task.id);
    });
}

