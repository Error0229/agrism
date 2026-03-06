"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Leaf,
  TreePine,
  Calendar,
  CalendarCheck,
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

// --- Main component ---

interface LifecycleInspectorProps {
  plantedCrop: PlantedCropData;
  cropGrowthDays?: number;
}

export const LifecycleInspector = React.memo(function LifecycleInspector({
  plantedCrop,
  cropGrowthDays,
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

  return (
    <div className="space-y-4">
      {/* --- Crop Lifecycle Info --- */}
      <div className="space-y-3">
        <SectionHeader icon={<TreePine className="size-3" />}>
          作物資訊
        </SectionHeader>

        {/* Lifecycle type */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">生長類型</label>
          <Select
            value={plantedCrop.lifecycleType ?? ""}
            onValueChange={(val) => save("lifecycleType", val)}
            disabled={saving === "lifecycleType"}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue placeholder="選擇類型" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LIFECYCLE_TYPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Planted date — simple date input */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">種植日期</label>
          <Input
            type="date"
            className="h-7 text-xs"
            value={plantedDate ?? ""}
            onChange={(e) => {
              const val = e.target.value || undefined;
              save("plantedDate", val ?? "");
            }}
            disabled={saving === "plantedDate"}
          />
        </div>

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
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 px-2.5 py-1.5">
              <CalendarCheck className="size-3 text-muted-foreground/60" />
              <span className="font-mono text-xs text-foreground/80">{displayHarvestDate}</span>
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
