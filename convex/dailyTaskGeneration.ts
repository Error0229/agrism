import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";
import { Doc, Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Task effort/difficulty/tools presets (mirrored from tasks.ts)
// ---------------------------------------------------------------------------

type TaskPreset = {
  effortMinutes: number;
  difficulty: string;
  requiredTools: string[];
};

const TASK_PRESETS: Record<string, TaskPreset> = {
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

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getTodayISO(): string {
  const now = new Date();
  return now.toISOString().split("T")[0]!;
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1).getTime();
  const d2 = new Date(dateStr2).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1; // 1-12
}

function getStartOfCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const next = new Date(now);
  next.setDate(next.getDate() + daysUntilMonday);
  return next.toISOString().split("T")[0]!;
}

function timestampToISO(ts: number): string {
  return new Date(ts).toISOString().split("T")[0]!;
}

// ---------------------------------------------------------------------------
// Types for generated task candidates
// ---------------------------------------------------------------------------

type TaskCandidate = {
  type: string;
  title: string;
  cropId?: Id<"crops">;
  plantedCropId?: Id<"plantedCrops">;
  fieldId?: Id<"fields">;
  dueDate: string;
  planId?: Id<"plannedPlantings">;
};

// ---------------------------------------------------------------------------
// Data types for rule inputs
// ---------------------------------------------------------------------------

type GrowingCropInfo = {
  plantedCrop: Doc<"plantedCrops">;
  crop: Doc<"crops"> | null;
  fieldId: Id<"fields">;
};

// ---------------------------------------------------------------------------
// Rule 1: Watering needs
// ---------------------------------------------------------------------------

