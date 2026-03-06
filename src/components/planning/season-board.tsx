"use client";

import React, { useMemo, useState, useCallback } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// --- Types ---

export type OccupancyEntry = {
  regionId: string | undefined;
  type: "current" | "planned";
  sourceId: string;
  cropId: string | undefined;
  cropName: string | undefined;
  startWindow: { earliest: number | undefined; latest: number | undefined };
  endWindow: { earliest: number | undefined; latest: number | undefined };
  confidence: "high" | "medium" | "low";
  isPerennial: boolean;
};

type PlantedCropInfo = {
  _id: string;
  cropId?: string;
  crop?: { _id: string; name: string; color?: string; emoji?: string } | null;
  status: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
};

interface SeasonBoardProps {
  plantedCrops: PlantedCropInfo[];
  occupancy: OccupancyEntry[] | undefined;
  onPlanCrop: (regionId?: string, plantedCropId?: string) => void;
  onEditPlanning: (sourceId: string) => void;
}

// --- Constants ---

const JUN_LABELS = ["上旬", "中旬", "下旬"] as const;

const MONTH_NAMES = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

const CONFIDENCE_OPACITY: Record<string, string> = {
  high: "opacity-100",
  medium: "opacity-75",
  low: "opacity-50",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "高確定性",
  medium: "中確定性",
  low: "低確定性",
};

// --- Helpers ---

/** Get month index (0-11) and jun index (0-2) for a timestamp */
function getMonthJun(ts: number): { month: number; jun: number; year: number } {
  const d = new Date(ts);
  const day = d.getDate();
  const jun = day <= 10 ? 0 : day <= 20 ? 1 : 2;
  return { month: d.getMonth(), jun, year: d.getFullYear() };
}

/** Convert month+jun into a column index relative to startMonth/startYear */
function toColIndex(
  month: number,
  jun: number,
  year: number,
  startMonth: number,
  startYear: number,
): number {
  const monthOffset = (year - startYear) * 12 + (month - startMonth);
  return monthOffset * 3 + jun;
}

function cropBg(entry: OccupancyEntry): string {
  if (entry.isPerennial) return "bg-amber-600/60 dark:bg-amber-700/50";
  if (entry.type === "current") return "bg-emerald-500/70 dark:bg-emerald-600/60";
  return "bg-sky-400/60 dark:bg-sky-500/50";
}

// --- Component ---

