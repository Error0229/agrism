import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import type { Doc } from "./_generated/dataModel";
import { requireFarmMembership } from "./_helpers";

export const buildChatContext = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // === 1. Fields ===
    const fields = await ctx.db
      .query("fields")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .take(50);

    const fieldMap = new Map(fields.map((f) => [f._id.toString(), f]));

    // === 2. Active planted crops (status "growing") ===
    const allPlantedCrops = (
      await Promise.all(
        fields.map((f) =>
          ctx.db
            .query("plantedCrops")
            .withIndex("by_fieldId", (q) => q.eq("fieldId", f._id))
            .take(200)
        )
      )
    ).flat();
    const activePlantedCrops = allPlantedCrops.filter(
      (pc) => pc.status === "growing"
    );

    // Batch-fetch crop names to avoid N+1
    const cropIdSet = new Set<string>();
    for (const pc of activePlantedCrops) {
      if (pc.cropId) cropIdSet.add(pc.cropId.toString());
    }
    const cropMap = new Map<
      string,
      { name: string; lifecycleType?: string; growthDays?: number }
    >();
    await Promise.all(
      [...cropIdSet].map(async (cropId) => {
        const crop = await ctx.db.get(cropId as Id<"crops">);
        if (crop) {
          const c = crop as Doc<"crops">;
          cropMap.set(cropId, {
            name: c.name,
            lifecycleType: c.lifecycleType,
            growthDays: c.growthDays,
          });
        }
      })
    );

    // === 3. Last 10 harvest logs ===
    const allHarvests = await ctx.db
      .query("harvestLogs")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .take(200);
    allHarvests.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    const recentHarvests = allHarvests.slice(0, 10);

    // Batch-fetch crop names for harvest logs
    for (const h of recentHarvests) {
      if (h.cropId) cropIdSet.add(h.cropId.toString());
    }
    await Promise.all(
      [...cropIdSet]
        .filter((id) => !cropMap.has(id))
        .map(async (cropId) => {
          const crop = await ctx.db.get(cropId as Id<"crops">);
          if (crop) {
            const c = crop as Doc<"crops">;
            cropMap.set(cropId, { name: c.name, lifecycleType: c.lifecycleType, growthDays: c.growthDays });
          }
        })
    );

    // === 4. Soil profiles per field (inlined on field) ===
    // Already available from the fields query

    // === 5. Last 5 soil amendments (across all fields) ===
    const allAmendments = (
      await Promise.all(
        fields.map((f) =>
          ctx.db
            .query("soilAmendments")
            .withIndex("by_fieldId", (q) => q.eq("fieldId", f._id))
            .take(50)
        )
      )
    ).flat();
    allAmendments.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    const recentAmendments = allAmendments.slice(0, 5);

    // === 6. Last 7 weather observations ===
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const recentWeather = await ctx.db
      .query("weatherLogs")
      .withIndex("by_farmId_date", (q) =>
        q.eq("farmId", farmId).gte("date", sevenDaysAgoStr)
      )
      .take(200);
    recentWeather.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    const last7Weather = recentWeather.slice(0, 7);

    // === 7. Task summary ===
    const pendingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_farmId_completed", (q) =>
        q.eq("farmId", farmId).eq("completed", false)
      )
      .take(200);

    const overdueCount = pendingTasks.filter(
      (t) => t.dueDate && t.dueDate < todayStr
    ).length;

    const tasksByType = new Map<string, number>();
    for (const t of pendingTasks) {
      tasksByType.set(t.type, (tasksByType.get(t.type) ?? 0) + 1);
    }

    // === 8. Finance summary ===
    const allFinance = await ctx.db
      .query("financeRecords")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .take(500);

    let totalIncome = 0;
    let totalExpense = 0;
    for (const f of allFinance) {
      if (f.type === "income") totalIncome += f.amount;
      else totalExpense += f.amount;
    }

    // === Build text ===
    const sections: string[] = [];

    // Section 1: Active planted crops
    if (activePlantedCrops.length > 0) {
      const lines = activePlantedCrops.map((pc) => {
        const crop = pc.cropId ? cropMap.get(pc.cropId.toString()) : undefined;
        const cropName = crop?.name ?? pc.name ?? "未知";
        const field = pc.fieldId ? fieldMap.get(pc.fieldId.toString()) : undefined;
        const fieldName = field?.name ?? "未知田區";

        let daysSincePlanting = "";
        if (pc.plantedDate) {
          const planted = new Date(pc.plantedDate);
          const days = Math.floor(
            (now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24)
          );
          daysSincePlanting = `，已種植 ${days} 天`;
        }

        const stage = pc.stage ? `，階段：${pc.stage}` : "";
        const lifecycle = pc.lifecycleType
          ? `，類型：${pc.lifecycleType}`
          : crop?.lifecycleType
            ? `，類型：${crop.lifecycleType}`
            : "";

        return `- ${cropName}（${fieldName}）${pc.plantedDate ? `，種植日：${pc.plantedDate}` : ""}${daysSincePlanting}${stage}${lifecycle}`;
      });
      sections.push(`## 目前種植中的作物\n${lines.join("\n")}`);
    }

    // Section 2: Recent harvests
    if (recentHarvests.length > 0) {
      const lines = recentHarvests.map((h) => {
        const crop = h.cropId ? cropMap.get(h.cropId.toString()) : undefined;
        const cropName = crop?.name ?? "未知作物";
        const quality = h.qualityGrade ? `，品質：${h.qualityGrade}` : "";
        return `- ${cropName}，日期：${h.date}，數量：${h.quantity} ${h.unit}${quality}`;
      });
      sections.push(`## 最近收穫紀錄\n${lines.join("\n")}`);
    }

    // Section 3: Soil profiles
    const fieldsWithSoil = fields.filter(
      (f) => f.soilTexture || f.soilPh != null || f.soilEc != null || f.soilOrganicMatterPct != null
    );
    if (fieldsWithSoil.length > 0) {
      const lines = fieldsWithSoil.map((f) => {
        const parts: string[] = [`- ${f.name}`];
        if (f.soilTexture) parts.push(`質地：${f.soilTexture}`);
        if (f.soilPh != null) parts.push(`pH：${f.soilPh}`);
        if (f.soilEc != null) parts.push(`EC：${f.soilEc}`);
        if (f.soilOrganicMatterPct != null) parts.push(`有機質：${f.soilOrganicMatterPct}%`);
        return parts.join("，");
      });

      let soilSection = `## 土壤狀況\n${lines.join("\n")}`;

      if (recentAmendments.length > 0) {
        const amendLines = recentAmendments.map((a) => {
          const field = fieldMap.get(a.fieldId.toString());
          const fieldName = field?.name ?? "未知田區";
          return `- ${fieldName}，${a.date}，${a.amendmentType}，${a.quantity} ${a.unit}`;
        });
        soilSection += `\n最近施肥/改良：\n${amendLines.join("\n")}`;
      }

      sections.push(soilSection);
    } else if (recentAmendments.length > 0) {
      // Soil profile data missing but have amendments
      const amendLines = recentAmendments.map((a) => {
        const field = fieldMap.get(a.fieldId.toString());
        const fieldName = field?.name ?? "未知田區";
        return `- ${fieldName}，${a.date}，${a.amendmentType}，${a.quantity} ${a.unit}`;
      });
      sections.push(`## 土壤狀況\n最近施肥/改良：\n${amendLines.join("\n")}`);
    }

    // Section 4: Recent weather
    if (last7Weather.length > 0) {
      const lines = last7Weather.map((w) => {
        const parts: string[] = [`- ${w.date}`];
        if (w.temperature != null) parts.push(`氣溫：${w.temperature}°C`);
        if (w.rainfallMm != null) parts.push(`降雨：${w.rainfallMm}mm`);
        if (w.condition) parts.push(`天氣：${w.condition}`);
        return parts.join("，");
      });
      sections.push(`## 最近天氣\n${lines.join("\n")}`);
    }

    // Section 5: Task summary
    if (pendingTasks.length > 0) {
      const typeLines = [...tasksByType.entries()]
        .map(([type, count]) => `${type}：${count}`)
        .join("、");
      const lines: string[] = [
        `待處理任務：${pendingTasks.length} 項`,
        `逾期任務：${overdueCount} 項`,
        `依類別：${typeLines}`,
      ];
      sections.push(`## 任務概況\n${lines.join("\n")}`);
    }

    // Section 6: Finance summary
    if (totalIncome > 0 || totalExpense > 0) {
      const net = totalIncome - totalExpense;
      const lines: string[] = [
        `總收入：$${totalIncome.toLocaleString()}`,
        `總支出：$${totalExpense.toLocaleString()}`,
        `淨利：$${net.toLocaleString()}`,
      ];
      sections.push(`## 財務概況\n${lines.join("\n")}`);
    }

    // Join sections and apply token budget guard
    let text = sections.join("\n\n");
    if (text.length > 2000) {
      text = text.slice(0, 1997) + "...";
    }

    return text;
  },
});
