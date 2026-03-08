"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const VALID_TYPES = new Set([
  "care",
  "harvest",
  "weather",
  "planning",
  "pest",
  "general",
]);
const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
const VALID_CONFIDENCES = new Set(["high", "medium", "low"]);

export const generateBriefing = action({
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

    // Get farm context via internal query
    const context = await ctx.runQuery(
      internal.briefingContext.buildFarmContext,
      { farmId }
    );

    // Call OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

    const systemPrompt = `你是一位花蓮地區的專業農業顧問。根據以下農場資料，生成3-5個今日建議。

每個建議必須包含：
- type: "care" | "harvest" | "weather" | "planning" | "pest" | "general"
- title: 簡短標題（10字以內）
- summary: 摘要說明（30字以內）
- recommendedAction: 具體建議動作（50字以內）
- priority: "high" | "medium" | "low"
- confidence: "high" | "medium" | "low"
- reasoning: 為什麼建議這樣做（50字以內）
- sourceSignals: 依據的資料來源（字串陣列）

回傳 JSON 格式：{ "recommendations": [...] }

重要規則：
- 只根據提供的資料生成建議，不要臆測
- 考慮花蓮的亞熱帶氣候、颱風季節
- 優先建議急迫性高的事項
- 如果資料不足，降低信心度
- 所有文字使用繁體中文

以下是農民最近忽略或延後的建議，避免重複類似建議：
${JSON.stringify(context.recentFeedback ?? [])}`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agrism.app",
          "X-Title": "Agrism Daily Briefing",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-lite-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(context) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${error}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

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
    const recommendations: Array<Record<string, unknown>> =
      parsed.recommendations || [];

    // Insert each recommendation via internal mutation
    const now = Date.now();
    for (const rec of recommendations) {
      const type = VALID_TYPES.has(rec.type as string)
        ? (rec.type as string)
        : "general";
      const priority = VALID_PRIORITIES.has(rec.priority as string)
        ? (rec.priority as "high" | "medium" | "low")
        : "medium";
      const confidence = VALID_CONFIDENCES.has(rec.confidence as string)
        ? (rec.confidence as "high" | "medium" | "low")
        : "medium";

      await ctx.runMutation(internal.recommendations.insertRecommendation, {
        farmId,
        type,
        title: (rec.title as string) || "建議",
        summary: (rec.summary as string) || "",
        recommendedAction: (rec.recommendedAction as string) || "",
        priority,
        confidence,
        reasoning: (rec.reasoning as string) || "",
        sourceSignals: Array.isArray(rec.sourceSignals)
          ? (rec.sourceSignals as string[])
          : [],
        createdAt: now,
      });
    }

    return { count: recommendations.length };
  },
});
