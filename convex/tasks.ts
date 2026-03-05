import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Task effort/difficulty/tools presets
// ---------------------------------------------------------------------------

type TaskPreset = {
  effortMinutes: number;
  difficulty: string;
  requiredTools: string[];
};

const TASK_PRESETS: Record<string, TaskPreset> = {
  seeding: { effortMinutes: 45, difficulty: "medium", requiredTools: ["手鏟"] },
  fertilizing: { effortMinutes: 30, difficulty: "low", requiredTools: ["施肥器"] },
  watering: { effortMinutes: 20, difficulty: "low", requiredTools: ["水管"] },
  pruning: { effortMinutes: 35, difficulty: "medium", requiredTools: ["剪刀"] },
  harvesting: { effortMinutes: 60, difficulty: "medium", requiredTools: ["採收籃"] },
  typhoon_prep: { effortMinutes: 90, difficulty: "high", requiredTools: ["綁繩", "支架"] },
  pest_control: { effortMinutes: 50, difficulty: "medium", requiredTools: ["噴霧器"] },
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    farmId: v.id("farms"),
    fieldId: v.optional(v.id("fields")),
    cropId: v.optional(v.id("crops")),
    completed: v.optional(v.boolean()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    let results = await ctx.db
      .query("tasks")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .collect();

    if (args.fieldId !== undefined) {
      results = results.filter((t) => t.fieldId === args.fieldId);
    }
    if (args.cropId !== undefined) {
      results = results.filter((t) => t.cropId === args.cropId);
    }
    if (args.completed !== undefined) {
      results = results.filter((t) => t.completed === args.completed);
    }
    if (args.dateFrom !== undefined) {
      results = results.filter((t) => t.dueDate && t.dueDate >= args.dateFrom!);
    }
    if (args.dateTo !== undefined) {
      results = results.filter((t) => t.dueDate && t.dueDate <= args.dateTo!);
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    type: v.string(),
    title: v.string(),
    cropId: v.optional(v.id("crops")),
    plantedCropId: v.optional(v.id("plantedCrops")),
    fieldId: v.optional(v.id("fields")),
    dueDate: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    effortMinutes: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    requiredTools: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    return ctx.db.insert("tasks", {
      ...args,
      completed: args.completed ?? false,
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    type: v.optional(v.string()),
    title: v.optional(v.string()),
    cropId: v.optional(v.id("crops")),
    plantedCropId: v.optional(v.id("plantedCrops")),
    fieldId: v.optional(v.id("fields")),
    dueDate: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    effortMinutes: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    requiredTools: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("找不到任務");
    await requireFarmMembership(ctx, task.farmId);
    const { taskId, ...patch } = args;
    // Remove undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(taskId, updates);
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("找不到任務");
    await requireFarmMembership(ctx, task.farmId);
    await ctx.db.delete(args.taskId);
  },
});

export const toggleComplete = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("找不到任務");
    await requireFarmMembership(ctx, task.farmId);
    await ctx.db.patch(args.taskId, { completed: !task.completed });
  },
});

// ---------------------------------------------------------------------------
// Auto-generation
// ---------------------------------------------------------------------------

