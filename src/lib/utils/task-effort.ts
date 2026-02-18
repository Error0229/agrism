import type { Task, TaskDifficulty, TaskType } from "@/lib/types";

export interface TaskEffortPreset {
  effortMinutes: number;
  difficulty: TaskDifficulty;
  requiredTools: string[];
}

const TASK_EFFORT_PRESETS: Record<TaskType, TaskEffortPreset> = {
  播種: { effortMinutes: 45, difficulty: "medium", requiredTools: ["手鏟"] },
  施肥: { effortMinutes: 30, difficulty: "low", requiredTools: ["施肥器"] },
  澆水: { effortMinutes: 20, difficulty: "low", requiredTools: ["水管"] },
  剪枝: { effortMinutes: 35, difficulty: "medium", requiredTools: ["剪刀"] },
  收成: { effortMinutes: 60, difficulty: "medium", requiredTools: ["採收籃"] },
  防颱: { effortMinutes: 90, difficulty: "high", requiredTools: ["綁繩", "支架"] },
  病蟲害防治: { effortMinutes: 50, difficulty: "medium", requiredTools: ["噴霧器"] },
};

const difficultySet = new Set<TaskDifficulty>(["low", "medium", "high"]);

export function getTaskEffortPreset(type: TaskType): TaskEffortPreset {
  return TASK_EFFORT_PRESETS[type];
}

export function normalizeTaskEffort(task: Task): Task {
  const preset = getTaskEffortPreset(task.type);
  const effortMinutes = Number.isFinite(task.effortMinutes) && (task.effortMinutes ?? 0) > 0
    ? Math.min(480, Math.max(5, Number(task.effortMinutes)))
    : preset.effortMinutes;
  const difficulty = difficultySet.has(task.difficulty as TaskDifficulty) ? task.difficulty! : preset.difficulty;
  const requiredTools = Array.isArray(task.requiredTools)
    ? task.requiredTools.map((tool) => String(tool).trim()).filter(Boolean)
    : preset.requiredTools;

  return {
    ...task,
    effortMinutes,
    difficulty,
    requiredTools,
  };
}

export function parseToolList(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
