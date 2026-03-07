"use client";

import React from "react";
import {
  CalendarRange,
  Sprout,
  ArrowRight,
  Clock,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OccupancyEntry } from "./season-board";

// --- Types ---

interface RegionPlanningInspectorProps {
  plantedCrop: {
    _id: string;
    crop?: { name: string; emoji?: string } | null;
    status: string;
    lifecycleType?: string;
    stage?: string;
    plantedDate?: string;
    endWindowEarliest?: number;
    endWindowLatest?: number;
  };
  occupancy: OccupancyEntry[];
  onPlanNext: () => void;
  onEditPlanning: (sourceId: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  seedling: "幼苗期",
  vegetative: "營養生長期",
  flowering: "開花期",
  fruiting: "結果期",
  harvest_ready: "可採收",
  dormant: "休眠",
  declining: "衰退",
};

function formatEndWindow(earliest?: number, latest?: number): string | null {
  if (!earliest && !latest) return null;
  const ts = earliest ?? latest!;
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const jun = day <= 10 ? "上旬" : day <= 20 ? "中旬" : "下旬";
  return `${d.getFullYear()}年${month}月${jun}`;
}

// --- Component ---

export function RegionPlanningInspector({
  plantedCrop,
  occupancy,
  onPlanNext,
  onEditPlanning,
}: RegionPlanningInspectorProps) {
  const currentEntries = occupancy.filter((o) => o.type === "current" && o.sourceId === plantedCrop._id);
  const plannedEntries = occupancy.filter((o) => o.type === "planned");
  const currentEntry = currentEntries[0];
  const isPerennial = currentEntry?.isPerennial ?? false;

  const estimatedEnd = formatEndWindow(
    plantedCrop.endWindowEarliest,
    plantedCrop.endWindowLatest,
  );

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 pb-1">
        <div className="flex size-5 items-center justify-center rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <CalendarRange className="size-3" />
        </div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">
          季節規劃
        </h3>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Current crop info */}
      <div className="rounded-md border bg-card/50 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">目前作物</span>
          {isPerennial && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">
              多年生
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {plantedCrop.crop?.emoji && (
            <span className="text-sm">{plantedCrop.crop.emoji}</span>
          )}
          <span className="text-xs font-medium">
            {plantedCrop.crop?.name ?? "未指定作物"}
          </span>
          {plantedCrop.stage && (
            <span className="text-[10px] text-muted-foreground">
              ({STAGE_LABELS[plantedCrop.stage] ?? plantedCrop.stage})
            </span>
          )}
        </div>

        {/* Estimated end */}
        {!isPerennial && estimatedEnd && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="size-2.5" />
            預估結束: <span className="font-medium text-foreground/80">{estimatedEnd}</span>
          </div>
        )}

        {isPerennial && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
            <HelpCircle className="size-2.5" />
            多年生作物，長期佔用此區域
          </div>
        )}
      </div>

      {/* Planned successors */}
      {plannedEntries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">後續計畫</span>
          {plannedEntries.map((entry) => {
            const startStr = entry.startWindow.earliest
              ? formatEndWindow(entry.startWindow.earliest)
              : null;

            return (
              <button
                key={entry.sourceId}
                type="button"
                className="flex w-full items-center gap-2 rounded-md border border-dashed border-sky-300/60 bg-sky-50/30 px-2.5 py-1.5 text-left transition-colors hover:bg-sky-50/60 dark:border-sky-700/40 dark:bg-sky-950/20 dark:hover:bg-sky-950/30"
                onClick={() => onEditPlanning(entry.sourceId)}
              >
                <ArrowRight className="size-3 text-sky-500/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium">
                    {entry.cropName ?? "未指定"}
                  </span>
                  {startStr && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      {startStr}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Plan Next button */}
      {!isPerennial && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs border-dashed border-sky-300/60 text-sky-600 hover:bg-sky-50/50 hover:text-sky-700 dark:border-sky-700/40 dark:text-sky-400 dark:hover:bg-sky-950/30"
          onClick={onPlanNext}
        >
          <Sprout className="size-3 mr-1" />
          規劃下一季作物
        </Button>
      )}
    </div>
  );
}
