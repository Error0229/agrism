"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFields } from "@/lib/store/fields-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { rotationSuggestions } from "@/lib/data/crop-companions";
import { isRotationEligibleCategory, type CropCategory } from "@/lib/types";

export function RotationTab() {
  const { fields } = useFields();
  const allCrops = useAllCrops();
  const currentMonth = new Date().getMonth() + 1;

  const suggestions = useMemo(() => {
    const results: {
      fieldName: string;
      currentCrop: string;
      currentCategory: CropCategory;
      recommendations: { name: string; emoji: string; category: CropCategory; reason: string }[];
    }[] = [];

    for (const field of fields) {
      for (const planted of field.plantedCrops) {
        if (planted.status !== "growing") continue;
        const crop = allCrops.find((c) => c.id === planted.cropId);
        if (!crop) continue;
        if (!isRotationEligibleCategory(crop.category)) continue;

        const rotation = rotationSuggestions[crop.category];
        if (!rotation) continue;

        const recommendations: typeof results[0]["recommendations"] = [];
        for (const nextCat of rotation.next) {
          const candidates = allCrops
            .filter((c) => c.category === nextCat && c.plantingMonths.includes(currentMonth))
            .slice(0, 2);
          for (const cand of candidates) {
            recommendations.push({
              name: cand.name,
              emoji: cand.emoji,
              category: cand.category,
              reason: rotation.reason,
            });
          }
        }

        if (recommendations.length > 0) {
          results.push({
            fieldName: field.name,
            currentCrop: `${crop.emoji} ${crop.name}`,
            currentCategory: crop.category,
            recommendations: recommendations.slice(0, 3),
          });
        }
      }
    }

    return results;
  }, [fields, allCrops, currentMonth]);

  return (
    <div className="space-y-4 pt-4">
      {suggestions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">尚無輪作建議。</p>
          <p className="text-sm text-muted-foreground mt-1">種植作物後，系統將根據您的種植紀錄提供輪作建議。</p>
        </div>
      ) : (
        suggestions.map((s, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">
                {s.fieldName} — 目前種植 {s.currentCrop}
              </CardTitle>
              <p className="text-xs text-muted-foreground">分類：{s.currentCategory}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{s.recommendations[0]?.reason}</p>
              <div className="space-y-2">
                <p className="text-sm font-medium">建議下期作物（{currentMonth}月可播種）：</p>
                <div className="flex flex-wrap gap-2">
                  {s.recommendations.map((r, j) => (
                    <Badge key={j} variant="secondary" className="text-sm">
                      {r.emoji} {r.name}（{r.category}）
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">輪作原則</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {Object.entries(rotationSuggestions).map(([cat, info]) => {
              if (!info) return null;
              return (
                <div key={cat} className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">{cat}</Badge>
                  <span className="text-muted-foreground">→ {info.next.join("、")}：{info.reason}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
