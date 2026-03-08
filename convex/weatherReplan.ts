"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
const VALID_CONFIDENCES = new Set(["high", "medium", "low"]);

export const checkWeatherAndReplan = action({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未登入，無法執行此操作");

    // Verify farm membership
    await ctx.runQuery(internal.farms.verifyMembership, {
      clerkUserId: identity.subject,
      farmId,
    });

    // 1. Get farm context (reuse from briefingContext)
    const context = await ctx.runQuery(
      internal.briefingContext.buildFarmContext,
      { farmId }
    );

    // 2. Fetch 7-day weather forecast from Open-Meteo
    // Use farm location if available, fallback to Hualien defaults
    const lat = (context.farm as { latitude?: number }).latitude ?? 23.99;
    const lon = (context.farm as { longitude?: number }).longitude ?? 121.6;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=Asia/Taipei&forecast_days=7`;

    let forecast;
    try {
      const resp = await fetch(weatherUrl, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) {
        console.error(`Open-Meteo API error: ${resp.status} ${resp.statusText}`);
        throw new Error("無法取得天氣資料");
      }
      forecast = await resp.json();
    } catch (e) {
      if (e instanceof Error && e.message === "無法取得天氣資料") throw e;
      throw new Error("無法取得天氣資料");
    }

    // 3. Build weather context
    const weatherContext = {
      forecast: forecast.daily
        ? {
            dates: forecast.daily.time,
            maxTemp: forecast.daily.temperature_2m_max,
            minTemp: forecast.daily.temperature_2m_min,
            precipitation: forecast.daily.precipitation_sum,
            maxWind: forecast.daily.wind_speed_10m_max,
            weatherCode: forecast.daily.weather_code,
          }
        : null,
    };

    // 4. Call AI to generate weather-specific replan proposals
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

    const systemPrompt = `你是花蓮地區的農業氣象顧問。根據未來7天天氣預報和農場目前狀況，判斷是否需要調整計畫。

生成0-3個天氣相關的重新規劃建議。只在天氣變化確實影響農務時才提出建議。

每個建議必須包含：
- type: 必須是 "weather"
- title: 簡短標題（10字以內）
- summary: 摘要說明（30字以內）
- recommendedAction: 具體建議動作（50字以內）
- priority: "high" | "medium" | "low"
- confidence: "high" | "medium" | "low"
- reasoning: 為什麼建議這樣做（50字以內）
- sourceSignals: 依據的資料來源（字串陣列，例如 ["7日降雨預報", "番茄開花期"]）
- weatherTrigger: 什麼天氣條件觸發了這個建議（20字以內）
- originalPlan: 原來的計畫是什麼（20字以內，如果適用）
- proposedChange: 建議改為什麼（20字以內）

常見天氣觸發情境：
- 連續大雨 → 延後定植、加強排水、注意病害
- 高溫乾旱 → 增加灌溉、遮蔭措施
- 強風預警 → 加固支架、提前採收
- 低溫預報 → 防寒措施、延後育苗
- 颱風季節 → 搶收、加固設施

如果天氣正常且不影響農務，回傳空陣列。

回傳 JSON 格式：{ "proposals": [...] }
所有文字使用繁體中文。`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agrism.app",
          "X-Title": "Agrism Weather Replan",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-lite-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: JSON.stringify({
                farmContext: context,
                weather: weatherContext,
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

    // Parse — strip markdown fences if present
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
    const proposals: Array<Record<string, unknown>> = parsed.proposals || [];

    // Insert as recommendations
    const now = Date.now();
    for (const p of proposals) {
      const priority = VALID_PRIORITIES.has(p.priority as string)
        ? (p.priority as "high" | "medium" | "low")
        : "medium";
      const confidence = VALID_CONFIDENCES.has(p.confidence as string)
        ? (p.confidence as "high" | "medium" | "low")
        : "medium";

      await ctx.runMutation(internal.recommendations.insertRecommendation, {
        farmId,
        type: "weather",
        title: (p.title as string) || "天氣建議",
        summary: (p.summary as string) || "",
        recommendedAction: (p.recommendedAction as string) || "",
        priority,
        confidence,
        reasoning: (p.reasoning as string) || "",
        sourceSignals: Array.isArray(p.sourceSignals)
          ? (p.sourceSignals as string[])
          : [],
        createdAt: now,
      });
    }

    return { count: proposals.length };
  },
});
