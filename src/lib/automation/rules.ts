import type { Field } from "@/lib/types";
import type { WeatherAlert } from "@/lib/weather/severe-alerts";

export interface AutomationSuggestion {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  action: string;
  rationale: string;
  requiresConfirmation: boolean;
}

export interface WeatherAutomationInput {
  current: {
    temperatureC: number;
    windSpeedKmh: number;
  };
  forecastRainMm: number[];
  alerts: WeatherAlert[];
  confidenceLevel?: "low" | "medium" | "high";
  beginnerDefaults?: boolean;
}

export interface AutomationSnapshot {
  alertIds: string[];
  confidenceLevel?: "low" | "medium" | "high";
  fieldContextSignature: string;
}

export interface ReplanTrigger {
  id: string;
  severity: "info" | "warning" | "critical";
  reason: string;
}

function pushSuggestion(target: AutomationSuggestion[], suggestion: AutomationSuggestion) {
  if (target.some((item) => item.id === suggestion.id)) return;
  target.push(suggestion);
}

export function evaluateWeatherAnomalies(input: WeatherAutomationInput): AutomationSuggestion[] {
  const beginnerDefaults = input.beginnerDefaults ?? false;
  const alertsById = new Set(input.alerts.map((alert) => alert.id));
  const suggestions: AutomationSuggestion[] = [];
  const rainThreshold = beginnerDefaults ? 20 : 30;
  const windThreshold = beginnerDefaults ? 32 : 40;
  const heatThreshold = beginnerDefaults ? 30 : 32;
  const dryWindowDays = beginnerDefaults ? 3 : 5;

  const heavyRainSoon =
    input.forecastRainMm.slice(0, 3).some((rain) => rain >= rainThreshold) || alertsById.has("rain-critical");
  const prolongedNoRain = input.forecastRainMm.slice(0, dryWindowDays).every((rain) => rain <= 1) || alertsById.has("rain-dry");
  const highWind = input.current.windSpeedKmh >= windThreshold || alertsById.has("wind-warning");
  const highHeat = input.current.temperatureC >= heatThreshold || alertsById.has("heat-warning") || alertsById.has("heat-critical");
  const typhoonLikeRisk = highWind && heavyRainSoon;

  if (heavyRainSoon) {
    pushSuggestion(suggestions, {
      id: "delay-watering",
      severity: "warning",
      title: "建議延後澆水",
      action: "將 24 小時內澆水任務延後 1 天（需手動確認）",
      rationale: "短期強降雨會提高積水風險，先觀察土壤含水量較安全。",
      requiresConfirmation: true,
    });
    pushSuggestion(suggestions, {
      id: "add-disease-inspection",
      severity: "warning",
      title: "新增病害巡檢任務",
      action: "降雨後 24 小時安排病蟲害巡檢",
      rationale: "高濕環境會增加真菌病害風險，需要及早巡檢。",
      requiresConfirmation: true,
    });
  }

  if (prolongedNoRain) {
    pushSuggestion(suggestions, {
      id: "prioritize-irrigation",
      severity: "warning",
      title: "提高灌溉優先級",
      action: "將灌溉相關任務提前至今日或明日",
      rationale: "連續少雨會快速降低土壤含水量，需提前補水。",
      requiresConfirmation: true,
    });
  }

  if (highHeat) {
    pushSuggestion(suggestions, {
      id: "heat-shift",
      severity: input.current.temperatureC >= heatThreshold + 3 ? "critical" : "warning",
      title: "調整高溫作業時段",
      action: "將戶外作業移到上午或傍晚，正午避免操作",
      rationale: "高溫會增加作業負擔與植株蒸散壓力。",
      requiresConfirmation: false,
    });
  }

  if (highWind || typhoonLikeRisk) {
    pushSuggestion(suggestions, {
      id: "add-protection-task",
      severity: typhoonLikeRisk ? "critical" : "warning",
      title: "新增防護作業",
      action: "加固支架、綁繩與排水路徑清理",
      rationale: typhoonLikeRisk ? "強風與強降雨同時出現，倒伏與積水風險高。" : "強風可能造成植株倒伏與枝條折損。",
      requiresConfirmation: true,
    });
  }

  if (input.confidenceLevel === "low") {
    pushSuggestion(suggestions, {
      id: "low-confidence-manual-check",
      severity: "info",
      title: "天氣資料信心偏低",
      action: "保留關鍵任務彈性，優先人工巡田再調整排程",
      rationale: "資料品質不穩定時，避免全自動調整造成錯誤決策。",
      requiresConfirmation: false,
    });
  }

  return suggestions;
}

function confidenceRank(level?: "low" | "medium" | "high"): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  if (level === "low") return 1;
  return 0;
}

export function evaluateReplanTriggers(prev: AutomationSnapshot | null, next: AutomationSnapshot): ReplanTrigger[] {
  if (!prev) return [];
  const triggers: ReplanTrigger[] = [];
  const prevAlerts = new Set(prev.alertIds);
  const newAlerts = next.alertIds.filter((id) => !prevAlerts.has(id));
  const newCriticalAlerts = newAlerts.filter((id) => id.includes("critical"));

  if (newCriticalAlerts.length > 0) {
    triggers.push({
      id: "new-critical-alert",
      severity: "critical",
      reason: `新增關鍵天氣警示：${newCriticalAlerts.join("、")}，建議重新檢查排程。`,
    });
  } else if (newAlerts.length > 0) {
    triggers.push({
      id: "new-alert",
      severity: "warning",
      reason: `新增天氣警示：${newAlerts.join("、")}，建議檢查近期任務優先順序。`,
    });
  }

  if (confidenceRank(next.confidenceLevel) < confidenceRank(prev.confidenceLevel)) {
    triggers.push({
      id: "confidence-drop",
      severity: "warning",
      reason: "天氣資料信心下降，建議重新檢查自動調整建議與關鍵作業安排。",
    });
  }

  if (next.fieldContextSignature !== prev.fieldContextSignature) {
    triggers.push({
      id: "field-context-changed",
      severity: "info",
      reason: "田區條件有變更，建議重新規劃灌溉與防護策略。",
    });
  }

  return triggers;
}

export function buildFieldContextSignature(fields: Array<Pick<Field, "id" | "context">>): string {
  return fields
    .map((field) => ({
      id: field.id,
      context: field.context,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => `${item.id}:${item.context.plotType}:${item.context.sunHours}:${item.context.drainage}:${item.context.slope}:${item.context.windExposure}`)
    .join("|");
}
