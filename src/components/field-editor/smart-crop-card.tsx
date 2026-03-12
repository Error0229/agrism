"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Droplets,
  ExternalLink,
  Leaf,
  Ruler,
  Sprout,
  Sun,
  TreePine,
  Wind,
  Bug,
  BookOpen,
  Thermometer,
  CalendarX,
  Target,
  NotebookPen,
  Flower2,
  Clock,
  Database,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCropCareContext } from "@/hooks/use-crop-care-context";
import { useUpdatePlantedCropLifecycle } from "@/hooks/use-fields";
import { SUNLIGHT_LEVEL_LABELS, WATER_LEVEL_LABELS } from "@/lib/types/labels";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { CropAlert, GrowthStageEntry } from "../../../shared/growth-stage";
import { mapCropLifecycleType } from "../../../shared/growth-stage";

/** Fields accessed from plantedCrop in this component */
type PlantedCropData = Pick<
  Doc<"plantedCrops">,
  | "_id"
  | "lifecycleType"
  | "customGrowthDays"
  | "stage"
>;

/** Fields accessed from crop in this component */
type CropData = Pick<
  Doc<"crops">,
  | "_id"
  | "lifecycleType"
  | "growthDays"
  | "water"
  | "fertilizerFrequencyDays"
  | "sunlight"
  | "sunlightHoursMin"
  | "sunlightHoursMax"
  | "growthStages"
>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIFECYCLE_TYPE_LABELS: Record<string, string> = {
  seasonal: "短期季節作物",
  long_cycle: "長期作物",
  perennial: "多年生",
  orchard: "果園",
};

const STAGE_LABELS: Record<string, string> = {
  seedling: "幼苗期",
  vegetative: "營養生長期",
  flowering: "開花期",
  fruiting: "結果期",
  harvest_ready: "可採收",
  dormant: "休眠",
  declining: "衰退",
};

const STAGE_COLORS: Record<string, { bg: string; text: string; fill: string }> = {
  seedling: {
    bg: "bg-lime-100 dark:bg-lime-900/30",
    text: "text-lime-700 dark:text-lime-400",
    fill: "bg-lime-500",
  },
  vegetative: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    fill: "bg-green-500",
  },
  flowering: {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-700 dark:text-pink-400",
    fill: "bg-pink-500",
  },
  fruiting: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    fill: "bg-orange-500",
  },
  harvest_ready: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    fill: "bg-amber-500",
  },
  dormant: {
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-500 dark:text-slate-400",
    fill: "bg-slate-400",
  },
  declining: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-500 dark:text-red-400",
    fill: "bg-red-500",
  },
};

const PROPAGATION_LABELS: Record<string, string> = {
  seed: "播種",
  seedling: "育苗",
  cutting: "扦插",
  tuber: "塊莖",
  grafted: "嫁接",
  division: "分株",
};

const ALERT_ICON_MAP: Record<string, React.ElementType> = {
  wind: Wind,
  droplets: Droplets,
  "calendar-x": CalendarX,
  "notebook-pen": NotebookPen,
  target: Target,
};

const ALERT_STYLES: Record<CropAlert["type"], string> = {
  critical: "border-l-red-500 bg-red-50/60 dark:bg-red-950/20",
  warning: "border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20",
  info: "border-l-blue-400 bg-blue-50/40 dark:bg-blue-950/20",
  positive: "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
};

const ALERT_TEXT_STYLES: Record<CropAlert["type"], string> = {
  critical: "text-red-700 dark:text-red-400",
  warning: "text-amber-700 dark:text-amber-400",
  info: "text-blue-700 dark:text-blue-400",
  positive: "text-emerald-700 dark:text-emerald-400",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Source indicator badge: "from database" or "overridden" */
function SourceBadge({
  isOverridden,
  onReset,
}: {
  isOverridden: boolean;
  onReset?: () => void;
}) {
  if (isOverridden) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-0.5 rounded-sm bg-blue-100 px-1 py-px text-[8px] font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
          <Pencil className="size-1.5" />
          已覆寫
        </span>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[8px] text-muted-foreground/70 underline decoration-dashed underline-offset-2 transition-colors hover:text-foreground"
          >
            重設
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-sm bg-muted/50 px-1 py-px text-[8px] text-muted-foreground/60">
      <Database className="size-1.5" />
      來自資料庫
    </span>
  );
}

