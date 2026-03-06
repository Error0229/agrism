"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Leaf,
  TreePine,
  CalendarClock,
  CircleHelp,
  Timer,
  SquareCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const START_DATE_MODE_LABELS: Record<string, string> = {
  exact: "確切日期",
  range: "日期範圍",
  relative: "大約天數",
  unknown: "不確定",
};

// --- Helper ---

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function PropRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

// --- Confidence badge ---

function ConfidenceBadge({ level }: { level: string | undefined }) {
  if (!level) return <span className="text-[10px] text-muted-foreground">--</span>;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
        level === "high" &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        level === "medium" &&
          "border border-dashed border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
        level === "low" &&
          "border border-dotted border-red-300 bg-red-50/50 text-red-500 dark:bg-red-900/10 dark:text-red-400",
      )}
    >
      {CONFIDENCE_LABELS[level] ?? level}
    </span>
  );
}

// --- Date formatting helper ---

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return "--";
  return new Date(ts).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// --- Main component ---

interface LifecycleInspectorProps {
  plantedCrop: PlantedCropData;
}

export const LifecycleInspector = React.memo(function LifecycleInspector({
  plantedCrop,
}: LifecycleInspectorProps) {
  const updateLifecycle = useUpdatePlantedCropLifecycle();
  const [saving, setSaving] = useState<string | null>(null);

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

  const startDateMode: string = plantedCrop.startDateMode ?? "unknown";

  return (
    <>
      <Separator />

      {/* Lifecycle Type */}
      <div className="space-y-2">
        <SectionHeading>
          <span className="flex items-center gap-1.5">
            <TreePine className="size-3" />
            生命週期
          </span>
        </SectionHeading>

        {/* Lifecycle type selector */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">生長類型</label>
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

        {/* Current stage */}
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Leaf className="size-2.5" />
            目前階段
          </label>
          <Select
            value={plantedCrop.stage ?? ""}
            onValueChange={(val) => save("stage", val)}
            disabled={saving === "stage"}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue placeholder="選擇階段" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stage confidence */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">階段信心度</label>
          <div className="flex gap-1.5">
            {(["high", "medium", "low"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => save("stageConfidence", level)}
                disabled={saving === "stageConfidence"}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
                  plantedCrop.stageConfidence === level
                    ? level === "high"
                      ? "bg-green-100 text-green-700 ring-1 ring-green-300 dark:bg-green-900/40 dark:text-green-400 dark:ring-green-700"
                      : level === "medium"
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:ring-amber-700"
                        : "bg-red-100 text-red-600 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-400 dark:ring-red-700"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {CONFIDENCE_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        {plantedCrop.stageUpdatedAt && (
          <PropRow
            label="階段更新"
            value={formatTimestamp(plantedCrop.stageUpdatedAt)}
          />
        )}
      </div>

      <Separator />

      {/* Timeline / Planting Time */}
      <div className="space-y-2">
        <SectionHeading>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3" />
            種植時間
          </span>
        </SectionHeading>

        {/* Start date mode */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">日期模式</label>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(START_DATE_MODE_LABELS).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => save("startDateMode", val)}
                disabled={saving === "startDateMode"}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-medium transition-all",
                  startDateMode === val
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {val === "unknown" && <CircleHelp className="mr-0.5 inline size-2.5" />}
                {val === "relative" && <Timer className="mr-0.5 inline size-2.5" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode-specific inputs */}
        {startDateMode === "exact" && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">確切種植日</label>
            <Input
              type="date"
              className="h-7 text-xs"
              defaultValue={
                plantedCrop.plantStartEarliest
                  ? new Date(plantedCrop.plantStartEarliest).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const ts = e.target.value ? new Date(e.target.value).getTime() : undefined;
                if (ts) {
                  save("plantStartEarliest", ts);
                  save("plantStartLatest", ts);
                }
              }}
            />
          </div>
        )}

        {startDateMode === "range" && (
          <div className="space-y-1.5">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">最早日期</label>
              <Input
                type="date"
                className="h-7 text-xs"
                defaultValue={
                  plantedCrop.plantStartEarliest
                    ? new Date(plantedCrop.plantStartEarliest).toISOString().split("T")[0]
                    : ""
                }
                onBlur={(e) => {
                  const ts = e.target.value ? new Date(e.target.value).getTime() : undefined;
                  if (ts) save("plantStartEarliest", ts);
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">最晚日期</label>
              <Input
                type="date"
                className="h-7 text-xs"
                defaultValue={
                  plantedCrop.plantStartLatest
                    ? new Date(plantedCrop.plantStartLatest).toISOString().split("T")[0]
                    : ""
                }
                onBlur={(e) => {
                  const ts = e.target.value ? new Date(e.target.value).getTime() : undefined;
                  if (ts) save("plantStartLatest", ts);
                }}
              />
            </div>
          </div>
        )}

        {startDateMode === "relative" && (
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">大約幾天前種植</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                className="h-7 flex-1 text-xs"
                defaultValue={plantedCrop.estimatedAgeDays ?? ""}
                onBlur={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0) save("estimatedAgeDays", val);
                }}
              />
              <span className="shrink-0 text-xs text-muted-foreground">天前</span>
            </div>
          </div>
        )}

        {startDateMode === "unknown" && (
          <p className="text-[10px] italic text-muted-foreground">
            種植日期不確定
          </p>
        )}
      </div>

      <Separator />

      {/* End window & timeline confidence */}
      <div className="space-y-2">
        <SectionHeading>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3" />
            預估結束
          </span>
        </SectionHeading>

        <div className="space-y-1.5">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">最早結束</label>
            <Input
              type="date"
              className="h-7 text-xs"
              defaultValue={
                plantedCrop.endWindowEarliest
                  ? new Date(plantedCrop.endWindowEarliest).toISOString().split("T")[0]
                  : ""
              }
              onBlur={(e) => {
                const ts = e.target.value ? new Date(e.target.value).getTime() : undefined;
                if (ts) save("endWindowEarliest", ts);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">最晚結束</label>
            <Input
              type="date"
              className="h-7 text-xs"
              defaultValue={
                plantedCrop.endWindowLatest
                  ? new Date(plantedCrop.endWindowLatest).toISOString().split("T")[0]
                  : ""
              }
              onBlur={(e) => {
                const ts = e.target.value ? new Date(e.target.value).getTime() : undefined;
                if (ts) save("endWindowLatest", ts);
              }}
            />
          </div>
        </div>

        {/* Timeline confidence */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">時程信心度</label>
          <div className="flex gap-1.5">
            {(["high", "medium", "low"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => save("timelineConfidence", level)}
                disabled={saving === "timelineConfidence"}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
                  plantedCrop.timelineConfidence === level
                    ? level === "high"
                      ? "bg-green-100 text-green-700 ring-1 ring-green-300 dark:bg-green-900/40 dark:text-green-400 dark:ring-green-700"
                      : level === "medium"
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:ring-amber-700"
                        : "bg-red-100 text-red-600 ring-1 ring-red-300 dark:bg-red-900/40 dark:text-red-400 dark:ring-red-700"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {CONFIDENCE_LABELS[level]}
              </button>
            ))}
          </div>
          {plantedCrop.timelineConfidence && (
            <div className="flex justify-end">
              <ConfidenceBadge level={plantedCrop.timelineConfidence} />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Occupying Area toggle */}
      <div className="space-y-1.5">
        <SectionHeading>
          <span className="flex items-center gap-1.5">
            <SquareCheck className="size-3" />
            區域佔用
          </span>
        </SectionHeading>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">佔用中</span>
          <Switch
            checked={plantedCrop.isOccupyingArea ?? true}
            onCheckedChange={(checked) => save("isOccupyingArea", checked)}
            disabled={saving === "isOccupyingArea"}
          />
        </div>
      </div>
    </>
  );
});
