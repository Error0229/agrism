import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const buildFarmContext = internalQuery({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const farm = await ctx.db.get(farmId);
    if (!farm) throw new Error("農場不存在");

    // Get all fields
    const fields = await ctx.db
      .query("fields")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    // Get all planted crops for all fields
    const allPlantedCrops = (
      await Promise.all(
        fields.map((f) =>
          ctx.db
            .query("plantedCrops")
            .withIndex("by_fieldId", (q) => q.eq("fieldId", f._id))
            .collect()
        )
      )
    ).flat();
    const activePlantedCrops = allPlantedCrops.filter(
      (pc) => pc.status === "growing"
    );

    // Batch-fetch all unique crop IDs to avoid N+1 queries
    const cropIdSet = new Set<string>();
    for (const pc of activePlantedCrops) {
      if (pc.cropId) cropIdSet.add(pc.cropId);
    }
    const cropMap = new Map<
      string,
      { name: string; category: string; growthDays?: number; emoji?: string }
    >();
    await Promise.all(
      [...cropIdSet].map(async (cropId) => {
        const crop = await ctx.db.get(cropId as never);
        if (crop) {
          const c = crop as {
            name: string;
            category: string;
            growthDays?: number;
            emoji?: string;
          };
          cropMap.set(cropId, {
            name: c.name,
            category: c.category,
            growthDays: c.growthDays,
            emoji: c.emoji,
          });
        }
      })
    );

    // Get recent weather (last 7 days) using date index
    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const recentWeather = await ctx.db
      .query("weatherLogs")
      .withIndex("by_farmId_date", (q) =>
        q.eq("farmId", farmId).gte("date", sevenDaysAgoStr)
      )
      .collect();
    recentWeather.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    // Get active tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
    const pendingTasks = tasks.filter((t) => !t.completed);

    // Get planned plantings
    const plans = await ctx.db
      .query("plannedPlantings")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
    const activePlans = plans.filter((p) => p.planningState !== "cancelled");

    // Get recent dismissed/snoozed recommendations (last 30 days)
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const allRecommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
    const recentFeedback = allRecommendations
      .filter(
        (r) =>
          (r.status === "dismissed" || r.status === "snoozed") &&
          r.createdAt >= thirtyDaysAgo
      )
      .map((r) => ({
        type: r.type,
        title: r.title,
        status: r.status,
        dismissReason: r.dismissReason,
      }));

    return {
      farm: {
        name: farm.name,
        location: {
          country: farm.country,
          countyCity: farm.countyCity,
          district: farm.districtTownship,
          elevation: farm.elevationBand,
          coastal: farm.coastalInland,
        },
      },
      currentDate: now.toISOString().slice(0, 10),
      currentMonth: now.getMonth() + 1,
      fields: fields.map((f) => ({
        name: f.name,
        sunHours: f.sunHours,
        drainage: f.drainage,
        windExposure: f.windExposure,
        slope: f.slope,
        soilPh: f.soilPh,
      })),
      plantedCrops: activePlantedCrops.map((pc) => {
        const crop = pc.cropId ? cropMap.get(pc.cropId) : undefined;
        return {
          cropName: crop?.name ?? pc.name ?? "未知",
          category: crop?.category,
          stage: pc.stage,
          plantedDate: pc.plantedDate,
          status: pc.status,
          growthDays: pc.customGrowthDays ?? crop?.growthDays,
        };
      }),
      recentWeather: recentWeather.map((w) => ({
        date: w.date,
        temp: w.temperature,
        rain: w.rainfallMm,
        condition: w.condition,
      })),
      pendingTasks: pendingTasks.map((t) => ({
        title: t.title,
        type: t.type,
        dueDate: t.dueDate,
      })),
      activePlans: activePlans.map((p) => ({
        cropName: p.cropName,
        state: p.planningState,
        startWindow: p.startWindowEarliest,
      })),
      recentFeedback,
    };
  },
});
