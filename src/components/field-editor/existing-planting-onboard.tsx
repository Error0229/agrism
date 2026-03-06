"use client";

import React, { useState, useCallback } from "react";
import {
  Sprout,
  TreePine,
  Calendar,
  Clock,
  HelpCircle,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LIFECYCLE_TYPE_LABELS,
  STAGE_LABELS,
} from "./lifecycle-inspector";

// --- Types ---

export interface OnboardingResult {
  isExisting: boolean;
  lifecycleType?: string;
  stage?: string;
  plantedDate?: string;
  startDateMode: "exact" | "relative" | "unknown";
  estimatedAgeDays?: number;
}

interface ExistingPlantingOnboardProps {
  cropName: string;
  cropEmoji?: string;
  onComplete: (result: OnboardingResult) => void;
  onBack: () => void;
}

// Stage color mapping (reuse from lifecycle-inspector)
const STAGE_COLORS: Record<string, string> = {
  seedling: "border-lime-300 bg-lime-50 text-lime-800 dark:border-lime-700 dark:bg-lime-950/40 dark:text-lime-300",
  vegetative: "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-300",
  flowering: "border-pink-300 bg-pink-50 text-pink-800 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  fruiting: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  harvest_ready: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  dormant: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400",
  declining: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
};

const LIFECYCLE_ICONS: Record<string, React.ReactNode> = {
  seasonal: <Sprout className="size-3.5" />,
  long_cycle: <TreePine className="size-3.5" />,
  perennial: <TreePine className="size-3.5" />,
  orchard: <TreePine className="size-3.5" />,
};

// --- Component ---

export function ExistingPlantingOnboard({
  cropName,
  cropEmoji,
  onComplete,
  onBack,
}: ExistingPlantingOnboardProps) {
  const [lifecycleType, setLifecycleType] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<"exact" | "relative" | "unknown">("unknown");
  const [plantedDate, setPlantedDate] = useState("");
  const [monthsAgo, setMonthsAgo] = useState("");

  const handleNewPlanting = useCallback(() => {
    onComplete({
      isExisting: false,
      startDateMode: "exact",
      plantedDate: new Date().toISOString().split("T")[0],
    });
  }, [onComplete]);

  const handleExistingComplete = useCallback(() => {
    const result: OnboardingResult = {
      isExisting: true,
      lifecycleType: lifecycleType ?? undefined,
      stage: stage ?? undefined,
      startDateMode: dateMode,
    };

    if (dateMode === "exact" && plantedDate) {
      result.plantedDate = plantedDate;
    } else if (dateMode === "relative" && monthsAgo) {
      result.estimatedAgeDays = Math.round(parseFloat(monthsAgo) * 30);
    }

    onComplete(result);
  }, [lifecycleType, stage, dateMode, plantedDate, monthsAgo, onComplete]);

  return (
    <div className="space-y-4">
      {/* Header: crop identity */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4 rotate-180" />
        </button>
        <span className="text-lg">{cropEmoji}</span>
        <span className="text-sm font-medium">{cropName}</span>
      </div>

      {/* Question: is this already growing? */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          這是已經在生長的作物嗎？
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-auto flex-col gap-1 py-3 text-xs"
            onClick={handleNewPlanting}
          >
            <Sprout className="size-4 text-green-600" />
            <span>新種植</span>
            <span className="text-[10px] text-muted-foreground">今天開始</span>
          </Button>
          <div className="text-center text-[10px] text-muted-foreground/60 self-center">
            或繼續填寫以下資訊
          </div>
        </div>
      </div>

      {/* Lifecycle type — pill selection */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <TreePine className="size-3" />
          生長類型
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(LIFECYCLE_TYPE_LABELS).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setLifecycleType(lifecycleType === val ? null : val)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all",
                lifecycleType === val
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border/60 text-muted-foreground hover:border-border hover:bg-accent/50",
              )}
            >
              {LIFECYCLE_ICONS[val]}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Current stage — grid of pills */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Sprout className="size-3" />
          目前階段
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STAGE_LABELS).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStage(stage === val ? null : val)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-all",
                stage === val
                  ? STAGE_COLORS[val] + " border font-medium"
                  : "border-border/60 text-muted-foreground hover:border-border hover:bg-accent/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date / age input — segmented control */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Calendar className="size-3" />
          種植時間
        </label>

        {/* Mode selector */}
        <div className="flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {([
            { key: "unknown" as const, label: "不確定", icon: <HelpCircle className="size-3" /> },
            { key: "relative" as const, label: "大約", icon: <Clock className="size-3" /> },
            { key: "exact" as const, label: "確切日期", icon: <Calendar className="size-3" /> },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setDateMode(key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] transition-all",
                dateMode === key
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Conditional input based on mode */}
        {dateMode === "unknown" && (
          <p className="rounded-md border border-dashed border-border/40 bg-muted/20 px-3 py-2 text-center text-[11px] text-muted-foreground/70">
            不確定也沒關係，之後可以隨時補充
          </p>
        )}

        {dateMode === "relative" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">大約</span>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="幾"
              className="h-8 w-20 text-center text-xs"
              value={monthsAgo}
              onChange={(e) => setMonthsAgo(e.target.value)}
              autoFocus
            />
            <span className="text-xs text-muted-foreground">個月前種的</span>
          </div>
        )}

        {dateMode === "exact" && (
          <Input
            type="date"
            className="h-8 text-xs"
            value={plantedDate}
            onChange={(e) => setPlantedDate(e.target.value)}
            autoFocus
          />
        )}
      </div>

      {/* Submit */}
      <Button
        size="sm"
        className="w-full"
        onClick={handleExistingComplete}
      >
        <Check className="mr-1 size-3.5" />
        確認已有種植
      </Button>
    </div>
  );
}
