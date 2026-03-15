// ---------------------------------------------------------------------------
// Task effort/difficulty/tools presets (shared across tasks.ts and dailyTaskGeneration.ts)
// ---------------------------------------------------------------------------

export type TaskPreset = {
  effortMinutes: number;
  difficulty: string;
  requiredTools: string[];
};

export const TASK_PRESETS: Record<string, TaskPreset> = {
  seeding: { effortMinutes: 45, difficulty: "medium", requiredTools: ["手鏟"] },
  fertilizing: {
    effortMinutes: 30,
    difficulty: "low",
    requiredTools: ["施肥器"],
  },
  watering: { effortMinutes: 20, difficulty: "low", requiredTools: ["水管"] },
  pruning: { effortMinutes: 35, difficulty: "medium", requiredTools: ["剪刀"] },
  harvesting: {
    effortMinutes: 60,
    difficulty: "medium",
    requiredTools: ["採收籃"],
  },
  typhoon_prep: {
    effortMinutes: 90,
    difficulty: "high",
    requiredTools: ["綁繩", "支架"],
  },
  pest_control: {
    effortMinutes: 50,
    difficulty: "medium",
    requiredTools: ["噴霧器"],
  },
};
