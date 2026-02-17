"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFields } from "@/lib/store/fields-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { addDays, differenceInDays } from "date-fns";
import { Timer } from "lucide-react";

export function HarvestCountdown() {
  const { fields } = useFields();
  const allCrops = useAllCrops();

  const harvests = useMemo(() => {
    const today = new Date();
    const items: { cropName: string; emoji: string; fieldName: string; daysLeft: number }[] = [];
    for (const field of fields) {
      for (const planted of field.plantedCrops) {
        if (planted.status !== "growing") continue;
        const crop = allCrops.find((c) => c.id === planted.cropId);
        if (!crop) continue;
        const growthDays = planted.customGrowthDays ?? crop.growthDays;
        const harvestDate = addDays(new Date(planted.plantedDate), growthDays);
        const daysLeft = differenceInDays(harvestDate, today);
        if (daysLeft >= 0) {
          items.push({ cropName: crop.name, emoji: crop.emoji, fieldName: field.name, daysLeft });
        }
      }
    }
    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [fields, allCrops]);

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