export const generateForPlantedCrop = mutation({
  args: {
    farmId: v.id("farms"),
    cropData: v.object({
      id: v.id("crops"),
      name: v.string(),
      emoji: v.optional(v.string()),
      category: v.string(),
      growthDays: v.optional(v.number()),
      fertilizerIntervalDays: v.optional(v.number()),
      needsPruning: v.optional(v.boolean()),
      pruningMonths: v.optional(v.array(v.number())),
    }),
    plantedCropData: v.object({
      id: v.id("plantedCrops"),
      fieldId: v.id("fields"),
      plantedDate: v.string(),
      customGrowthDays: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    const { farmId, cropData, plantedCropData } = args;

    // Skip infrastructure crops
    if (cropData.category === "other") return [];

    const plantDate = new Date(plantedCropData.plantedDate);
    const growthDays = plantedCropData.customGrowthDays ?? cropData.growthDays ?? 90;
    const harvestDate = new Date(plantDate);
    harvestDate.setDate(harvestDate.getDate() + growthDays);

    const emoji = cropData.emoji ?? "";
    const name = cropData.name;
    const fmt = (d: Date) => d.toISOString().split("T")[0]!;
    const preset = (type: string) => TASK_PRESETS[type]!;

    const taskIds: Id<"tasks">[] = [];

    // 1. Seeding
    const seedingPreset = preset("seeding");
    taskIds.push(
      await ctx.db.insert("tasks", {
        farmId,
        type: "seeding",
        title: `${emoji} ${name} - 播種`,
        cropId: cropData.id,
        plantedCropId: plantedCropData.id,
        fieldId: plantedCropData.fieldId,
        dueDate: fmt(plantDate),
        completed: false,
        effortMinutes: seedingPreset.effortMinutes,
        difficulty: seedingPreset.difficulty,
        requiredTools: seedingPreset.requiredTools,
      })
    );

    // 2. Fertilizing — every fertilizerIntervalDays until harvest
    if (cropData.fertilizerIntervalDays && cropData.fertilizerIntervalDays > 0) {
      const fertPreset = preset("fertilizing");
      const interval = cropData.fertilizerIntervalDays;
      let fertDate = new Date(plantDate);
      fertDate.setDate(fertDate.getDate() + interval);

      while (fertDate <= harvestDate) {
        taskIds.push(
          await ctx.db.insert("tasks", {
            farmId,
            type: "fertilizing",
            title: `${emoji} ${name} - 施肥`,
            cropId: cropData.id,
            plantedCropId: plantedCropData.id,
            fieldId: plantedCropData.fieldId,
            dueDate: fmt(fertDate),
            completed: false,
            effortMinutes: fertPreset.effortMinutes,
            difficulty: fertPreset.difficulty,
            requiredTools: fertPreset.requiredTools,
          })
        );
        fertDate = new Date(fertDate);
        fertDate.setDate(fertDate.getDate() + interval);
      }
    }

    // 3. Pruning — every 30 days in pruning months if needsPruning
    if (cropData.needsPruning && cropData.pruningMonths?.length) {
      const prunePreset = preset("pruning");
      const pruningMonthSet = new Set(cropData.pruningMonths);
      let pruneDate = new Date(plantDate);
      pruneDate.setDate(pruneDate.getDate() + 30);

      while (pruneDate <= harvestDate) {
        const month = pruneDate.getMonth() + 1;
        if (pruningMonthSet.has(month)) {
          taskIds.push(
            await ctx.db.insert("tasks", {
              farmId,
              type: "pruning",
              title: `${emoji} ${name} - 剪枝`,
              cropId: cropData.id,
              plantedCropId: plantedCropData.id,
              fieldId: plantedCropData.fieldId,
              dueDate: fmt(pruneDate),
              completed: false,
              effortMinutes: prunePreset.effortMinutes,
              difficulty: prunePreset.difficulty,
              requiredTools: prunePreset.requiredTools,
            })
          );
        }
        pruneDate = new Date(pruneDate);
        pruneDate.setDate(pruneDate.getDate() + 30);
      }
    }

    // 4. Harvesting — always, due on plantDate + growthDays
    const harvestPreset = preset("harvesting");
    taskIds.push(
      await ctx.db.insert("tasks", {
        farmId,
        type: "harvesting",
        title: `${emoji} ${name} - 收成`,
        cropId: cropData.id,
        plantedCropId: plantedCropData.id,
        fieldId: plantedCropData.fieldId,
        dueDate: fmt(harvestDate),
        completed: false,
        effortMinutes: harvestPreset.effortMinutes,
        difficulty: harvestPreset.difficulty,
        requiredTools: harvestPreset.requiredTools,
      })
    );

    // 5. Typhoon prep — first month in Jun-Oct during growth period
    const typhoonPreset = preset("typhoon_prep");
    const typhoonMonths = [6, 7, 8, 9, 10];
    let typhoonDate: Date | null = null;

    for (const month of typhoonMonths) {
      for (
        let year = plantDate.getFullYear();
        year <= harvestDate.getFullYear();
        year++
      ) {
        const candidate = new Date(year, month - 1, 1);
        if (candidate >= plantDate && candidate <= harvestDate) {
          typhoonDate = candidate;
          break;
        }
      }
      if (typhoonDate) break;
    }

    if (typhoonDate) {
      taskIds.push(
        await ctx.db.insert("tasks", {
          farmId,
          type: "typhoon_prep",
          title: `${emoji} ${name} - 防颱`,
          cropId: cropData.id,
          plantedCropId: plantedCropData.id,
          fieldId: plantedCropData.fieldId,
          dueDate: fmt(typhoonDate),
          completed: false,
          effortMinutes: typhoonPreset.effortMinutes,
          difficulty: typhoonPreset.difficulty,
          requiredTools: typhoonPreset.requiredTools,
        })
      );
    }

    return taskIds;
  },
});

export const removeByPlantedCrop = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, args) => {
    const pc = await ctx.db.get(args.plantedCropId);
    if (!pc) return;
    const field = await ctx.db.get(pc.fieldId);
    if (!field) return;
    await requireFarmMembership(ctx, field.farmId);

    // Use by_farmId index instead of full table scan, then filter in memory
    const farmTasks = await ctx.db
      .query("tasks")
      .withIndex("by_farmId", (q) => q.eq("farmId", field.farmId))
      .collect();
    const toDelete = farmTasks.filter((t) => t.plantedCropId === args.plantedCropId);
    for (const task of toDelete) {
      await ctx.db.delete(task._id);
    }
  },
});
