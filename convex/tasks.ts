import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";
import { Id } from "./_generated/dataModel";
import { TASK_PRESETS } from "./_taskPresets";

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
    // Unified Task Hub fields (issue #108)
    source: v.optional(v.union(
      v.literal("manual"),
      v.literal("ai_briefing"),
      v.literal("weather"),
      v.literal("auto_rule"),
      v.literal("calendar"),
    )),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
    )),
    priority: v.optional(v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("normal"),
      v.literal("low"),
    )),
    aiReasoning: v.optional(v.string()),
    linkedRecommendationId: v.optional(v.id("recommendations")),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    return ctx.db.insert("tasks", {
      ...args,
      completed: args.completed ?? false,
      source: args.source ?? "manual",
      status: args.status ?? "pending",
      priority: args.priority ?? "normal",
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
    // Unified Task Hub fields (issue #108)
    source: v.optional(v.union(
      v.literal("manual"),
      v.literal("ai_briefing"),
      v.literal("weather"),
      v.literal("auto_rule"),
      v.literal("calendar"),
    )),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
    )),
    priority: v.optional(v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("normal"),
      v.literal("low"),
    )),
    aiReasoning: v.optional(v.string()),
    linkedRecommendationId: v.optional(v.id("recommendations")),
    skippedReason: v.optional(v.string()),
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

    const nowCompleting = !task.completed;
    const patch: Record<string, unknown> = {
      completed: nowCompleting,
    };

    if (nowCompleting) {
      patch.status = "completed";
      patch.completedAt = Date.now();
    } else {
      // Un-completing: revert to pending
      patch.status = "pending";
      patch.completedAt = undefined;
    }

    await ctx.db.patch(args.taskId, patch);

    // Sync to linked recommendation if completing
    if (nowCompleting && task.linkedRecommendationId) {
      const rec = await ctx.db.get(task.linkedRecommendationId);
      if (rec) {
        await ctx.db.patch(task.linkedRecommendationId, { status: "completed" });
      }
    }
    // Sync to linked recommendation if un-completing
    if (!nowCompleting && task.linkedRecommendationId) {
      const rec = await ctx.db.get(task.linkedRecommendationId);
      if (rec && rec.status === "completed") {
        await ctx.db.patch(task.linkedRecommendationId, { status: "accepted" });
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Unified Task Hub (issue #108)
// ---------------------------------------------------------------------------

/**
 * Priority sort order for unified task sorting.
 */
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Map recommendation priority to task priority.
 */
function recPriorityToTaskPriority(
  recPriority: "high" | "medium" | "low"
): "urgent" | "high" | "normal" | "low" {
  switch (recPriority) {
    case "high":
      return "high";
    case "medium":
      return "normal";
    case "low":
      return "low";
  }
}

/**
 * Unified query that fetches all tasks + pending recommendations for a farm,
 * grouped and sorted by priority/urgency.
 */
export const getUnifiedTasks = query({
  args: {
    farmId: v.id("farms"),
    date: v.string(), // caller must provide today's date (deterministic)
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    const today = args.date;

    // Fetch only non-completed tasks (pending, in_progress) for the farm
    const incompleteTasks = await ctx.db
      .query("tasks")
      .withIndex("by_farmId_completed", (q) =>
        q.eq("farmId", args.farmId).eq("completed", false)
      )
      .take(500);

    // Fetch recently completed tasks (completed === true), take latest 100
    // for "completed today" display
    const recentCompletedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_farmId_completed", (q) =>
        q.eq("farmId", args.farmId).eq("completed", true)
      )
      .order("desc")
      .take(100);

    // Only keep completed tasks from the last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const completedToday = recentCompletedTasks.filter(
      (t) => (t.completedAt ?? t._creationTime) >= oneDayAgo
    );

    const allTasks = [...incompleteTasks, ...completedToday];

    // Fetch pending recommendations not yet converted to tasks
    const [newRecs, acceptedRecs] = await Promise.all([
      ctx.db
        .query("recommendations")
        .withIndex("by_farmId_status", (q) =>
          q.eq("farmId", args.farmId).eq("status", "new")
        )
        .take(200),
      ctx.db
        .query("recommendations")
        .withIndex("by_farmId_status", (q) =>
          q.eq("farmId", args.farmId).eq("status", "accepted")
        )
        .take(200),
    ]);

    // Gather IDs of recommendations already linked to tasks
    const linkedRecIds = new Set(
      allTasks
        .filter((t) => t.linkedRecommendationId)
        .map((t) => t.linkedRecommendationId as string)
    );

    // Filter out expired and already-linked recommendations
    // Derive "now" from the caller-provided date to keep the query deterministic
    const nowFromDate = new Date(today + "T23:59:59Z").getTime();
    const unlinkedRecs = [...newRecs, ...acceptedRecs].filter(
      (r) =>
        !linkedRecIds.has(r._id as string) &&
        (!r.expiresAt || r.expiresAt > nowFromDate)
    );

    // Build unified items from tasks
    type UnifiedTask = {
      kind: "task";
      _id: Id<"tasks">;
      type: string;
      title: string;
      source: string;
      status: string;
      priority: string;
      dueDate?: string;
      completed: boolean;
      cropId?: Id<"crops">;
      fieldId?: Id<"fields">;
      plantedCropId?: Id<"plantedCrops">;
      aiReasoning?: string;
      linkedRecommendationId?: Id<"recommendations">;
      effortMinutes?: number;
      difficulty?: string;
      requiredTools?: string[];
      completedAt?: number;
      skippedReason?: string;
      sortKey: number;
    };

    type UnifiedRecommendation = {
      kind: "recommendation";
      _id: Id<"recommendations">;
      type: string;
      title: string;
      summary: string;
      recommendedAction: string;
      priority: string;
      confidence: string;
      reasoning: string;
      sourceSignals: string[];
      status: string;
      relatedCropId?: Id<"crops">;
      relatedFieldId?: Id<"fields">;
      relatedPlantedCropId?: Id<"plantedCrops">;
      createdAt: number;
      sortKey: number;
    };

    type UnifiedItem = UnifiedTask | UnifiedRecommendation;

    const items: UnifiedItem[] = [];

    // Map tasks to unified items
    for (const task of allTasks) {
      const taskPriority = task.priority ?? "normal";
      const taskStatus = task.status ?? (task.completed ? "completed" : "pending");

      // Calculate sort key:
      // 1) Priority bucket (urgent=0, high=1, normal=2, low=3) * 1000
      // 2) Overdue tasks get a bonus of -500
      // 3) Today's tasks get a bonus of -100
      let sortKey = (PRIORITY_ORDER[taskPriority] ?? 2) * 1000;
      if (task.dueDate) {
        if (task.dueDate < today) sortKey -= 500; // overdue
        else if (task.dueDate === today) sortKey -= 100; // due today
      }

      items.push({
        kind: "task",
        _id: task._id,
        type: task.type,
        title: task.title,
        source: task.source ?? "manual",
        status: taskStatus,
        priority: taskPriority,
        dueDate: task.dueDate,
        completed: task.completed,
        cropId: task.cropId,
        fieldId: task.fieldId,
        plantedCropId: task.plantedCropId,
        aiReasoning: task.aiReasoning,
        linkedRecommendationId: task.linkedRecommendationId,
        effortMinutes: task.effortMinutes,
        difficulty: task.difficulty,
        requiredTools: task.requiredTools,
        completedAt: task.completedAt,
        skippedReason: task.skippedReason,
        sortKey,
      });
    }

    // Map unlinked recommendations to unified items
    for (const rec of unlinkedRecs) {
      const mappedPriority = recPriorityToTaskPriority(rec.priority);
      // Recommendations sort after same-priority tasks (add 500 offset)
      const sortKey = (PRIORITY_ORDER[mappedPriority] ?? 2) * 1000 + 500;

      items.push({
        kind: "recommendation",
        _id: rec._id,
        type: rec.type,
        title: rec.title,
        summary: rec.summary,
        recommendedAction: rec.recommendedAction,
        priority: mappedPriority,
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        sourceSignals: rec.sourceSignals,
        status: rec.status,
        relatedCropId: rec.relatedCropId,
        relatedFieldId: rec.relatedFieldId,
        relatedPlantedCropId: rec.relatedPlantedCropId,
        createdAt: rec.createdAt,
        sortKey,
      });
    }

    // Sort: lower sortKey first
    items.sort((a, b) => a.sortKey - b.sortKey);

    return items;
  },
});

/**
 * Promote a recommendation to a task.
 * Creates a new task with source="ai_briefing", links back to the recommendation,
 * and marks the recommendation as "accepted".
 */
export const promoteRecommendation = mutation({
  args: {
    recommendationId: v.id("recommendations"),
    dueDate: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("normal"),
      v.literal("low"),
    )),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db.get(args.recommendationId);
    if (!rec) throw new Error("找不到建議");
    await requireFarmMembership(ctx, rec.farmId);

    // Map recommendation type to task type
    type RecommendationType = "care" | "harvest" | "weather" | "planning" | "pest" | "general";
    type TaskType = "seeding" | "fertilizing" | "watering" | "pruning" | "harvesting" | "typhoon_prep" | "pest_control" | "general";
    const typeMap: Record<RecommendationType, TaskType> = {
      care: "general",
      harvest: "harvesting",
      weather: "typhoon_prep",
      planning: "general",
      pest: "pest_control",
      general: "general",
    };
    const taskType: TaskType = typeMap[rec.type as RecommendationType] ?? "general";

    // Map recommendation priority to task priority
    const taskPriority = args.priority ?? recPriorityToTaskPriority(rec.priority);

    // Determine due date: use provided, or default to today
    const dueDate = args.dueDate ?? new Date().toISOString().split("T")[0]!;

    const taskId = await ctx.db.insert("tasks", {
      farmId: rec.farmId,
      type: taskType,
      title: rec.title,
      cropId: rec.relatedCropId,
      fieldId: rec.relatedFieldId,
      plantedCropId: rec.relatedPlantedCropId,
      dueDate,
      completed: false,
      source: "ai_briefing",
      status: "pending",
      priority: taskPriority,
      aiReasoning: rec.reasoning,
      linkedRecommendationId: args.recommendationId,
    });

    // Mark recommendation as accepted
    await ctx.db.patch(args.recommendationId, { status: "accepted" });

    return taskId;
  },
});