function checkWateringNeeds(
  growingCrops: GrowingCropInfo[],
  irrigationZones: Doc<"irrigationZones">[],
  recentWeatherLogs: Doc<"weatherLogs">[],
  today: string
): TaskCandidate[] {
  const candidates: TaskCandidate[] = [];

  // Check if significant rain in the last 2 days
  const hasRecentRain = recentWeatherLogs.some((log) => {
    const daysAgo = daysBetween(log.date, today);
    return daysAgo >= 0 && daysAgo <= 2 && (log.rainfallMm ?? 0) > 10;
  });

  for (const { plantedCrop, crop, fieldId } of growingCrops) {
    if (!crop || !crop.water) continue;

    // Determine watering frequency threshold in days
    let maxDaysWithout: number;
    switch (crop.water) {
      case "high":
        maxDaysWithout = 2;
        break;
      case "moderate":
        maxDaysWithout = 3;
        break;
      case "low":
        maxDaysWithout = 5;
        break;
      default:
        continue;
    }

    // Skip if recent rain
    if (hasRecentRain) continue;

    // Check irrigation zone watering status for this planted crop
    // Find zones linked to this planted crop's field
    const fieldZones = irrigationZones.filter(
      (z) => z.fieldId === fieldId
    );

    // Check if any zone covering this crop was recently watered
    let wasRecentlyWatered = false;
    if (fieldZones.length > 0) {
      for (const zone of fieldZones) {
        // Check if this zone covers the planted crop (by linkedRegionIds matching plantedCrop name)
        const coversThisCrop =
          !zone.linkedRegionIds ||
          zone.linkedRegionIds.length === 0 ||
          (plantedCrop.name &&
            zone.linkedRegionIds.includes(plantedCrop.name)) ||
          zone.linkedRegionIds.includes(plantedCrop._id as string);

        if (coversThisCrop && zone.lastWateredAt) {
          const lastWateredDate = timestampToISO(zone.lastWateredAt);
          const daysSinceWatered = daysBetween(lastWateredDate, today);
          if (daysSinceWatered < maxDaysWithout) {
            wasRecentlyWatered = true;
            break;
          }
        }
      }
    }

    if (!wasRecentlyWatered) {
      const emoji = crop.emoji || "🌱";
      candidates.push({
        type: "watering",
        title: `${emoji} ${crop.name} 澆水`,
        cropId: crop._id,
        plantedCropId: plantedCrop._id,
        fieldId,
        dueDate: today,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Rule 2: Harvest ready
// ---------------------------------------------------------------------------

function checkHarvestReady(
  growingCrops: GrowingCropInfo[],
  today: string
): TaskCandidate[] {
  const candidates: TaskCandidate[] = [];

  for (const { plantedCrop, crop, fieldId } of growingCrops) {
    if (!crop) continue;

    let estimatedHarvestDate: string | null = null;

    // Use endWindowEarliest (timestamp) if available
    if (plantedCrop.endWindowEarliest) {
      estimatedHarvestDate = timestampToISO(plantedCrop.endWindowEarliest);
    }
    // Otherwise calculate from plantedDate + growth days
    else if (plantedCrop.plantedDate) {
      const growthDays =
        plantedCrop.customGrowthDays ?? crop.growthDays ?? null;
      if (growthDays) {
        const plantDate = new Date(plantedCrop.plantedDate);
        plantDate.setDate(plantDate.getDate() + growthDays);
        estimatedHarvestDate = plantDate.toISOString().split("T")[0]!;
      }
    }

    if (!estimatedHarvestDate) continue;

    const daysUntilHarvest = daysBetween(today, estimatedHarvestDate);

    // Generate task if harvest is within 7 days (including past-due up to 3 days)
    if (daysUntilHarvest >= -3 && daysUntilHarvest <= 7) {
      const emoji = crop.emoji || "🌱";
      candidates.push({
        type: "harvesting",
        title: `${emoji} ${crop.name} 即將可收成`,
        cropId: crop._id,
        plantedCropId: plantedCrop._id,
        fieldId,
        dueDate: estimatedHarvestDate,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Rule 3: Fertilizing schedule
// ---------------------------------------------------------------------------

function checkFertilizingSchedule(
  growingCrops: GrowingCropInfo[],
  existingTasks: Doc<"tasks">[],
  today: string
): TaskCandidate[] {
  const candidates: TaskCandidate[] = [];

  for (const { plantedCrop, crop, fieldId } of growingCrops) {
    if (!crop || !crop.fertilizerFrequencyDays) continue;
    if (crop.fertilizerFrequencyDays <= 0) continue;

    // Find the most recent completed "fertilizing" task for this plantedCropId
    const fertTasks = existingTasks.filter(
      (t) =>
        t.type === "fertilizing" &&
        t.plantedCropId === plantedCrop._id &&
        t.completed === true &&
        t.dueDate
    );

    let lastFertilizeDate: string | null = null;
    if (fertTasks.length > 0) {
      // Sort by dueDate descending to find most recent
      fertTasks.sort((a, b) => (b.dueDate! > a.dueDate! ? 1 : -1));
      lastFertilizeDate = fertTasks[0]!.dueDate!;
    }

    let needsFertilizing = false;
    if (!lastFertilizeDate) {
      // No previous fertilizing task → check if planted long enough ago
      if (plantedCrop.plantedDate) {
        const daysSincePlanting = daysBetween(plantedCrop.plantedDate, today);
        if (daysSincePlanting >= crop.fertilizerFrequencyDays) {
          needsFertilizing = true;
        }
      } else {
        // No planting date known, generate task
        needsFertilizing = true;
      }
    } else {
      const daysSinceLastFert = daysBetween(lastFertilizeDate, today);
      if (daysSinceLastFert >= crop.fertilizerFrequencyDays) {
        needsFertilizing = true;
      }
    }

    if (needsFertilizing) {
      const emoji = crop.emoji || "🌱";
      candidates.push({
        type: "fertilizing",
        title: `${emoji} ${crop.name} 施肥`,
        cropId: crop._id,
        plantedCropId: plantedCrop._id,
        fieldId,
        dueDate: today,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Rule 4: Pest inspection
// ---------------------------------------------------------------------------

function checkPestInspection(
  growingCrops: GrowingCropInfo[],
  existingTasks: Doc<"tasks">[],
  today: string
): TaskCandidate[] {
  const candidates: TaskCandidate[] = [];
  const currentMonth = getCurrentMonth();

  // Warm/wet season (Apr-Oct): inspect every 14 days
  // Cool/dry season (Nov-Mar): inspect every 30 days
  const inspectionIntervalDays =
    currentMonth >= 4 && currentMonth <= 10 ? 14 : 30;

  for (const { plantedCrop, crop, fieldId } of growingCrops) {
    if (!crop) continue;

    // Only inspect crops that have known pests or diseases
    const hasPests =
      (crop.commonPests && crop.commonPests.length > 0) ||
      (crop.commonDiseases && crop.commonDiseases.length > 0);
    if (!hasPests) continue;

    // Find the most recent pest_control task for this plantedCropId
    const pestTasks = existingTasks.filter(
      (t) =>
        t.type === "pest_control" &&
        t.plantedCropId === plantedCrop._id &&
        t.dueDate
    );

    let lastInspectionDate: string | null = null;
    if (pestTasks.length > 0) {
      pestTasks.sort((a, b) => (b.dueDate! > a.dueDate! ? 1 : -1));
      lastInspectionDate = pestTasks[0]!.dueDate!;
    }

    let needsInspection = false;
    if (!lastInspectionDate) {
      // No previous inspection → generate one
      needsInspection = true;
    } else {
      const daysSinceInspection = daysBetween(lastInspectionDate, today);
      if (daysSinceInspection >= inspectionIntervalDays) {
        needsInspection = true;
      }
    }

    if (needsInspection) {
      const emoji = crop.emoji || "🌱";
      candidates.push({
        type: "pest_control",
        title: `${emoji} ${crop.name} 病蟲害巡檢`,
        cropId: crop._id,
        plantedCropId: plantedCrop._id,
        fieldId,
        dueDate: today,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Rule 5: Typhoon prep
// ---------------------------------------------------------------------------

function checkTyphoonPrep(
  growingCrops: GrowingCropInfo[],
  existingTasks: Doc<"tasks">[],
  today: string
): TaskCandidate[] {
  const candidates: TaskCandidate[] = [];
  const currentMonth = getCurrentMonth();

  // Only during typhoon season (Jun-Oct)
  if (currentMonth < 6 || currentMonth > 10) return candidates;

  const startOfMonth = getStartOfCurrentMonth();

  for (const { plantedCrop, crop, fieldId } of growingCrops) {
    if (!crop) continue;

    // Skip typhoon-resistant crops
    if (crop.typhoonResistance === "high") continue;

    // Check if a typhoon_prep task already exists this month for this plantedCropId
    const hasTyphoonTaskThisMonth = existingTasks.some(
      (t) =>
        t.type === "typhoon_prep" &&
        t.plantedCropId === plantedCrop._id &&
        t.dueDate &&
        t.dueDate >= startOfMonth
    );

    if (!hasTyphoonTaskThisMonth) {
      const emoji = crop.emoji || "🌱";
      const dueDate = getNextMonday();
      candidates.push({
        type: "typhoon_prep",
        title: `${emoji} ${crop.name} 防颱準備`,
        cropId: crop._id,
        plantedCropId: plantedCrop._id,
        fieldId,
        dueDate,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Rule 6: Pruning schedule
// ---------------------------------------------------------------------------

function checkPruningSchedule(
  growingCrops: GrowingCropInfo[],
  existingTasks: Doc<"tasks">[],
  today: string
): TaskCandidate[] {
  const candidates: TaskCandidate[] = [];
  const currentMonth = getCurrentMonth();
  const startOfMonth = getStartOfCurrentMonth();

  for (const { plantedCrop, crop, fieldId } of growingCrops) {
    if (!crop) continue;
    if (!crop.pruningRequired) continue;
    if (!crop.pruningMonths || crop.pruningMonths.length === 0) continue;

    // Check if current month is a pruning month
    if (!crop.pruningMonths.includes(currentMonth)) continue;

    // Check if a pruning task already exists this month for this plantedCropId
    const hasPruningTaskThisMonth = existingTasks.some(
      (t) =>
        t.type === "pruning" &&
        t.plantedCropId === plantedCrop._id &&
        t.dueDate &&
        t.dueDate >= startOfMonth
    );

    if (!hasPruningTaskThisMonth) {
      const emoji = crop.emoji || "🌱";
      candidates.push({
        type: "pruning",
        title: `${emoji} ${crop.name} 修剪`,
        cropId: crop._id,
        plantedCropId: plantedCrop._id,
        fieldId,
        dueDate: today,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Rule 7: Succession planting reminders
// ---------------------------------------------------------------------------

function checkSuccessionPlanting(
  plannedPlantings: Doc<"plannedPlantings">[],
  existingTasks: Doc<"tasks">[],
  today: string
): TaskCandidate[] {
  const candidates: TaskCandidate[] = [];

  for (const plan of plannedPlantings) {
    // Only confirmed plans
    if (plan.planningState !== "confirmed") continue;

    // Must have a start window
    if (!plan.startWindowEarliest) continue;

    const daysUntilStart = daysBetween(today, plan.startWindowEarliest);

    // Within 7 days from today (including slightly overdue up to 3 days)
    if (daysUntilStart < -3 || daysUntilStart > 7) continue;

    const cropName = plan.cropName || "作物";

    // Check if a seeding task already exists for this plan
    const hasExistingTask = existingTasks.some(
      (t) =>
        t.type === "seeding" &&
        t.fieldId === plan.fieldId &&
        // Match by title containing crop name (since we don't store planId on tasks)
        t.title.includes(cropName)
    );

    if (!hasExistingTask) {
      candidates.push({
        type: "seeding",
        title: `🌱 ${cropName} 預計種植提醒`,
        cropId: plan.cropId ?? undefined,
        fieldId: plan.fieldId,
        dueDate: plan.startWindowEarliest,
        planId: plan._id,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Duplicate detection helper
// ---------------------------------------------------------------------------

function isDuplicate(
  candidate: TaskCandidate,
  existingTasks: Doc<"tasks">[],
  today: string
): boolean {
  return existingTasks.some((t) => {
    // Match by type
    if (t.type !== candidate.type) return false;

    // For crop-level tasks, match by plantedCropId
    if (candidate.plantedCropId) {
      if (t.plantedCropId !== candidate.plantedCropId) return false;
    }
    // For field-level tasks (e.g., succession planting), match by fieldId + title
    else if (candidate.fieldId) {
      if (t.fieldId !== candidate.fieldId) return false;
      // Also check title similarity for field-level tasks
      if (t.title !== candidate.title) return false;
    }

    // If incomplete task exists → duplicate
    if (!t.completed) return true;

    // If completed today → also skip
    if (t.completed && t.dueDate === today) return true;

    return false;
  });
}

// ---------------------------------------------------------------------------
// Main mutation: generateDailyTasks
// ---------------------------------------------------------------------------

export const generateDailyTasks = mutation({
  args: {
    farmId: v.id("farms"),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    const today = getTodayISO();

    // ----- 1. Fetch all fields for the farm -----
    const fields = await ctx.db
      .query("fields")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .collect();

    if (fields.length === 0) {
      return { generated: 0, skipped: 0, tasks: [] };
    }

    // ----- 2. Fetch all planted crops across all fields -----
    const allPlantedCrops: Doc<"plantedCrops">[] = [];
    for (const field of fields) {
      const fieldCrops = await ctx.db
        .query("plantedCrops")
        .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
        .collect();
      allPlantedCrops.push(...fieldCrops);
    }

    // Filter to status === "growing"
    const growingPlantedCrops = allPlantedCrops.filter(
      (pc) => pc.status === "growing"
    );

    // ----- 3. Batch-fetch crop data (dedup by cropId) -----
    const cropIds = new Set<string>();
    for (const pc of growingPlantedCrops) {
      if (pc.cropId) cropIds.add(pc.cropId as string);
    }

    const cropMap = new Map<string, Doc<"crops">>();
    await Promise.all(
      Array.from(cropIds).map(async (cropId) => {
        const crop = await ctx.db.get(cropId as Id<"crops">);
        if (crop) cropMap.set(cropId, crop);
      })
    );

    // Build GrowingCropInfo array
    const growingCrops: GrowingCropInfo[] = growingPlantedCrops.map((pc) => ({
      plantedCrop: pc,
      crop: pc.cropId ? (cropMap.get(pc.cropId as string) ?? null) : null,
      fieldId: pc.fieldId,
    }));

    // ----- 4. Fetch incomplete tasks for this farm (used for duplicate detection) -----
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_farmId_completed", (q) =>
        q.eq("farmId", args.farmId).eq("completed", false)
      )
      .collect();

    // Also fetch recently completed tasks (today) for dedup of same-day completions
    const completedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_farmId_completed", (q) =>
        q.eq("farmId", args.farmId).eq("completed", true)
      )
      .order("desc")
      .take(100);

    // Merge for duplicate detection
    allTasks.push(...completedTasks);

    // ----- 5. Fetch irrigation zones for the farm -----
    const irrigationZones = await ctx.db
      .query("irrigationZones")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .collect();

    // ----- 6. Fetch recent weather logs (last 7 days) using date index -----
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgo = sevenDaysAgoDate.toISOString().split("T")[0]!;

    const recentWeatherLogs = await ctx.db
      .query("weatherLogs")
      .withIndex("by_farmId_date", (q) =>
        q.eq("farmId", args.farmId).gte("date", sevenDaysAgo)
      )
      .collect();

    // ----- 7. Fetch planned plantings for the farm -----
    const plannedPlantings = await ctx.db
      .query("plannedPlantings")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .collect();

    // ----- 8. Run all rules -----
    const allCandidates: TaskCandidate[] = [
      ...checkWateringNeeds(
        growingCrops,
        irrigationZones,
        recentWeatherLogs,
        today
      ),
      ...checkHarvestReady(growingCrops, today),
      ...checkFertilizingSchedule(growingCrops, allTasks, today),
      ...checkPestInspection(growingCrops, allTasks, today),
      ...checkTyphoonPrep(growingCrops, allTasks, today),
      ...checkPruningSchedule(growingCrops, allTasks, today),
      ...checkSuccessionPlanting(plannedPlantings, allTasks, today),
    ];

    // ----- 9. Filter duplicates and insert tasks -----
    let generated = 0;
    let skipped = 0;
    const generatedTasks: Array<{ type: string; title: string }> = [];

    for (const candidate of allCandidates) {
      if (isDuplicate(candidate, allTasks, today)) {
        skipped++;
        continue;
      }

      const preset = TASK_PRESETS[candidate.type];

      await ctx.db.insert("tasks", {
        farmId: args.farmId,
        type: candidate.type,
        title: candidate.title,
        cropId: candidate.cropId,
        plantedCropId: candidate.plantedCropId,
        fieldId: candidate.fieldId,
        dueDate: candidate.dueDate,
        completed: false,
        effortMinutes: preset?.effortMinutes,
        difficulty: preset?.difficulty,
        requiredTools: preset?.requiredTools,
      });

      // Also add to allTasks so subsequent candidates can detect this new task as duplicate
      allTasks.push({
        _id: "" as Id<"tasks">,
        _creationTime: Date.now(),
        farmId: args.farmId,
        type: candidate.type,
        title: candidate.title,
        cropId: candidate.cropId,
        plantedCropId: candidate.plantedCropId,
        fieldId: candidate.fieldId,
        dueDate: candidate.dueDate,
        completed: false,
        effortMinutes: preset?.effortMinutes,
        difficulty: preset?.difficulty,
        requiredTools: preset?.requiredTools,
      });

      generated++;
      generatedTasks.push({ type: candidate.type, title: candidate.title });
    }

    return { generated, skipped, tasks: generatedTasks };
  },
});
