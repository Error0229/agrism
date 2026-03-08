"use node";

import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

export const triageObservation = action({
  args: { observationId: v.id("pestObservations") },
  handler: async (ctx, { observationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("未登入，無法執行此操作");

    // Fetch the observation
    const obs = await ctx.runQuery(api.pestObservations.getById, {
      observationId,
    });
    if (!obs) throw new Error("找不到觀察紀錄");

    // Fetch crop data if available
    let cropData: Record<string, unknown> | null = null;
    if (obs.cropId) {
      cropData = await ctx.runQuery(api.crops.getById, {
        cropId: obs.cropId,
      });
    }

    // Build context
    const context: Record<string, unknown> = {
      symptoms: obs.symptoms,
      severity: obs.severity,
      affectedParts: obs.affectedParts,
      spreadRate: obs.spreadRate,
      environmentNotes: obs.environmentNotes,
    };

    if (cropData) {
      context.cropName = (cropData as any).name;
      context.commonPests = (cropData as any).commonPests;
      context.commonDiseases = (cropData as any).commonDiseases;
      context.category = (cropData as any).category;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

    const systemPrompt = `你是花蓮地區的植物病蟲害診斷專家。根據農民提供的症狀描述和作物資料，進行病蟲害初步診斷。

請提供3-5個可能的原因，每個包含：
- possibleCause: 可能的病蟲害名稱
- likelihood: "high" | "medium" | "low"
- reasoning: 為什麼認為是這個原因（考慮症狀、作物特性、花蓮氣候）
- nextChecks: 建議農民下一步檢查什麼來確認
- treatment: 實用的有機防治方法（適合花蓮亞熱帶氣候）

回傳 JSON 格式：{ "results": [...] }

重要規則：
- 優先考慮花蓮常見的病蟲害
- 建議有機、環保的防治方法
- 考慮亞熱帶氣候（高溫多濕）的影響
- 如果有作物的已知病蟲害資料，優先比對
- 所有文字使用繁體中文`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agrism.app",
          "X-Title": "Agrism Pest Triage",
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

    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const results: Array<Record<string, unknown>> = parsed.results || [];

    const VALID_LIKELIHOODS = new Set(["high", "medium", "low"]);

    const triageResults = results.map((r) => ({
      possibleCause: (r.possibleCause as string) || "未知",
      likelihood: VALID_LIKELIHOODS.has(r.likelihood as string)
        ? (r.likelihood as string)
        : "medium",
      reasoning: (r.reasoning as string) || "",
      nextChecks: (r.nextChecks as string) || "",
      treatment: (r.treatment as string) || "",
    }));

    await ctx.runMutation(internal.pestObservations.updateTriageResults, {
      observationId,
      triageResults,
    });

    return { count: triageResults.length };
  },
});