/** Growth stage progress bar with milestone markers */
function GrowthStageProgressBar({
  stages,
  currentStageIndex,
  progressPercent,
  daysSincePlanting,
  totalDays,
}: {
  stages: GrowthStageEntry[];
  currentStageIndex: number;
  progressPercent: number;
  daysSincePlanting: number;
  totalDays: number;
}) {
  const sorted = useMemo(
    () => [...stages].sort((a, b) => a.daysFromStart - b.daysFromStart),
    [stages],
  );

  return (
    <div className="space-y-1.5">
      {/* Progress bar track */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/40">
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-green-500 to-lime-500 transition-all duration-500"
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
        {/* Stage milestone markers */}
        {sorted.map((stage, i) => {
          if (totalDays <= 0) return null;
          const pos = (stage.daysFromStart / totalDays) * 100;
          if (pos <= 0 || pos >= 100) return null;
          return (
            <div
              key={stage.stage + i}
              className={cn(
                "absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background",
                i <= currentStageIndex
                  ? "bg-emerald-600"
                  : "bg-muted-foreground/30",
              )}
              style={{ left: `${pos}%` }}
            />
          );
        })}
      </div>
      {/* Day count */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          第 <span className="font-semibold text-foreground">{daysSincePlanting}</span> 天
        </span>
        <span>
          共 <span className="font-medium">{totalDays}</span> 天
        </span>
      </div>
    </div>
  );
}

/** Care action row */
function CareActionRow({
  icon: Icon,
  label,
  value,
  stageSpecific,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  stageSpecific?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-muted/40">
        <Icon className="size-3 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium leading-tight">{value}</p>
      </div>
      {stageSpecific && (
        <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-1 py-px text-[7px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          階段建議
        </span>
      )}
    </div>
  );
}

/** Collapsible reference section */
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-accent/40"
        >
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-[11px] font-semibold text-foreground/80">
            {title}
          </span>
          {open ? (
            <ChevronDown className="size-3 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground/60" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1.5 pb-1 pl-6 pr-1 pt-0.5">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Simple key-value display row for reference sections */
function RefRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-right font-medium leading-tight">{value}</span>
    </div>
  );
}

/** Alert card */
function AlertCard({ alert }: { alert: CropAlert }) {
  const IconComponent = ALERT_ICON_MAP[alert.icon] ?? NotebookPen;
  return (
    <div
      className={cn(
        "rounded-md border-l-2 px-2.5 py-1.5",
        ALERT_STYLES[alert.type],
      )}
    >
      <div className="flex items-start gap-2">
        <IconComponent
          className={cn("mt-0.5 size-3.5 shrink-0", ALERT_TEXT_STYLES[alert.type])}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-medium leading-tight", ALERT_TEXT_STYLES[alert.type])}>
            {alert.message}
          </p>
          {alert.detail && (
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {alert.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SmartCropCardProps {
  plantedCrop: PlantedCropData;
  crop: CropData | null;
}

export const SmartCropCard = React.memo(function SmartCropCard({
  plantedCrop,
  crop,
}: SmartCropCardProps) {
  const updateLifecycle = useUpdatePlantedCropLifecycle();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: careContext, isLoading } = useCropCareContext(
    plantedCrop._id as Id<"plantedCrops">,
  );

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

  // --- Derived values ---
  const cropLifecycleType = crop?.lifecycleType;
  const plantedLifecycleType = plantedCrop.lifecycleType;
  const effectiveLifecycleType = plantedLifecycleType ?? cropLifecycleType;
  const isLifecycleOverridden =
    plantedLifecycleType != null &&
    cropLifecycleType != null &&
    plantedLifecycleType !== cropLifecycleType;

  const cropGrowthDays = crop?.growthDays;
  const customGrowthDays = plantedCrop.customGrowthDays;
  const effectiveGrowthDays = customGrowthDays ?? cropGrowthDays;
  const isGrowthDaysOverridden =
    customGrowthDays != null && cropGrowthDays != null && customGrowthDays !== cropGrowthDays;

  // Growth stage data from care context
  const growthStageInfo = careContext?.growthStageInfo ?? null;
  const stageSpecificCare = careContext?.stageSpecificCare ?? null;
  const alerts = careContext?.alerts ?? [];
  const reference = careContext?.reference ?? null;
  const growingGuide = careContext?.growingGuide ?? null;
  const daysSincePlanting = careContext?.daysSincePlanting ?? null;
  const daysToHarvest = careContext?.daysToHarvest ?? null;
  const estimatedHarvestDate = careContext?.estimatedHarvestDate ?? null;

  // Current stage — either auto-detected or manually set
  const autoDetectedStage = growthStageInfo?.currentStage?.stage;
  const manualStage = plantedCrop.stage;
  const currentStageName = autoDetectedStage ?? manualStage;
  const stageColor = currentStageName ? STAGE_COLORS[currentStageName] : null;
  const stageLabel = currentStageName
    ? (STAGE_LABELS[currentStageName] ?? currentStageName)
    : null;

  // Check if manual stage overrides auto-detected
  const isStageOverridden =
    manualStage != null &&
    autoDetectedStage != null &&
    manualStage !== autoDetectedStage;

  // --- Care data for "what to do now" ---
  const waterFreqLabel = useMemo(() => {
    if (!stageSpecificCare && !crop) return null;
    const freqDays = stageSpecificCare?.waterFrequencyDays;
    const waterLevel = stageSpecificCare?.water ?? crop?.water;
    if (freqDays) {
      return `每 ${freqDays} 天`;
    }
    if (waterLevel) {
      return WATER_LEVEL_LABELS[waterLevel as keyof typeof WATER_LEVEL_LABELS] ?? waterLevel;
    }
    return null;
  }, [stageSpecificCare, crop]);

  const fertFreqLabel = useMemo(() => {
    const freqDays = stageSpecificCare?.fertilizerFrequencyDays ?? crop?.fertilizerFrequencyDays;
    if (freqDays) {
      return `每 ${freqDays} 天`;
    }
    return null;
  }, [stageSpecificCare, crop]);

  const sunlightLabel = useMemo(() => {
    const sunlight = stageSpecificCare?.sunlight ?? crop?.sunlight;
    if (!sunlight) return null;
    const base = SUNLIGHT_LEVEL_LABELS[sunlight as keyof typeof SUNLIGHT_LEVEL_LABELS] ?? sunlight;
    const minH = stageSpecificCare?.sunlightHoursMin ?? crop?.sunlightHoursMin;
    const maxH = stageSpecificCare?.sunlightHoursMax ?? crop?.sunlightHoursMax;
    if (minH && maxH) {
      return `${base}（${minH}-${maxH} 小時）`;
    }
    if (minH) {
      return `${base}（${minH}+ 小時）`;
    }
    return base;
  }, [stageSpecificCare, crop]);

  const hasWaterStageData = stageSpecificCare?.waterFrequencyDays != null;
  const hasFertStageData = stageSpecificCare?.fertilizerFrequencyDays != null;

  // Has any care data to show
  const hasCareData = waterFreqLabel || fertFreqLabel || sunlightLabel;
  const hasCareNotes = stageSpecificCare?.careNotes;

  // Has reference data
  const hasSpacingData =
    reference?.spacingPlantCm || reference?.spacingRowCm || reference?.maxHeightCm;
  const hasCompanionData =
    (reference?.companionPlants && reference.companionPlants.length > 0) ||
    (reference?.antagonistPlants && reference.antagonistPlants.length > 0);
  const hasGrowingGuide = growingGuide && (
    growingGuide.howToPlant ||
    growingGuide.howToCare ||
    growingGuide.warnings ||
    growingGuide.localNotes
  );
  const hasPestData =
    (reference?.commonPests && reference.commonPests.length > 0) ||
    (reference?.commonDiseases && reference.commonDiseases.length > 0);
  const hasEnvData =
    reference?.tempOptimalMin != null ||
    reference?.tempOptimalMax != null ||
    reference?.soilPhMin != null;

  // Grow stages from crop for progress bar
  const growthStages: GrowthStageEntry[] = useMemo(
    () => careContext?.crop?.growthStages ?? crop?.growthStages ?? [],
    [careContext?.crop?.growthStages, crop?.growthStages],
  );

  // --- Render ---

  if (!crop) {
    return (
      <div className="space-y-3">
        <SectionHeader icon={<Sprout className="size-3" />}>
          作物資訊
        </SectionHeader>
        <div className="rounded-md border border-dashed border-border/40 bg-muted/10 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">未指定作物</p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            請先指定作物以查看智慧資訊
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ================================================================= */}
      {/* LAYER 1: Crop Identity + Status Bar (always visible)              */}
      {/* ================================================================= */}
      <SectionHeader icon={<TreePine className="size-3" />}>
        作物資訊
      </SectionHeader>

      {/* Lifecycle type — editable dropdown with override indicator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <label className="text-[10px] font-medium text-muted-foreground">
            生長類型
          </label>
          {cropLifecycleType && (
            <SourceBadge
              isOverridden={isLifecycleOverridden}
              onReset={
                isLifecycleOverridden
                  ? () => {
                      const mapped = mapCropLifecycleType(cropLifecycleType);
                      if (mapped) save("lifecycleType", mapped);
                    }
                  : undefined
              }
            />
          )}
        </div>
        <Select
          value={effectiveLifecycleType ?? ""}
          onValueChange={(val) => save("lifecycleType", val)}
          disabled={saving === "lifecycleType"}
        >
          <SelectTrigger
            className={cn(
              "h-7 w-full text-xs transition-colors",
              effectiveLifecycleType
                ? "border-border/40 font-medium"
                : "border-dashed",
            )}
          >
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

      {/* Growth stage pill + manual override select */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Leaf className="size-2.5" />
            目前階段
          </label>
          {autoDetectedStage && manualStage && (
            <SourceBadge
              isOverridden={isStageOverridden}
              onReset={
                isStageOverridden
                  ? () => save("stage", autoDetectedStage)
                  : undefined
              }
            />
          )}
        </div>
        <Select
          value={currentStageName ?? ""}
          onValueChange={(val) => save("stage", val)}
          disabled={saving === "stage"}
        >
          <SelectTrigger
            className={cn(
              "h-7 w-full text-xs transition-colors",
              stageColor
                ? `border-transparent font-medium ${stageColor.bg} ${stageColor.text}`
                : "",
            )}
          >
            <SelectValue placeholder="選擇階段" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STAGE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      STAGE_COLORS[val]?.fill ?? "bg-muted",
                    )}
                  />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Growth stage progress bar — only when growthStages data exists */}
      {growthStageInfo && growthStages.length > 0 && (
        <GrowthStageProgressBar
          stages={growthStages}
          currentStageIndex={growthStageInfo.currentStageIndex}
          progressPercent={growthStageInfo.progressPercent}
          daysSincePlanting={growthStageInfo.daysSincePlanting}
          totalDays={growthStageInfo.totalDays}
        />
      )}

      {/* Harvest countdown */}
      {effectiveGrowthDays != null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-muted-foreground">預計收穫</span>
            {isGrowthDaysOverridden && (
              <SourceBadge
                isOverridden
                onReset={() => {
                  /* Resetting custom growth days requires updatePlantedCrop, not lifecycle */
                  toast.info("請在作物資料頁重設生長天數");
                }}
              />
            )}
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5",
              daysToHarvest != null && daysToHarvest <= 0
                ? "border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                : daysToHarvest != null && daysToHarvest <= 7
                  ? "border border-amber-200 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20"
                  : "border border-border/30 bg-muted/20",
            )}
          >
            <Clock
              className={cn(
                "size-3.5 shrink-0",
                daysToHarvest != null && daysToHarvest <= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : daysToHarvest != null && daysToHarvest <= 7
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground/60",
              )}
            />
            <div className="min-w-0 flex-1">
              {daysToHarvest != null && daysToHarvest <= 0 ? (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  已可收穫
                </p>
              ) : daysToHarvest != null ? (
                <p className="text-xs">
                  <span className="font-semibold">{daysToHarvest}</span>
                  <span className="text-muted-foreground"> 天後</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {effectiveGrowthDays} 天（未設定種植日期）
                </p>
              )}
              {estimatedHarvestDate && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  {estimatedHarvestDate}
                </p>
              )}
            </div>
            {daysSincePlanting != null && (
              <span className="shrink-0 text-[9px] text-muted-foreground/60">
                已種 {daysSincePlanting} 天
              </span>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LAYER 2: What To Do Now (expanded by default)                     */}
      {/* ================================================================= */}
      {(hasCareData || hasCareNotes || alerts.length > 0) && (
        <>
          <Separator className="my-1" />

          {/* Care actions */}
          {hasCareData && (
            <div className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/60">
                <Flower2 className="size-2.5" />
                現在要做什麼
              </p>
              <div className="rounded-md border border-border/20 bg-muted/10 px-2 py-0.5">
                {waterFreqLabel && (
                  <CareActionRow
                    icon={Droplets}
                    label="澆水頻率"
                    value={waterFreqLabel}
                    stageSpecific={hasWaterStageData}
                  />
                )}
                {fertFreqLabel && (
                  <CareActionRow
                    icon={Sprout}
                    label="施肥頻率"
                    value={fertFreqLabel}
                    stageSpecific={hasFertStageData}
                  />
                )}
                {sunlightLabel && (
                  <CareActionRow icon={Sun} label="日照需求" value={sunlightLabel} />
                )}
              </div>
            </div>
          )}

          {/* Stage care notes */}
          {hasCareNotes && (
            <div className="rounded-md border-l-2 border-l-blue-400 bg-blue-50/40 px-2.5 py-1.5 dark:bg-blue-950/20">
              <p className="text-[10px] font-medium text-blue-700 dark:text-blue-400">
                {stageLabel}照護提示
              </p>
              <p className="mt-0.5 text-xs leading-snug text-foreground/80">
                {stageSpecificCare?.careNotes}
              </p>
            </div>
          )}

          {/* Contextual alerts */}
          {alerts.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/60">
                <Wind className="size-2.5" />
                注意事項
                <Badge
                  variant="secondary"
                  className="ml-auto h-4 px-1 text-[8px]"
                >
                  {alerts.length}
                </Badge>
              </p>
              {alerts.map((alert, i) => (
                <AlertCard key={`${alert.icon}-${i}`} alert={alert} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
          <span className="ml-2 text-[10px] text-muted-foreground">
            載入作物資訊...
          </span>
        </div>
      )}

      {/* ================================================================= */}
      {/* LAYER 3: Reference Data (collapsed sections)                      */}
      {/* ================================================================= */}
      {(hasSpacingData || hasCompanionData || hasGrowingGuide || hasPestData || hasEnvData) && (
        <>
          <Separator className="my-1" />

          {/* Spacing & density */}
          {hasSpacingData && (
            <CollapsibleSection title="間距與密度" icon={Ruler}>
              {reference?.spacingPlantCm && (
                <RefRow label="株距" value={`${reference.spacingPlantCm} cm`} />
              )}
              {reference?.spacingRowCm && (
                <RefRow label="行距" value={`${reference.spacingRowCm} cm`} />
              )}
              {reference?.maxHeightCm && (
                <RefRow label="最大高度" value={`${reference.maxHeightCm} cm`} />
              )}
              {reference?.maxSpreadCm && (
                <RefRow label="最大展幅" value={`${reference.maxSpreadCm} cm`} />
              )}
              {reference?.trellisRequired != null && (
                <RefRow
                  label="需要支架"
                  value={reference.trellisRequired ? "是" : "否"}
                />
              )}
              {reference?.propagationMethod && (
                <RefRow
                  label="繁殖方式"
                  value={
                    PROPAGATION_LABELS[reference.propagationMethod] ??
                    reference.propagationMethod
                  }
                />
              )}
            </CollapsibleSection>
          )}

          {/* Companions & antagonists */}
          {hasCompanionData && (
            <CollapsibleSection title="共生與忌避" icon={Leaf}>
              {reference?.companionPlants && reference.companionPlants.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    好鄰居
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {reference.companionPlants.map((p: string) => (
                      <span
                        key={p}
                        className="rounded-sm bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {reference?.antagonistPlants && reference.antagonistPlants.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-red-500 dark:text-red-400">
                    壞鄰居
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {reference.antagonistPlants.map((p: string) => (
                      <span
                        key={p}
                        className="rounded-sm bg-red-100 px-1.5 py-px text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {reference?.rotationFamily && (
                <RefRow
                  label="輪作科別"
                  value={
                    <span>
                      {reference.rotationFamily}
                      {reference.rotationYears && (
                        <span className="text-muted-foreground">
                          {" "}（休耕 {reference.rotationYears} 年）
                        </span>
                      )}
                    </span>
                  }
                />
              )}
            </CollapsibleSection>
          )}

          {/* Growing guide */}
          {hasGrowingGuide && (
            <CollapsibleSection title="栽培指南" icon={BookOpen}>
              {growingGuide?.howToPlant && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    種植方式
                  </p>
                  <p className="text-xs leading-relaxed">{growingGuide.howToPlant}</p>
                </div>
              )}
              {growingGuide?.howToCare && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    照護方式
                  </p>
                  <p className="text-xs leading-relaxed">{growingGuide.howToCare}</p>
                </div>
              )}
              {growingGuide?.warnings && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    注意事項
                  </p>
                  <p className="text-xs leading-relaxed">{growingGuide.warnings}</p>
                </div>
              )}
              {growingGuide?.localNotes && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    在地筆記
                  </p>
                  <p className="text-xs leading-relaxed">{growingGuide.localNotes}</p>
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Pest & disease risks */}
          {hasPestData && (
            <CollapsibleSection title="病蟲害風險" icon={Bug}>
              {reference?.commonPests && reference.commonPests.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    常見害蟲
                  </p>
                  {reference.commonPests.map(
                    (pest: { name: string; symptoms: string; organicTreatment: string }) => (
                      <div
                        key={pest.name}
                        className="rounded-md bg-muted/20 px-2 py-1.5"
                      >
                        <p className="text-[11px] font-semibold">{pest.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {pest.symptoms}
                        </p>
                        <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                          有機防治：{pest.organicTreatment}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
              {reference?.commonDiseases && reference.commonDiseases.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    常見病害
                  </p>
                  {reference.commonDiseases.map(
                    (disease: { name: string; symptoms: string; organicTreatment: string }) => (
                      <div
                        key={disease.name}
                        className="rounded-md bg-muted/20 px-2 py-1.5"
                      >
                        <p className="text-[11px] font-semibold">{disease.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {disease.symptoms}
                        </p>
                        <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                          有機防治：{disease.organicTreatment}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Environment requirements */}
          {hasEnvData && (
            <CollapsibleSection title="環境需求" icon={Thermometer}>
              {reference?.tempOptimalMin != null && reference?.tempOptimalMax != null && (
                <RefRow
                  label="最適溫度"
                  value={`${reference.tempOptimalMin} - ${reference.tempOptimalMax} °C`}
                />
              )}
              {reference?.soilPhMin != null && reference?.soilPhMax != null && (
                <RefRow
                  label="土壤酸鹼度"
                  value={`pH ${reference.soilPhMin} - ${reference.soilPhMax}`}
                />
              )}
              {reference?.harvestMaturitySigns && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    成熟判斷
                  </p>
                  <p className="text-xs leading-relaxed">
                    {reference.harvestMaturitySigns}
                  </p>
                </div>
              )}
            </CollapsibleSection>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* LAYER 4: Link to full crop page                                   */}
      {/* ================================================================= */}
      {crop?._id && (
        <>
          <Separator className="my-1" />
          <Link
            href={`/crops/${crop._id}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <ExternalLink className="size-3" />
            查看完整作物資料
            <ChevronRight className="ml-auto size-3" />
          </Link>
        </>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Shared helpers (reused from lifecycle-inspector)
// ---------------------------------------------------------------------------

function SectionHeader({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
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
