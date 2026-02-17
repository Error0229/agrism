"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFields } from "@/lib/store/fields-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { generatePlantingSuggestions } from "@/lib/utils/planting-suggestions";
import { Lightbulb } from "lucide-react";
import Link from "next/link";

export function PlantingSuggestionsCard() {
  const { fields } = useFields();
  const allCrops = useAllCrops();
  const currentMonth = new Date().getMonth() + 1;

  const suggestions = useMemo(
    () => generatePlantingSuggestions(fields, allCrops, currentMonth),
    [fields, allCrops, currentMonth]
  );

  if (suggestions.length === 0) return null;

  const typeBadge: Record<string, string> = {
    pruning: "bg-blue-100 text-blue-700",
    rotation: "bg-purple-100 text-purple-700",
    seasonal: "bg-green-100 text-green-700",
    "harvest-soon": "bg-amber-100 text-amber-700",
  };

  const typeLabel: Record<string, string> = {
    pruning: "剪枝",
    rotation: "輪作",
    seasonal: "當季推薦",
    "harvest-soon": "即將收成",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-500" />
          播種建議
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <Badge className={`text-xs shrink-0 ${typeBadge[s.type] || ""}`}>
                {typeLabel[s.type]}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
                {s.cropId && (
                  <Link href={`/crops/${s.cropId}`} className="text-xs text-primary hover:underline">
                    查看詳情
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
