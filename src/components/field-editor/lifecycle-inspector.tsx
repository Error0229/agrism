"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Leaf,
  TreePine,
  Calendar,
  CalendarCheck,
  Clock,
  HelpCircle,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdatePlantedCropLifecycle } from "@/hooks/use-fields";
import type { Id } from "../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlantedCropData = any;

// --- Label maps ---

export const LIFECYCLE_TYPE_LABELS: Record<string, string> = {
  seasonal: "短期季節作物",
  long_cycle: "長期作物",
  perennial: "多年生",
  orchard: "果園",
};

export const STAGE_LABELS: Record<string, string> = {
  seedling: "幼苗期",
  vegetative: "營養生長期",
  flowering: "開花期",
  fruiting: "結果期",
  harvest_ready: "可採收",
  dormant: "休眠",
  declining: "衰退",
};

// Stage color mapping for the pill indicator
const STAGE_COLORS: Record<string, string> = {
  seedling: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  vegetative: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  flowering: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  fruiting: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  harvest_ready: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  dormant: "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400",
  declining: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
};

const START_DATE_MODE_LABELS: Record<string, string> = {
  exact: "確切日期",
  relative: "約略估計",
  range: "範圍估計",
  unknown: "未知",
};

// --- Helpers ---

function SectionHeader({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">
        {children}
      </h3>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Badge for estimated / approximate values — visually softer */
function EstimatedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded border border-dashed border-amber-300/60 bg-amber-50/50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-400">
      <Clock className="size-2" />
      {children}
    </span>
  );
}

/** Badge for unknown values */
function UnknownBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded border border-dashed border-border/50 bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground/60">
      <HelpCircle className="size-2" />
      未知
    </span>
  );
}

// --- Main component ---

interface LifecycleInspectorProps {
  plantedCrop: PlantedCropData;
  cropGrowthDays?: number;
  cropLifecycleType?: string;
}