export function SeasonBoard({
  plantedCrops,
  occupancy,
  onPlanCrop,
  onEditPlanning,
}: SeasonBoardProps) {
  const [nowTs] = useState(() => Date.now());
  const nowDate = useMemo(() => new Date(nowTs), [nowTs]);
  const [startOffset, setStartOffset] = useState(0); // months offset from current month
  const monthsToShow = 6;

  const startYear = useMemo(() => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() + startOffset, 1);
    return d.getFullYear();
  }, [nowDate, startOffset]);

  const startMonth = useMemo(() => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() + startOffset, 1);
    return d.getMonth();
  }, [nowDate, startOffset]);

  const totalCols = monthsToShow * 3; // 3 jun per month

  // Generate month headers
  const months = useMemo(() => {
    const result: { label: string; year: number; month: number }[] = [];
    for (let i = 0; i < monthsToShow; i++) {
      const d = new Date(startYear, startMonth + i, 1);
      result.push({
        label: MONTH_NAMES[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return result;
  }, [startYear, startMonth]);

  // Build region rows from planted crops
  const regionRows = useMemo(() => {
    const rows: {
      id: string;
      label: string;
      plantedCropId: string;
      color?: string;
      emoji?: string;
    }[] = [];

    // Group growing/harvested planted crops as rows
    for (const pc of plantedCrops) {
      if (pc.status === "removed") continue;
      rows.push({
        id: pc._id,
        label: pc.crop?.name ?? "未指定作物",
        plantedCropId: pc._id,
        color: pc.crop?.color ?? undefined,
        emoji: pc.crop?.emoji ?? undefined,
      });
    }

    return rows;
  }, [plantedCrops]);

  // Map occupancy entries to their region row
  const occupancyByRegion = useMemo(() => {
    const map = new Map<string, OccupancyEntry[]>();
    if (!occupancy) return map;

    for (const entry of occupancy) {
      // Match by sourceId to the plantedCrop _id for current entries
      const key = entry.sourceId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);

      // Also match planned entries by their regionId if it corresponds to a planted crop
      if (entry.type === "planned" && entry.regionId) {
        if (!map.has(entry.regionId)) map.set(entry.regionId, []);
        // Avoid duplicates
        const existing = map.get(entry.regionId)!;
        if (!existing.some((e) => e.sourceId === entry.sourceId)) {
          existing.push(entry);
        }
      }
    }
    return map;
  }, [occupancy]);

  // Compute bar positions for an occupancy entry
  const computeBar = useCallback(
    (entry: OccupancyEntry) => {
      const startTs = entry.startWindow.earliest ?? entry.startWindow.latest;
      const endTs = entry.endWindow.latest ?? entry.endWindow.earliest;

      if (entry.isPerennial) {
        // Perennials span the entire visible range
        return { startCol: 0, endCol: totalCols - 1, isPerennial: true };
      }

      let startCol = 0;
      let endCol = totalCols - 1;

      if (startTs) {
        const { month, jun, year } = getMonthJun(startTs);
        startCol = Math.max(0, toColIndex(month, jun, year, startMonth, startYear));
      }

      if (endTs) {
        const { month, jun, year } = getMonthJun(endTs);
        endCol = Math.min(totalCols - 1, toColIndex(month, jun, year, startMonth, startYear));
      }

      // Clamp
      if (startCol > totalCols - 1) return null; // entirely outside range
      if (endCol < 0) return null;
      startCol = Math.max(0, startCol);
      endCol = Math.min(totalCols - 1, endCol);

      return { startCol, endCol, isPerennial: false };
    },
    [totalCols, startMonth, startYear],
  );

  // "Today" marker column
  const todayCol = useMemo(() => {
    const { month, jun, year } = getMonthJun(nowTs);
    const col = toColIndex(month, jun, year, startMonth, startYear);
    return col >= 0 && col < totalCols ? col : null;
  }, [nowTs, startMonth, startYear, totalCols]);

  const handlePrev = () => setStartOffset((o) => o - 3);
  const handleNext = () => setStartOffset((o) => o + 3);

  return (
    <div className="flex h-full flex-col">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">季節規劃板</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={handlePrev}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[80px] text-center">
            {months[0]?.year !== months[months.length - 1]?.year
              ? `${months[0]?.year}/${months[0]?.label} - ${months[months.length - 1]?.year}/${months[months.length - 1]?.label}`
              : `${months[0]?.year} ${months[0]?.label} - ${months[months.length - 1]?.label}`}
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={handleNext}>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 border-b px-3 py-1.5">
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-emerald-500/80" />
          <span className="text-[10px] text-muted-foreground">目前種植</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm border border-dashed border-sky-400 bg-sky-400/30" />
          <span className="text-[10px] text-muted-foreground">計畫種植</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-sm bg-amber-600/60" />
          <span className="text-[10px] text-muted-foreground">多年生/果園</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">確定性:</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-4 rounded-full bg-foreground/80" />
            <span className="text-[9px] text-muted-foreground">高</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-4 rounded-full bg-foreground/50" />
            <span className="text-[9px] text-muted-foreground">中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-4 rounded-full bg-foreground/30" />
            <span className="text-[9px] text-muted-foreground">低</span>
          </div>
        </div>
      </div>

      {/* Board grid */}
      <ScrollArea className="flex-1">
        <div className="min-w-[600px]">
          {/* Month headers */}
          <div className="sticky top-0 z-10 bg-background">
            <div className="grid" style={{ gridTemplateColumns: `140px repeat(${totalCols}, 1fr)` }}>
              {/* Corner cell */}
              <div className="border-b border-r px-2 py-1 text-[10px] font-medium text-muted-foreground">
                區域
              </div>
              {/* Month group headers */}
              {months.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="col-span-3 border-b border-r px-1 py-1 text-center text-[10px] font-semibold text-foreground/80"
                >
                  {m.label}
                </div>
              ))}
            </div>
            {/* Jun sub-headers */}
            <div className="grid" style={{ gridTemplateColumns: `140px repeat(${totalCols}, 1fr)` }}>
              <div className="border-b border-r" />
              {months.map((m, mi) =>
                JUN_LABELS.map((jl, ji) => {
                  const colIdx = mi * 3 + ji;
                  const isToday = todayCol === colIdx;
                  return (
                    <div
                      key={`${m.year}-${m.month}-${ji}`}
                      className={cn(
                        "border-b border-r px-0.5 py-0.5 text-center text-[9px] text-muted-foreground/70",
                        isToday && "bg-primary/10 font-bold text-primary",
                      )}
                    >
                      {jl}
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          {/* Region rows */}
          {regionRows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              此田區尚無種植區域
            </div>
          ) : (
            regionRows.map((row) => {
              const entries = occupancyByRegion.get(row.id) ?? [];
              return (
                <div
                  key={row.id}
                  className="grid group/row hover:bg-muted/30 transition-colors"
                  style={{ gridTemplateColumns: `140px repeat(${totalCols}, 1fr)` }}
                >
                  {/* Region label */}
                  <div className="flex items-center gap-1.5 border-b border-r px-2 py-2 min-h-[40px]">
                    {row.emoji && <span className="text-sm">{row.emoji}</span>}
                    <span className="truncate text-xs font-medium">{row.label}</span>
                  </div>

                  {/* Grid cells with occupancy bars overlaid */}
                  {Array.from({ length: totalCols }, (_, colIdx) => {
                    const isToday = todayCol === colIdx;
                    // Find entries that cover this column
                    const covering = entries.filter((e) => {
                      const bar = computeBar(e);
                      return bar && colIdx >= bar.startCol && colIdx <= bar.endCol;
                    });

                    // Check if this is an "available" cell (no covering entries)
                    const isEmpty = covering.length === 0;
                    const isMonthBorder = colIdx % 3 === 0;

                    return (
                      <div
                        key={colIdx}
                        className={cn(
                          "relative border-b border-r min-h-[40px] transition-colors",
                          isToday && "bg-primary/5",
                          isMonthBorder && "border-l-muted-foreground/20",
                        )}
                      >
                        {covering.map((entry) => {
                          const bar = computeBar(entry);
                          if (!bar) return null;

                          const isStart = colIdx === bar.startCol;
                          const isEnd = colIdx === bar.endCol;
                          const isPlanned = entry.type === "planned";

                          return (
                            <TooltipProvider key={entry.sourceId}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "absolute inset-x-0 top-1 bottom-1 transition-all",
                                      cropBg(entry),
                                      CONFIDENCE_OPACITY[entry.confidence],
                                      isPlanned && "border-2 border-dashed border-sky-500/60 bg-sky-400/20 dark:bg-sky-500/15",
                                      bar.isPerennial && "bg-amber-600/30 dark:bg-amber-700/25",
                                      bar.isPerennial && "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.05)_4px,rgba(0,0,0,0.05)_8px)]",
                                      isStart && "rounded-l-md ml-0.5",
                                      isEnd && "rounded-r-md mr-0.5",
                                      !isStart && "-ml-px",
                                      !isEnd && "-mr-px",
                                    )}
                                    onClick={() => {
                                      if (isPlanned) {
                                        onEditPlanning(entry.sourceId);
                                      }
                                    }}
                                  >
                                    {isStart && (
                                      <span className="absolute left-1 top-1/2 -translate-y-1/2 truncate text-[9px] font-medium text-white dark:text-white/90 max-w-[60px]">
                                        {entry.cropName ?? ""}
                                      </span>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <div className="space-y-0.5">
                                    <p className="font-medium">{entry.cropName ?? "未指定"}</p>
                                    <p className="text-muted-foreground">
                                      {entry.type === "current" ? "目前種植" : "計畫種植"}
                                      {entry.isPerennial && " (多年生)"}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {CONFIDENCE_LABELS[entry.confidence]}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}

                        {/* Empty cell — clickable to plan */}
                        {isEmpty && (
                          <button
                            type="button"
                            className="absolute inset-0 opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary/10 flex items-center justify-center"
                            onClick={() => onPlanCrop(undefined, row.plantedCropId)}
                            title="規劃種植"
                          >
                            <Sprout className="size-3 text-primary/40" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}

          {/* "Plan next" unassigned row */}
          {occupancy && occupancy.some((o) => o.type === "planned" && !o.regionId) && (
            <div className="grid" style={{ gridTemplateColumns: `140px repeat(${totalCols}, 1fr)` }}>
              <div className="flex items-center gap-1.5 border-b border-r px-2 py-2 min-h-[40px]">
                <span className="text-xs text-muted-foreground italic">未分配計畫</span>
              </div>
              {Array.from({ length: totalCols }, (_, colIdx) => (
                <div key={colIdx} className="border-b border-r min-h-[40px]" />
              ))}
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
