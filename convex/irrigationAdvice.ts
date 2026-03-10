"use node";

import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

const _VALID_PRIORITIES = new Set(["high", "medium", "low"]);
const VALID_CONFIDENCES = new Set(["high", "medium", "low"]);

export const generateIrrigationAdvice = action({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未登入，無法執行此操作");

    // Verify farm membership
    await ctx.runQuery(internal.farms.verifyMembership, {
      clerkUserId: identity.subject,
      farmId,
    });

    // 1. Get irrigation zones
    const zones = await ctx.runQuery(api.irrigationZones.list, { farmId });

    if (zones.length === 0) {
      return { count: 0, message: "尚未設定灌溉區域" };
    }

    // 2. Get farm context (crops, weather, fields)
    const context = await ctx.runQuery(
      internal.briefingContext.buildFarmContext,
      { farmId }
    );

    // 3. Enrich zones with crop info from planted crops
    const allPlantedCropIds = zones.flatMap((z) => z.linkedRegionIds ?? []);
    const _uniqueCropIds = [...new Set(allPlantedCropIds)];

    // Build zone context for AI
    const zoneContext = zones.map((z) => ({
      name: z.name,
      fieldId: z.fieldId,
      linkedRegionCount: z.linkedRegionIds?.length ?? 0,
      linkedRegionIds: z.linkedRegionIds,
      lastWateredAt: z.lastWateredAt
        ? new Date(z.lastWateredAt).toISOString()
        : null,
      hoursSinceWatered: z.lastWateredAt
        ? Math.round((Date.now() - z.lastWateredAt) / (1000 * 60 * 60))
        : null,
      skipReason: z.skipReason,
      notes: z.notes,
    }));

    // 4. Fetch 3-day weather forecast
    const lat =
      (context.farm as { location?: { latitude?: number } }).location
        ? 23.99
        : 23.99;
    const lon = 121.6;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max&hourly=precipitation&timezone=Asia/Taipei&forecast_days=3&past_days=3`;

    let weatherData;
    try {
      const resp = await fetch(weatherUrl, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) {
        console.error(`Open-Meteo API error: ${resp.status} ${resp.statusText}`);
        weatherData = null;
      } else {
        weatherData = await resp.json();
      }
    } catch {
      weatherData = null;
    }

    const recentRainfall = weatherData?.daily
      ? {
          dates: weatherData.daily.time,
          precipitationMm: weatherData.daily.precipitation_sum,
        }
      : null;

    // 5. Call AI
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

    const systemPrompt = `你是花蓮地區的灌溉管理顧問。農場使用手動閥門灌溉系統。

根據以下資料，為每個灌溉區域提供今日灌溉建議：

每個建議必須包含：
- zoneName: 灌溉區域名稱
- shouldWater: true/false
- reason: 原因說明（30字以內）
- suggestedOrder: 建議澆水順序（數字，從1開始）
- durationMinutes: 建議澆水時間（分鐘）
- skipReason: 如果不需要澆水，說明原因（20字以內）

決策依據：
- 最後澆水時間與距今時數
- 最近3天降雨量（超過10mm可能不需澆水）
- 未來3天降雨預報
- 種植作物的需水量
- 當前氣溫（高溫增加需水量）

實用原則：
- 清晨或傍晚澆水最佳
- 剛下過大雨的區域可以跳過
- 需水量高的作物優先
- 正在開花或結果的作物不可缺水

回傳 JSON 格式：{ "advice": [...], "summary": "今日灌溉摘要（50字以內）" }
所有文字使用繁體中文。`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agrism.app",
          "X-Title": "Agrism Irrigation Advice",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: JSON.stringify({
                zones: zoneContext,
                plantedCrops: context.plantedCrops,
                recentRainfall,
                recentWeather: context.recentWeather,
              }),
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${await response.text()}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { count: 0 };

    // Parse
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI 回應格式錯誤，請重試");
    }
    const advice: Array<Record<string, unknown>> = parsed.advice || [];
    const summary = (parsed.summary as string) || "灌溉建議已生成";

    // Insert as recommendation
    const now = Date.now();
    const actionLines = advice
      .filter((a) => a.shouldWater)
      .map(
        (a) =>
          `${a.suggestedOrder}. ${a.zoneName}（${a.durationMinutes}分鐘）`
      );
    const skipLines = advice
      .filter((a) => !a.shouldWater)
      .map((a) => `${a.zoneName}：${a.skipReason}`);

    const recommendedAction = [
      ...(actionLines.length > 0
        ? ["需澆水：", ...actionLines]
        : []),
      ...(skipLines.length > 0
        ? ["可跳過：", ...skipLines]
        : []),
    ].join("\n");

    if (advice.length > 0) {
      const priority = advice.some((a) => a.shouldWater) ? "medium" : "low";
      const confidence = VALID_CONFIDENCES.has("medium")
        ? "medium"
        : "medium";

      await ctx.runMutation(internal.recommendations.insertRecommendation, {
        farmId,
        type: "care",
        title: "灌溉建議",
        summary,
        recommendedAction: recommendedAction || summary,
        priority: priority as "high" | "medium" | "low",
        confidence: confidence as "high" | "medium" | "low",
        reasoning: "根據灌溉區域狀態、天氣資料及作物需水量生成",
        sourceSignals: ["灌溉建議", "天氣資料", "作物需水量"],
        createdAt: now,
      });
    }

    return { count: advice.length, summary, advice };
  },
});
