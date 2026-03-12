"use client";

import React, { useState } from "react";
import {
  CalendarRange,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  History,
  AlertTriangle,
  Link2Off,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CropAvatar } from "@/components/crops/crop-avatar";
import { resolveCropMedia } from "@/lib/crops/media";
import { useRegionPlan, useRegionHistory } from "@/hooks/use-region-plan";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

// --- Types ---

interface RegionPlanningInspectorProps {
  plantedCrop: {
    _id: string;
    crop?: {
      name: string;
      emoji?: string;
      imageUrl?: string;
      thumbnailUrl?: string;
      scientificName?: string;
    } | null;
    status: string;
    lifecycleType?: string;
    stage?: string;
    plantedDate?: string;
    endWindowEarliest?: number;
    endWindowLatest?: number;
  };
  fieldId?: Id<"fields">;
  onPlanNext: () => void;
  onEditPlanning: (sourceId: string) => void;
}

// --- Helpers ---

const STAGE_LABELS: Record<string, string> = {
  seedling: "幼苗期",
  vegetative: "營養生長期",
  flowering: "開花期",
  fruiting: "結果期",
  harvest_ready: "可採收",
  dormant: "休眠",
  declining: "衰退",
};

const PLANNING_STATE_LABELS: Record<string, string> = {
  draft: "草稿",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
};

const PLANNING_STATE_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

const ROTATION_FAMILY_LABELS: Record<string, string> = {
  brassica: "十字花科",
  solanaceae: "茄科",
  cucurbit: "瓜科",
  legume: "豆科",
  allium: "蔥蒜科",
  root: "根莖類",
};

function formatDateWindow(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const jun = day <= 10 ? "上旬" : day <= 20 ? "中旬" : "下旬";
    return `${d.getFullYear()}年${month}月${jun}`;
  } catch {
    return null;
  }
}

function formatEndWindowTs(earliest?: number, latest?: number): string | null {
  if (!earliest && !latest) return null;
  const ts = earliest ?? latest!;
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const jun = day <= 10 ? "上旬" : day <= 20 ? "中旬" : "下旬";
  return `${d.getFullYear()}年${month}月${jun}`;
}

// --- Sub-components ---

/** Timeline connector line between nodes */
function TimelineConnector({ dashed = false }: { dashed?: boolean }) {
  return (
    <div className="flex justify-center py-0.5">
      <div
        className={cn(
          "h-4 w-0.5",
          dashed
            ? "border-l border-dashed border-slate-300 dark:border-slate-600"
            : "bg-slate-300 dark:bg-slate-600",
        )}
      />
    </div>
  );
}

/** Timeline dot indicator */
function TimelineDot({
  status,
}: {
  status: "active" | "planned" | "completed" | "orphan";
}) {
  return (
    <div
      className={cn(
        "mt-1 size-2.5 shrink-0 rounded-full border-2 border-background ring-2",
        status === "active" && "bg-emerald-500 ring-emerald-500/20",
        status === "planned" && "bg-blue-500 ring-blue-500/20",
        status === "completed" && "bg-slate-400 ring-slate-400/20",
        status === "orphan" && "bg-amber-400 ring-amber-400/20",
      )}
    />
  );
}

/** History entry (past crop) */
function HistoryEntry({
  cropName,
  rotationFamily,
  startDate,
  endDate,
}: {
  cropName?: string;
  rotationFamily?: string;
  startDate?: string;
  endDate?: string;
}) {
  const start = formatDateWindow(startDate);
  const end = formatDateWindow(endDate);
  const dateRange =
    start && end ? `${start} — ${end}` : start ?? end ?? null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/20 px-2 py-1.5">
      <div className="size-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          {cropName ?? "未知作物"}
        </span>
        {rotationFamily && (
          <Badge
            variant="secondary"
            className="ml-1.5 text-[8px] px-1 py-0 font-normal"
          >
            {ROTATION_FAMILY_LABELS[rotationFamily] ?? rotationFamily}
          </Badge>
        )}
      </div>
      {dateRange && (
        <span className="shrink-0 text-[9px] text-muted-foreground/70">
          {dateRange}
        </span>
      )}
    </div>
  );
}