/**
 * Skip a task with an optional reason.
 * Syncs back to the linked recommendation if one exists.
 */
export const skipTask = mutation({
  args: {
    taskId: v.id("tasks"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("找不到任務");
    await requireFarmMembership(ctx, task.farmId);

    await ctx.db.patch(args.taskId, {
      status: "skipped",
      completed: false,
      skippedReason: args.reason,
    });

    // Sync to linked recommendation
    if (task.linkedRecommendationId) {
      const rec = await ctx.db.get(task.linkedRecommendationId);
      if (rec) {
        await ctx.db.patch(task.linkedRecommendationId, {
          status: "dismissed",
          dismissReason: args.reason ?? "任務已跳過",
        });
      }
    }
  },
});

/**
 * Enhanced complete: sets completedAt timestamp and syncs to recommendation.
 */
export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("找不到任務");
    await requireFarmMembership(ctx, task.farmId);

    await ctx.db.patch(args.taskId, {
      completed: true,
      status: "completed",
      completedAt: Date.now(),
    });

    // Sync to linked recommendation
    if (task.linkedRecommendationId) {
      const rec = await ctx.db.get(task.linkedRecommendationId);
      if (rec) {
        await ctx.db.patch(task.linkedRecommendationId, { status: "completed" });
      }
    }
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
      fertilizerFrequencyDays: v.optional(v.number()),
      pruningRequired: v.optional(v.boolean()),
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
        title: `${name} - 播種`,
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

    // 2. Fertilizing — every fertilizerFrequencyDays until harvest
    if (cropData.fertilizerFrequencyDays && cropData.fertilizerFrequencyDays > 0) {
      const fertPreset = preset("fertilizing");
      const interval = cropData.fertilizerFrequencyDays;
      let fertDate = new Date(plantDate);
      fertDate.setDate(fertDate.getDate() + interval);

      while (fertDate <= harvestDate) {
        taskIds.push(
          await ctx.db.insert("tasks", {
            farmId,
            type: "fertilizing",
            title: `${name} - 施肥`,
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

    // 3. Pruning — every 30 days in pruning months if pruningRequired
    if (cropData.pruningRequired && cropData.pruningMonths?.length) {
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
              title: `${name} - 剪枝`,
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
        title: `${name} - 收成`,
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
          title: `${name} - 防颱`,
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
