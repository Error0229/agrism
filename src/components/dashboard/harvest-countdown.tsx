"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFields } from "@/lib/store/fields-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { differenceInDays } from "date-fns";
import { formatDate } from "@/lib/utils/date-helpers";
import { forecastHarvestWindow, type HarvestForecastWeatherSignal } from "@/lib/utils/harvest-forecast";
import { Timer } from "lucide-react";

export function HarvestCountdown() {
  const { fields } = useFields();
  const allCrops = useAllCrops();
  const [weatherSignal, setWeatherSignal] = useState<HarvestForecastWeatherSignal | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/weather")
      .then(async (res) => {
        if (!res.ok) throw new Error("weather request failed");
        const data = await res.json();
        if (cancelled) return;
        const confidence = data?.meta?.confidence;
        if (
          confidence &&
          (confidence.confidenceLevel === "low" || confidence.confidenceLevel === "medium" || confidence.confidenceLevel === "high") &&
          (confidence.freshnessLabel === "fresh" || confidence.freshnessLabel === "stale" || confidence.freshnessLabel === "expired")
        ) {
          setWeatherSignal({
            confidenceLevel: confidence.confidenceLevel,
            freshnessLabel: confidence.freshnessLabel,
          });
          return;
        }
        setWeatherSignal(null);
      })
      .catch(() => {
        if (!cancelled) setWeatherSignal(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const harvests = useMemo(() => {
    const today = new Date();
    const items: {
      cropName: string;
      emoji: string;
      fieldName: string;
      daysLeft: number;
      earliestDate: Date;
      likelyDate: Date;
      latestDate: Date;
      confidenceLevel: "low" | "medium" | "high";
    }[] = [];
    for (const field of fields) {
      for (const planted of field.plantedCrops) {
        if (planted.status !== "growing") continue;
        const crop = allCrops.find((c) => c.id === planted.cropId);
        if (!crop) continue;
        const growthDays = planted.customGrowthDays ?? crop.growthDays;
        const forecast = forecastHarvestWindow({
          plantedDate: planted.plantedDate,
          growthDays,
          crop,
          weatherSignal,
          now: today,
        });
        const latestDaysLeft = differenceInDays(forecast.latestDate, today);
        if (latestDaysLeft >= 0) {
          items.push({
            cropName: crop.name,
            emoji: crop.emoji,
            fieldName: field.name,
            daysLeft: forecast.daysUntilLikely,
            earliestDate: forecast.earliestDate,
            likelyDate: forecast.likelyDate,
            latestDate: forecast.latestDate,
            confidenceLevel: forecast.confidenceLevel,
          });
        }
      }
    }
    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [fields, allCrops, weatherSignal]);

  if (harvests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="size-4 text-orange-500" />
          收成倒數
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {harvests.map((h, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg">{h.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{h.cropName}</p>
                <p className="text-xs text-muted-foreground">{h.fieldName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(h.earliestDate)} - {formatDate(h.latestDate)} ・ 信心{" "}
                  {h.confidenceLevel === "high" ? "高" : h.confidenceLevel === "medium" ? "中" : "低"}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${h.daysLeft <= 7 ? "text-orange-600" : ""}`}>
                  {h.daysLeft} 天
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