/** Current crop card at the root of the timeline */
function CurrentCropNode({
  plantedCrop,
  currentEntry,
}: {
  plantedCrop: RegionPlanningInspectorProps["plantedCrop"];
  currentEntry: {
    _id: string;
    cropName?: string;
    planningState?: string;
    startWindow: { earliest?: string; latest?: string };
    endWindow: { earliest?: string; latest?: string };
    isPerennial: boolean;
    overlaps: Array<{ planId: string; cropName?: string }>;
  } | null;
}) {
  const media = resolveCropMedia(plantedCrop.crop);
  const isPerennial = currentEntry?.isPerennial ?? false;
  const estimatedEnd = formatEndWindowTs(
    plantedCrop.endWindowEarliest,
    plantedCrop.endWindowLatest,
  );

  return (
    <div className="relative">
      <div className="flex items-start gap-2">
        <TimelineDot status="active" />
        <div className="min-w-0 flex-1 rounded-lg border border-emerald-200/60 bg-emerald-50/30 p-2.5 dark:border-emerald-800/30 dark:bg-emerald-950/15">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              目前
            </span>
            {isPerennial && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0">
                多年生
              </Badge>
            )}
          </div>

          {/* Crop info */}
          <div className="mt-1 flex items-center gap-1.5">
            <CropAvatar
              name={plantedCrop.crop?.name ?? "未指定作物"}
              emoji={media.emoji}
              imageUrl={media.imageUrl}
              thumbnailUrl={media.thumbnailUrl}
              size="sm"
            />
            <div className="min-w-0">
              <span className="text-xs font-medium leading-tight">
                {plantedCrop.crop?.name ?? "未指定作物"}
              </span>
              {plantedCrop.stage && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({STAGE_LABELS[plantedCrop.stage] ?? plantedCrop.stage})
                </span>
              )}
            </div>
          </div>

          {/* Start/End info */}
          <div className="mt-1.5 space-y-0.5">
            {currentEntry?.startWindow.earliest && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-2.5 shrink-0" />
                開始: {formatDateWindow(currentEntry.startWindow.earliest)}
              </div>
            )}
            {!isPerennial && estimatedEnd && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-2.5 shrink-0" />
                預估結束:{" "}
                <span className="font-medium text-foreground/80">
                  {estimatedEnd}
                </span>
              </div>
            )}
            {isPerennial && (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <HelpCircle className="size-2.5 shrink-0" />
                多年生作物，長期佔用此區域
              </div>
            )}
          </div>

          {/* Overlap warning */}
          {currentEntry &&
            currentEntry.overlaps.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1 rounded bg-amber-100/60 px-1.5 py-0.5 text-[9px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertTriangle className="size-2.5 shrink-0" />
                時間重疊
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/** Successor plan card */
function SuccessorNode({
  plan,
  index,
  onEdit,
}: {
  plan: {
    _id: string;
    cropName?: string;
    planningState?: string;
    startWindow: { earliest?: string; latest?: string };
    endWindow: { earliest?: string; latest?: string };
    overlaps: Array<{ planId: string; cropName?: string }>;
    notes?: string;
  };
  index: number;
  onEdit: (sourceId: string) => void;
}) {
  const startStr = formatDateWindow(plan.startWindow.earliest);
  const endStr = formatDateWindow(plan.endWindow.earliest);
  const stateLabel =
    PLANNING_STATE_LABELS[plan.planningState ?? "draft"] ?? plan.planningState;
  const stateStyle =
    PLANNING_STATE_STYLES[plan.planningState ?? "draft"] ?? "";
  const hasOverlap = plan.overlaps.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left group"
        onClick={() => onEdit(plan._id)}
      >
        <TimelineDot status="planned" />
        <div
          className={cn(
            "min-w-0 flex-1 rounded-lg border p-2.5 transition-colors",
            "border-blue-200/50 bg-blue-50/20 group-hover:bg-blue-50/40",
            "dark:border-blue-800/30 dark:bg-blue-950/10 dark:group-hover:bg-blue-950/25",
            hasOverlap && "ring-1 ring-amber-400/40",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              接續 #{index + 1}
            </span>
            <Badge className={cn("text-[8px] px-1.5 py-0 border-0", stateStyle)}>
              {stateLabel}
            </Badge>
          </div>

          {/* Crop info */}
          <div className="mt-1 flex items-center gap-1.5">
            <ChevronDown className="size-3 shrink-0 text-blue-400/60" />
            <span className="text-xs font-medium">
              {plan.cropName ?? "未指定"}
            </span>
          </div>

          {/* Date info */}
          <div className="mt-1 space-y-0.5">
            {startStr && (
              <div className="text-[10px] text-muted-foreground">
                開始: {startStr}
              </div>
            )}
            {endStr && (
              <div className="text-[10px] text-muted-foreground">
                結束: {endStr}
              </div>
            )}
          </div>

          {/* Overlap warning */}
          {hasOverlap && (
            <div className="mt-1.5 flex items-center gap-1 rounded bg-amber-100/60 px-1.5 py-0.5 text-[9px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="size-2.5 shrink-0" />
              時間重疊
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

/** Orphan plan card (unlinked) */
function OrphanNode({
  plan,
  onEdit,
}: {
  plan: {
    _id: string;
    cropName?: string;
    planningState?: string;
    startWindow: { earliest?: string; latest?: string };
  };
  onEdit: (sourceId: string) => void;
}) {
  const startStr = formatDateWindow(plan.startWindow.earliest);
  const stateLabel =
    PLANNING_STATE_LABELS[plan.planningState ?? "draft"] ?? plan.planningState;

  return (
    <button
      type="button"
      className="flex w-full items-start gap-2 text-left group"
      onClick={() => onEdit(plan._id)}
    >
      <div className="mt-1 size-2.5 shrink-0 rounded-full border-2 border-dashed border-amber-400 dark:border-amber-500" />
      <div
        className={cn(
          "min-w-0 flex-1 rounded-lg border border-dashed p-2.5 transition-colors",
          "border-amber-300/60 bg-amber-50/20 group-hover:bg-amber-50/40",
          "dark:border-amber-700/40 dark:bg-amber-950/10 dark:group-hover:bg-amber-950/25",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link2Off className="size-2.5 text-amber-500" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              未連結
            </span>
          </div>
          <Badge
            variant="secondary"
            className="text-[8px] px-1 py-0 font-normal"
          >
            {stateLabel}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-xs font-medium">
            {plan.cropName ?? "未指定"}
          </span>
          {startStr && (
            <span className="text-[10px] text-muted-foreground">{startStr}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// --- Main Component ---

export function RegionPlanningInspector({
  plantedCrop,
  fieldId,
  onPlanNext,
  onEditPlanning,
}: RegionPlanningInspectorProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  // Unified region plan query
  const regionPlan = useRegionPlan(
    fieldId,
    plantedCrop._id as Id<"plantedCrops">,
    plantedCrop._id,
  );

  // Region history query
  const regionHistory = useRegionHistory(
    fieldId,
    plantedCrop._id as Id<"plantedCrops">,
    plantedCrop._id,
  );

  const currentEntry = regionPlan?.currentCrop ?? null;
  const successors = regionPlan?.successors ?? [];
  const orphanPlans = regionPlan?.orphanPlans ?? [];
  const isPerennial = currentEntry?.isPerennial ?? false;

  const hasHistory = regionHistory && regionHistory.length > 0;
  const hasSuccessors = successors.length > 0;
  const hasOrphans = orphanPlans.length > 0;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 pb-1">
        <div className="flex size-5 items-center justify-center rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <CalendarRange className="size-3" />
        </div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">
          接續計畫
        </h3>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Vertical timeline */}
      <div className="space-y-0">
        {/* History section (collapsible) */}
        {hasHistory && (
          <>
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/30"
                >
                  <History className="size-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    歷史記錄
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[8px] px-1 py-0 font-normal"
                  >
                    {regionHistory!.length}
                  </Badge>
                  {historyOpen ? (
                    <ChevronDown className="ml-auto size-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="ml-auto size-3 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-1 pb-1">
                  {regionHistory!.map((entry) => (
                    <HistoryEntry
                      key={entry._id}
                      cropName={entry.cropName}
                      rotationFamily={entry.rotationFamily}
                      startDate={entry.startDate}
                      endDate={entry.endDate}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
            <TimelineConnector dashed />
          </>
        )}

        {/* Current crop (timeline root) */}
        <CurrentCropNode
          plantedCrop={plantedCrop}
          currentEntry={currentEntry}
        />

        {/* Succession chain */}
        {hasSuccessors && (
          <>
            {successors.map((plan, idx) => (
              <React.Fragment key={plan._id}>
                <TimelineConnector />
                <SuccessorNode
                  plan={plan}
                  index={idx}
                  onEdit={onEditPlanning}
                />
              </React.Fragment>
            ))}
          </>
        )}

        {/* Add successor button */}
        {!isPerennial && (
          <>
            <TimelineConnector dashed />
            <div className="flex items-start gap-2">
              <div className="mt-1 size-2.5 shrink-0 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600" />
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "min-h-[44px] flex-1 border-dashed text-xs",
                  "border-sky-300/60 text-sky-600 hover:bg-sky-50/50 hover:text-sky-700",
                  "dark:border-sky-700/40 dark:text-sky-400 dark:hover:bg-sky-950/30",
                )}
                onClick={onPlanNext}
              >
                <Plus className="size-3.5 mr-1" />
                規劃下一作
              </Button>
            </div>
          </>
        )}

        {/* Orphan plans */}
        {hasOrphans && (
          <>
            <div className="mt-3 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Link2Off className="size-3 text-amber-500" />
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  未連結計畫
                </span>
                <div className="h-px flex-1 bg-amber-200/40 dark:bg-amber-800/30" />
              </div>
            </div>
            <div className="space-y-1.5">
              {orphanPlans.map((plan) => (
                <OrphanNode
                  key={plan._id}
                  plan={plan}
                  onEdit={onEditPlanning}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
