import { addDays, differenceInCalendarDays } from "date-fns";
import type { Crop, CropStageProfile } from "@/lib/types";

export interface HarvestForecastWeatherSignal {
  confidenceLevel: "low" | "medium" | "high";
  freshnessLabel: "fresh" | "stale" | "expired";
}

export interface HarvestForecastInput {
  plantedDate: string | Date;
  growthDays: number;
  crop: Crop;
  weatherSignal?: HarvestForecastWeatherSignal | null;
  now?: Date;
}

export interface HarvestForecast {
  earliestDate: Date;
  likelyDate: Date;
  latestDate: Date;
  confidenceLevel: "low" | "medium" | "high";
  uncertaintyDays: number;
  daysUntilLikely: number;
  factors: string[];
}

function stageRiskBonus(stageProfiles: Partial<Record<string, CropStageProfile>>): number {
  const entries = Object.values(stageProfiles).filter((profile): profile is CropStageProfile => Boolean(profile));
  if (entries.length === 0) return 0;

  const total = entries.reduce((sum, profile) => {
    if (profile.pestRisk === "高") return sum + 2;
    if (profile.pestRisk === "中") return sum + 1;
    return sum;
  }, 0);
  return Math.round(total / entries.length);
}

function confidenceFromUncertainty(uncertaintyDays: number, weatherSignal?: HarvestForecastWeatherSignal | null) {
  let score = 100 - uncertaintyDays * 4;
  if (!weatherSignal) score -= 8;
  if (weatherSignal?.confidenceLevel === "medium") score -= 8;
  if (weatherSignal?.confidenceLevel === "low") score -= 16;
  if (weatherSignal?.freshnessLabel === "stale") score -= 6;
  if (weatherSignal?.freshnessLabel === "expired") score -= 14;
  const normalized = Math.max(0, Math.min(100, score));
  if (normalized >= 72) return "high";
  if (normalized >= 46) return "medium";
  return "low";
}

export function forecastHarvestWindow(input: HarvestForecastInput): HarvestForecast {
  const now = input.now ?? new Date();
  const plantedDate = new Date(input.plantedDate);
  const growthDays = Math.max(1, input.growthDays);
  const likelyDate = addDays(plantedDate, growthDays);
  let uncertaintyDays = Math.max(3, Math.round(growthDays * 0.08));
  const factors: string[] = [`以 ${growthDays} 天生長期為基準`];

  if (input.crop.pestSusceptibility === "中") {
    uncertaintyDays += 1;
    factors.push("病蟲害敏感度中等，略提高不確定性");
  } else if (input.crop.pestSusceptibility === "高") {
    uncertaintyDays += 2;
    factors.push("病蟲害敏感度高，採收時間波動較大");
  }

  if (input.crop.typhoonResistance === "中") {
    uncertaintyDays += 1;
    factors.push("抗風性中等，受天候影響較明顯");
  } else if (input.crop.typhoonResistance === "低") {
    uncertaintyDays += 2;
    factors.push("抗風性偏低，颱風季不確定性增加");
  }

  const stageBonus = stageRiskBonus(input.crop.stageProfiles);
  if (stageBonus > 0) {
    uncertaintyDays += stageBonus;
    factors.push("生育期病蟲風險設定提高預估區間");
  }

  if (!input.weatherSignal) {
    uncertaintyDays += 4;
    factors.push("天氣信心資料缺失，採保守寬區間");
  } else {
    if (input.weatherSignal.confidenceLevel === "medium") {
      uncertaintyDays += 2;
      factors.push("天氣信心中等，區間略放寬");
    } else if (input.weatherSignal.confidenceLevel === "low") {
      uncertaintyDays += 4;
      factors.push("天氣信心偏低，區間明顯放寬");
    } else {
      uncertaintyDays = Math.max(2, uncertaintyDays - 1);
      factors.push("天氣信心高，區間可適度收斂");
    }

    if (input.weatherSignal.freshnessLabel === "stale") {
      uncertaintyDays += 1;
      factors.push("天氣資料偏舊，增加不確定性");
    } else if (input.weatherSignal.freshnessLabel === "expired") {
      uncertaintyDays += 3;
      factors.push("天氣資料過舊，採寬區間估計");
    }
  }

  uncertaintyDays = Math.max(2, Math.min(28, uncertaintyDays));
  const earliestDate = addDays(likelyDate, -uncertaintyDays);
  const latestDate = addDays(likelyDate, uncertaintyDays);
  const confidenceLevel = confidenceFromUncertainty(uncertaintyDays, input.weatherSignal);

  return {
    earliestDate,
    likelyDate,
    latestDate,
    confidenceLevel,
    uncertaintyDays,
    daysUntilLikely: differenceInCalendarDays(likelyDate, now),
    factors: factors.slice(0, 4),
  };
}
