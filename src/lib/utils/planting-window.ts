import { addDays, format } from "date-fns";
import type { Crop } from "@/lib/types";

export interface PlantingWindowResult {
  isCurrentMonthSuitable: boolean;
  nextSuitableMonths: number[];
}

export interface DelaySimulationResult {
  baselineHarvestDate: string;
  delayedHarvestDate: string;
  delayDays: number;
  risk: "低" | "中" | "高";
  confidence: "低" | "中" | "高";
  notes: string[];
}

function getRisk(crop: Crop, delayDays: number): DelaySimulationResult["risk"] {
  if (delayDays <= 7) return "低";
  if (delayDays <= 21) return crop.typhoonResistance === "低" ? "中" : "低";
  if (delayDays <= 35) return crop.typhoonResistance === "低" ? "高" : "中";
  return "高";
}

function getConfidence(delayDays: number): DelaySimulationResult["confidence"] {
  if (delayDays <= 7) return "高";
  if (delayDays <= 28) return "中";
  return "低";
}

export function getPlantingWindow(crop: Crop, now = new Date()): PlantingWindowResult {
  const currentMonth = now.getMonth() + 1;
  const months = [...new Set(crop.plantingMonths)].sort((a, b) => a - b);

  return {
    isCurrentMonthSuitable: months.includes(currentMonth),
    nextSuitableMonths: months.filter((month) => month >= currentMonth).concat(months.filter((month) => month < currentMonth)),
  };
}

export function simulatePlantingDelay(crop: Crop, delayDays: number, now = new Date()): DelaySimulationResult {
  const baselineHarvestDate = addDays(now, crop.growthDays);
  const delayedHarvestDate = addDays(now, crop.growthDays + Math.max(0, delayDays));
  const risk = getRisk(crop, delayDays);
  const confidence = getConfidence(delayDays);
  const notes: string[] = [];

  if (delayDays > 14) notes.push("延後超過兩週，建議檢查病蟲害與天候風險。");
  if (risk === "高") notes.push("延後幅度較大，可能影響收成穩定性。");
  if (!crop.plantingMonths.includes(now.getMonth() + 1)) notes.push("目前非主要播種月份，建議保守評估。");

  return {
    baselineHarvestDate: format(baselineHarvestDate, "yyyy-MM-dd"),
    delayedHarvestDate: format(delayedHarvestDate, "yyyy-MM-dd"),
    delayDays: Math.max(0, delayDays),
    risk,
    confidence,
    notes,
  };
}

