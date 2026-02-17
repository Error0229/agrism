import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { cropName }: { cropName: string } = await req.json();

  const prompt = `你是一位農業專家。請根據作物名稱「${cropName}」，提供完整的種植資訊。
請以 JSON 格式回覆，不要加任何其他文字或 markdown 標記，只要純 JSON。
特別注意花蓮地區（台灣東部，亞熱帶海洋性氣候，多颱風）的種植建議。

JSON 格式如下：
{
  "name": "作物名稱",
  "emoji": "最適合的 emoji（單個）",
  "color": "代表顏色（hex 格式如 #16a34a）",
  "category": "分類（必須是：葉菜類、瓜果類、根莖類、茄果類、辛香料、水果類、豆類 其中之一）",
  "plantingMonths": [適合播種的月份數字陣列，如 [2,3,4]],
  "harvestMonths": [適合收成的月份數字陣列],
  "growthDays": 從播種到收成的天數（數字）,
  "spacing": { "row": 行距公分數, "plant": 株距公分數 },
  "water": "水分需求（必須是：少量、適量、大量 其中之一）",
  "sunlight": "日照需求（必須是：全日照、半日照、耐陰 其中之一）",
  "temperatureRange": { "min": 最低適溫, "max": 最高適溫 },
  "soilPhRange": { "min": 最低建議土壤pH, "max": 最高建議土壤pH },
  "pestSusceptibility": "病蟲害敏感度（必須是：低、中、高 其中之一）",
  "yieldEstimateKgPerSqm": 每平方公尺預估產量公斤數,
  "stageProfiles": {
    "seedling": { "water": "少量|適量|大量", "fertilizerIntervalDays": 數字, "pestRisk": "低|中|高" },
    "vegetative": { "water": "少量|適量|大量", "fertilizerIntervalDays": 數字, "pestRisk": "低|中|高" },
    "flowering_fruiting": { "water": "少量|適量|大量", "fertilizerIntervalDays": 數字, "pestRisk": "低|中|高" },
    "harvest_ready": { "water": "少量|適量|大量", "fertilizerIntervalDays": 數字, "pestRisk": "低|中|高" }
  },
  "fertilizerIntervalDays": 施肥間隔天數,
  "needsPruning": 是否需要剪枝（true/false）,
  "pruningMonths": [剪枝月份，如不需要則為空陣列],
  "pestControl": ["病蟲害名稱：防治方法", "病蟲害名稱：防治方法", "病蟲害名稱：防治方法"],
  "typhoonResistance": "颱風耐受度（必須是：低、中、高 其中之一）",
  "hualienNotes": "花蓮在地種植注意事項與建議（2-3句話）"
}`;

  try {
    const result = await generateText({
      model: openrouter("openai/gpt-4o"),
      prompt,
    });

    const text = result.text.trim();
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI 回覆格式錯誤" }, { status: 500 });
    }

    const cropData = JSON.parse(jsonMatch[0]);
    return Response.json(cropData);
  } catch {
    return Response.json({ error: "AI 查詢失敗，請稍後再試" }, { status: 500 });
  }
}