export const LifecycleInspector = React.memo(function LifecycleInspector({
  plantedCrop,
  cropGrowthDays,
  cropLifecycleType,
}: LifecycleInspectorProps) {
  const updateLifecycle = useUpdatePlantedCropLifecycle();
  const [saving, setSaving] = useState<string | null>(null);
  const [harvestOverride, setHarvestOverride] = useState(false);

  const save = useCallback(
    async (field: string, value: unknown) => {
      setSaving(field);
      try {
        await updateLifecycle({
          plantedCropId: plantedCrop._id as Id<"plantedCrops">,
          [field]: value,
        });
      } catch {
        toast.error("更新失敗");
      } finally {
        setSaving(null);
      }
    },
    [updateLifecycle, plantedCrop._id],
  );

  // Compute estimated harvest date
  const growthDays = plantedCrop.customGrowthDays ?? cropGrowthDays;
  const plantedDate: string | undefined = plantedCrop.plantedDate;
  const startDateMode: string | undefined = plantedCrop.startDateMode;
  const estimatedAgeDays: number | undefined = plantedCrop.estimatedAgeDays;
  const isEstimated = startDateMode === "relative" || startDateMode === "unknown";
  const isUnknownDate = startDateMode === "unknown";

  const estimatedHarvestDate = useMemo(() => {
    if (!plantedDate || !growthDays) return null;
    return addDaysToDate(plantedDate, growthDays);
  }, [plantedDate, growthDays]);

  // Check if user has manually set an end window (override)
  const manualHarvestDate = plantedCrop.endWindowEarliest
    ? new Date(plantedCrop.endWindowEarliest).toISOString().split("T")[0]
    : null;

  const displayHarvestDate = manualHarvestDate ?? estimatedHarvestDate;

  const currentStage = plantedCrop.stage;

  // Format estimated age as human-readable
  const estimatedAgeDisplay = useMemo(() => {
    if (!estimatedAgeDays) return null;
    const months = Math.round(estimatedAgeDays / 30);
    if (months < 1) return `約 ${estimatedAgeDays} 天`;
    return `約 ${months} 個月`;
  }, [estimatedAgeDays]);

  return (
    <div className="space-y-4">
      {/* --- Crop Lifecycle Info --- */}
      <div className="space-y-3">
        <SectionHeader icon={<TreePine className="size-3" />}>
          作物資訊
        </SectionHeader>

        {/* Lifecycle type (read-only, from crop definition) */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">生長類型</label>
          {cropLifecycleType ? (
            <div className="flex h-7 items-center rounded-md border border-border/40 bg-muted/20 px-2.5 text-xs text-foreground/80">
              {LIFECYCLE_TYPE_LABELS[cropLifecycleType] ?? cropLifecycleType}
            </div>
          ) : (
            <div className="flex h-7 items-center gap-1.5 rounded-md border border-dashed border-border/40 bg-muted/10 px-2.5 text-[10px] italic text-muted-foreground/60">
              <HelpCircle className="size-2.5" />
              未設定 — 請在作物資料中設定
            </div>
          )}
        </div>

        {/* Current stage with colored pill */}
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Leaf className="size-2.5" />
            目前階段
          </label>
          <Select
            value={currentStage ?? ""}
            onValueChange={(val) => save("stage", val)}
            disabled={saving === "stage"}
          >
            <SelectTrigger className={cn(
              "h-7 w-full text-xs transition-colors",
              currentStage && STAGE_COLORS[currentStage]
                ? "border-transparent font-medium " + STAGE_COLORS[currentStage]
                : "",
            )}>
              <SelectValue placeholder="選擇階段" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  <span className="flex items-center gap-1.5">
                    <span className={cn(
                      "size-1.5 rounded-full",
                      STAGE_COLORS[val]?.split(" ")[0] ?? "bg-muted",
                    )} />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- Dates --- */}
      <div className="space-y-3">
        <SectionHeader icon={<Calendar className="size-3" />}>
          時程
        </SectionHeader>

        {/* Date mode indicator */}
        {startDateMode && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">日期精確度:</span>
            {startDateMode === "exact" ? (
              <span className="rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
                {START_DATE_MODE_LABELS[startDateMode]}
              </span>
            ) : startDateMode === "unknown" ? (
              <UnknownBadge />
            ) : (
              <EstimatedBadge>
                {START_DATE_MODE_LABELS[startDateMode] ?? startDateMode}
              </EstimatedBadge>
            )}
          </div>
        )}

        {/* Planted date — simple date input */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">種植日期</label>
          {isUnknownDate && !plantedDate ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border/40 bg-muted/20 px-2.5 py-1.5">
              <HelpCircle className="size-3 text-muted-foreground/40" />
              <span className="text-[10px] italic text-muted-foreground/50">
                未設定 — 可隨時補充
              </span>
            </div>
          ) : (
            <div className={cn(
              isEstimated && "relative",
            )}>
              <Input
                type="date"
                className={cn(
                  "h-7 text-xs",
                  isEstimated && "border-dashed border-amber-300/60 text-foreground/60 dark:border-amber-700/40",
                )}
                value={plantedDate ?? ""}
                onChange={(e) => {
                  const val = e.target.value || undefined;
                  save("plantedDate", val ?? "");
                  if (val) {
                    save("startDateMode", "exact");
                    save("timelineConfidence", "high");
                  }
                }}
                disabled={saving === "plantedDate"}
              />
              {isEstimated && plantedDate && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] text-amber-500">
                  約
                </span>
              )}
            </div>
          )}
        </div>

        {/* Estimated age display — only for relative mode */}
        {startDateMode === "relative" && estimatedAgeDisplay && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-200/60 bg-amber-50/30 px-2.5 py-1.5 dark:border-amber-800/30 dark:bg-amber-950/10">
            <Clock className="size-3 text-amber-500/60" />
            <span className="text-xs text-amber-700/80 dark:text-amber-400/80">
              {estimatedAgeDisplay}前種植
            </span>
          </div>
        )}

        {/* Estimated harvest date — auto-calculated, overridable */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <CalendarCheck className="size-2.5" />
              預估採收日
            </label>
            {displayHarvestDate && (
              <button
                type="button"
                onClick={() => setHarvestOverride(!harvestOverride)}
                className={cn(
                  "flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] transition-colors",
                  harvestOverride
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/60 hover:text-muted-foreground",
                )}
              >
                <Pencil className="size-2" />
                {harvestOverride ? "編輯中" : "調整"}
              </button>
            )}
          </div>

          {harvestOverride ? (
            <Input
              type="date"
              className="h-7 text-xs"
              defaultValue={displayHarvestDate ?? ""}
              onBlur={(e) => {
                const ts = e.target.value ? new Date(e.target.value).getTime() : undefined;
                if (ts) {
                  save("endWindowEarliest", ts);
                  save("endWindowLatest", ts);
                }
                setHarvestOverride(false);
              }}
            />
          ) : displayHarvestDate ? (
            <div className={cn(
              "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
              isEstimated
                ? "border-dashed border-amber-200/60 bg-amber-50/20 dark:border-amber-800/30 dark:bg-amber-950/10"
                : "border-dashed border-border/60 bg-muted/30",
            )}>
              <CalendarCheck className={cn(
                "size-3",
                isEstimated ? "text-amber-500/60" : "text-muted-foreground/60",
              )} />
              <span className={cn(
                "font-mono text-xs",
                isEstimated ? "text-foreground/60" : "text-foreground/80",
              )}>
                {isEstimated && "約 "}
                {displayHarvestDate}
              </span>
              {manualHarvestDate && (
                <span className="ml-auto rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                  已調整
                </span>
              )}
              {!manualHarvestDate && growthDays && (
                <span className="ml-auto text-[9px] text-muted-foreground/60">
                  +{growthDays}天
                </span>
              )}
            </div>
          ) : (
            <p className="px-1 text-[10px] italic text-muted-foreground/60">
              未設定
            </p>
          )}
        </div>
      </div>

    </div>
  );
});
