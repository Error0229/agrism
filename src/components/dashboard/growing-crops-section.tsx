"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CropAvatar } from "@/components/crops/crop-avatar"
import { cn } from "@/lib/utils"
import {
  STAGE_LABELS,
  STAGE_COLORS,
  STAGE_BORDER_COLORS,
  STAGE_DOT_COLORS,
  LIFECYCLE_TYPE_SHORT_LABELS,
  PROGRESSION_STAGES,
} from "@/lib/constants/lifecycle"
import {
  Sprout,
  Clock,
  AlertTriangle,
  CalendarRange,
  Timer,
  TreePine,
  Trees,
} from "lucide-react"
import { differenceInDays, format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrowingEntry {
  _id: string
  cropName: string
  cropEmoji: string
  cropImageUrl: string
  cropThumbnailUrl: string
  fieldName: string
  plantedDate?: string
  customGrowthDays?: number
  growthDays: number
  stage?: string
  lifecycleType?: string
  stageConfidence?: string
  timelineConfidence?: string
  estimatedAgeDays?: number
  endWindowEarliest?: number
  endWindowLatest?: number
  stageUpdatedAt?: number
}

interface GrowingCropsSectionProps {
  entries: GrowingEntry[]
  loading: boolean
}

// ---------------------------------------------------------------------------
// Lifecycle type icon helper
// ---------------------------------------------------------------------------

function LifecycleTypeIcon({ type }: { type: string }) {
  const cls = "size-3 shrink-0"
  switch (type) {
    case "seasonal":
      return <CalendarRange className={cls} />
    case "long_cycle":
      return <Timer className={cls} />
    case "perennial":
      return <TreePine className={cls} />
    case "orchard":
      return <Trees className={cls} />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Segmented stage progress bar
// ---------------------------------------------------------------------------

function StageProgressBar({ currentStage }: { currentStage?: string }) {
  const currentIndex = currentStage
    ? PROGRESSION_STAGES.indexOf(
        currentStage as (typeof PROGRESSION_STAGES)[number],
      )
    : -1

  // For dormant/declining, show a special state
  const isDormantOrDeclining =
    currentStage === "dormant" || currentStage === "declining"

  return (
    <div className="flex items-center gap-0.5">
      {PROGRESSION_STAGES.map((stage, i) => {
        const isActive = i <= currentIndex && !isDormantOrDeclining
        const isCurrent = stage === currentStage
        const dotColor = STAGE_DOT_COLORS[stage] ?? "bg-stone-200"

        return (
          <div
            key={stage}
            className="group relative flex-1"
            title={STAGE_LABELS[stage] ?? stage}
          >
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                isActive ? dotColor : "bg-stone-100 dark:bg-stone-800",
                isCurrent && "ring-1 ring-offset-1 ring-stone-300",
              )}
            />
          </div>
        )
      })}
      {isDormantOrDeclining && (
        <div className="ml-0.5 flex items-center">
          <div
            className={cn(
              "h-1.5 w-4 rounded-full",
              STAGE_DOT_COLORS[currentStage ?? ""] ?? "bg-slate-300",
            )}
            title={STAGE_LABELS[currentStage ?? ""] ?? currentStage}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Harvest window display
// ---------------------------------------------------------------------------

function HarvestCountdown({
  entry,
}: {
  entry: GrowingEntry
}) {
  const { endWindowEarliest, endWindowLatest, plantedDate, customGrowthDays, growthDays } = entry

  // If we have explicit end windows, show date range
  if (endWindowEarliest) {
    const earliest = new Date(endWindowEarliest)
    const latest = endWindowLatest ? new Date(endWindowLatest) : null
    const now = new Date()
    const daysUntil = differenceInDays(earliest, now)

    const earlyStr = format(earliest, "M/d")
    const lateStr = latest ? format(latest, "M/d") : null

    if (daysUntil <= 0) {
      return (
        <span className="text-emerald-600 font-semibold text-[11px]">
          可採收
        </span>
      )
    }

    return (
      <span className="text-[11px] text-stone-500">
        <span className="text-stone-400">預計</span>{" "}
        <span className="font-medium text-stone-600 tabular-nums">
          {earlyStr}
          {lateStr && lateStr !== earlyStr ? `~${lateStr}` : ""}
        </span>
      </span>
    )
  }

  // Fallback: compute from planted date + growth days
  if (plantedDate) {
    const planted = new Date(plantedDate)
    const totalDays = customGrowthDays ?? growthDays ?? 90
    const daysSince = differenceInDays(new Date(), planted)
    const remaining = Math.max(0, totalDays - daysSince)

    if (remaining <= 0) {
      return (
        <span className="text-emerald-600 font-semibold text-[11px]">
          可採收
        </span>
      )
    }

    return (
      <span className="text-amber-600 font-medium text-[11px] tabular-nums">
        {remaining} 天後收成
      </span>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Single crop card
// ---------------------------------------------------------------------------

const CropLifecycleCard = React.memo(function CropLifecycleCard({ entry }: { entry: GrowingEntry }) {
  const stage = entry.stage
  const hasLowConfidence =
    entry.stageConfidence === "low" || entry.timelineConfidence === "low"

  const borderColor = stage
    ? STAGE_BORDER_COLORS[stage] ?? "border-l-stone-200"
    : "border-l-stone-200"

  // Days since planted
  const daysSincePlanted = useMemo(() => {
    if (entry.estimatedAgeDays) return entry.estimatedAgeDays
    if (!entry.plantedDate) return null
    return differenceInDays(new Date(), new Date(entry.plantedDate))
  }, [entry.estimatedAgeDays, entry.plantedDate])

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-stone-200 bg-white p-3 space-y-2",
        "border-l-[3px] transition-all hover:shadow-md hover:border-stone-300",
        borderColor,
        "dark:bg-stone-950 dark:border-stone-800 dark:hover:border-stone-700",
      )}
    >
      {/* Low confidence attention indicator */}
      {hasLowConfidence && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <span
            className="flex size-5 items-center justify-center rounded-full bg-amber-100 border border-amber-300 shadow-sm"
            title="資料信心度低，建議確認"
          >
            <AlertTriangle className="size-2.5 text-amber-600" />
          </span>
        </div>
      )}

      {/* Row 1: Avatar + Name + Stage badge */}
      <div className="flex items-start gap-2">
        <CropAvatar
          name={entry.cropName}
          emoji={entry.cropEmoji}
          imageUrl={entry.cropImageUrl}
          thumbnailUrl={entry.cropThumbnailUrl}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate text-stone-800 dark:text-stone-200">
              {entry.cropName}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 truncate">
            {entry.fieldName}
          </p>
        </div>
      </div>

      {/* Row 2: Stage badge + Lifecycle type */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {stage && STAGE_LABELS[stage] && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[11px] px-1.5 py-0 h-[18px] font-medium border-0",
              STAGE_COLORS[stage] ?? "bg-stone-100 text-stone-600",
            )}
          >
            {STAGE_LABELS[stage]}
          </Badge>
        )}
        {entry.lifecycleType && LIFECYCLE_TYPE_SHORT_LABELS[entry.lifecycleType] && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-stone-400">
            <LifecycleTypeIcon type={entry.lifecycleType} />
            {LIFECYCLE_TYPE_SHORT_LABELS[entry.lifecycleType]}
          </span>
        )}
      </div>

      {/* Row 3: Segmented stage progress */}
      <StageProgressBar currentStage={stage} />

      {/* Row 4: Days + Harvest countdown */}
      <div className="flex items-center justify-between">
        {daysSincePlanted !== null ? (
          <span className="text-[11px] text-stone-400 flex items-center gap-0.5">
            <Clock className="size-2.5" />
            第 {daysSincePlanted} 天
          </span>
        ) : (
          <span />
        )}
        <HarvestCountdown entry={entry} />
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Loading skeleton card
// ---------------------------------------------------------------------------

function CropCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2.5 border-l-[3px] border-l-stone-100">
      {/* Avatar + name */}
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-md" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
      {/* Badges */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-[18px] w-12 rounded-full" />
        <Skeleton className="h-3 w-10" />
      </div>
      {/* Progress bar */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
        ))}
      </div>
      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function GrowingCropsSection({
  entries,
  loading,
}: GrowingCropsSectionProps) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Sprout className="size-[18px] text-emerald-600" />
          <span className="text-[15px] font-semibold text-stone-800">
            生長中作物
          </span>
          {!loading && entries.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-[18px] bg-emerald-50 text-emerald-600 border-0"
            >
              {entries.length}
            </Badge>
          )}
        </div>
        <div className="flex-1 h-px bg-emerald-200" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CropCardSkeleton key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-stone-50 border border-stone-200">
            <Sprout className="size-7 text-stone-300" />
          </div>
          <p className="text-sm font-medium text-stone-500">
            目前沒有生長中的作物
          </p>
          <p className="text-xs text-stone-400 mt-1">
            前往田地頁面規劃種植，開始追蹤作物生長
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Link href="/fields">前往田地規劃種植</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map((entry) => (
            <CropLifecycleCard key={entry._id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
