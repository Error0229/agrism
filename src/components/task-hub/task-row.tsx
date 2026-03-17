'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn, sanitizeTaskTitle } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Check,
  ChevronDown,
  Sparkles,
  Clock,
  SkipForward,
  Lightbulb,
  Plus,
  Droplets,
  Leaf,
  Scissors,
  Bug,
  Sprout,
  Wheat,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import type { Id } from '../../../convex/_generated/dataModel'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A unified task item from getUnifiedTasks */
export interface UnifiedTaskItem {
  kind: 'task'
  _id: Id<'tasks'>
  type: string
  title: string
  source: string
  status: string
  priority: string
  dueDate?: string
  completed: boolean
  cropId?: Id<'crops'>
  fieldId?: Id<'fields'>
  aiReasoning?: string
  description?: string
  aiConfidence?: string
  aiSourceSignals?: string[]
  effortMinutes?: number
  completedAt?: number
  skippedReason?: string
  sortKey: number
}

/** A unified recommendation item from getUnifiedTasks */
export interface UnifiedRecommendationItem {
  kind: 'recommendation'
  _id: Id<'recommendations'>
  type: string
  title: string
  summary: string
  recommendedAction: string
  priority: string
  confidence: string
  reasoning: string
  sourceSignals: string[]
  status: string
  relatedCropId?: Id<'crops'>
  relatedFieldId?: Id<'fields'>
  createdAt: number
  sortKey: number
}

export type UnifiedItem = UnifiedTaskItem | UnifiedRecommendationItem

interface TaskRowProps {
  item: UnifiedTaskItem
  fieldName?: string
  cropName?: string
  onComplete: (taskId: Id<'tasks'>) => void
  onSkip: (taskId: Id<'tasks'>, reason?: string) => void
}

interface RecommendationRowProps {
  item: UnifiedRecommendationItem
  fieldName?: string
  cropName?: string
  onPromote: (recId: Id<'recommendations'>) => void
  onSnooze: (recId: Id<'recommendations'>) => void
  onDismiss: (recId: Id<'recommendations'>, reason?: string) => void
}

// ---------------------------------------------------------------------------
// Source signal label mapping (raw English -> zh-TW)
// ---------------------------------------------------------------------------

const SOURCE_SIGNAL_LABELS: Record<string, string> = {
  pendingTasks: '待辦任務',
  recentWeather: '近期天氣',
  plantedCrops: '種植作物',
  activePlans: '進行中計畫',
  fields: '田區資料',
  farm: '農場資料',
  currentDate: '當前日期',
  currentMonth: '當前月份',
  recentFeedback: '近期回饋',
  weatherForecast: '天氣預報',
}

/** Translate raw signal names to zh-TW; pass through if already Chinese */
function translateSignal(signal: string): string {
  return SOURCE_SIGNAL_LABELS[signal] ?? signal
}

// ---------------------------------------------------------------------------
// Task type theme system
// ---------------------------------------------------------------------------

interface TaskTypeTheme {
  icon: React.ComponentType<{ className?: string }>
  label: string
  // Card color tiers: bg, border, text for normal / high / urgent
  bgBase: string
  bgHigh: string
  bgUrgent: string
  borderBase: string
  borderHigh: string
  borderUrgent: string
  iconColor: string
  accentText: string
}

const TASK_TYPE_THEMES: Record<string, TaskTypeTheme> = {
  watering: {
    icon: Droplets,
    label: '澆水',
    bgBase: 'bg-white',
    bgHigh: 'bg-white',
    bgUrgent: 'bg-white',
    borderBase: 'border-stone-200',
    borderHigh: 'border-stone-200',
    borderUrgent: 'border-rose-200',
    iconColor: 'text-sky-500',
    accentText: 'text-sky-700',
  },
  fertilizing: {
    icon: Leaf,
    label: '施肥',
    bgBase: 'bg-white',
    bgHigh: 'bg-white',
    bgUrgent: 'bg-white',
    borderBase: 'border-stone-200',
    borderHigh: 'border-stone-200',
    borderUrgent: 'border-rose-200',
    iconColor: 'text-emerald-500',
    accentText: 'text-emerald-700',
  },
  pest_control: {
    icon: Bug,
    label: '病蟲害巡檢',
    bgBase: 'bg-white',
    bgHigh: 'bg-white',
    bgUrgent: 'bg-white',
    borderBase: 'border-stone-200',
    borderHigh: 'border-stone-200',
    borderUrgent: 'border-rose-200',
    iconColor: 'text-amber-500',
    accentText: 'text-amber-700',
  },
  seeding: {
    icon: Sprout,
    label: '播種',
    bgBase: 'bg-white',
    bgHigh: 'bg-white',
    bgUrgent: 'bg-white',
    borderBase: 'border-stone-200',
    borderHigh: 'border-stone-200',
    borderUrgent: 'border-rose-200',
    iconColor: 'text-teal-500',
    accentText: 'text-teal-700',
  },
  pruning: {
    icon: Scissors,
    label: '剪枝',
    bgBase: 'bg-white',
    bgHigh: 'bg-white',
    bgUrgent: 'bg-white',
    borderBase: 'border-stone-200',
    borderHigh: 'border-stone-200',
    borderUrgent: 'border-rose-200',
    iconColor: 'text-violet-500',
    accentText: 'text-violet-700',
  },
  harvesting: {
    icon: Wheat,
    label: '收成',
    bgBase: 'bg-white',
    bgHigh: 'bg-white',
    bgUrgent: 'bg-white',
    borderBase: 'border-stone-200',
    borderHigh: 'border-stone-200',
    borderUrgent: 'border-rose-200',
    iconColor: 'text-orange-500',
    accentText: 'text-orange-700',
  },
  typhoon_prep: {
    icon: ShieldAlert,
    label: '防颱',
    bgBase: 'bg-white',
    bgHigh: 'bg-white',
    bgUrgent: 'bg-white',
    borderBase: 'border-stone-200',
    borderHigh: 'border-stone-200',
    borderUrgent: 'border-rose-200',
    iconColor: 'text-rose-500',
    accentText: 'text-rose-700',
  },
}

const DEFAULT_THEME: TaskTypeTheme = {
  icon: Clock,
  label: '任務',
  bgBase: 'bg-white',
  bgHigh: 'bg-white',
  bgUrgent: 'bg-white',
  borderBase: 'border-stone-200',
  borderHigh: 'border-stone-200',
  borderUrgent: 'border-rose-200',
  iconColor: 'text-stone-400',
  accentText: 'text-stone-700',
}

/** Detect task type from the task's type field or title keywords */
export function getTaskTypeKey(item: { type: string; title: string }): string {
  // Direct type match
  if (item.type in TASK_TYPE_THEMES) return item.type

  // Keyword detection from title (zh-TW)
  const title = item.title
  if (title.includes('澆水') || title.includes('灌溉') || title.includes('補水')) return 'watering'
  if (title.includes('施肥') || title.includes('追肥') || title.includes('堆肥')) return 'fertilizing'
  if (title.includes('病蟲') || title.includes('巡檢') || title.includes('蟲害') || title.includes('防治')) return 'pest_control'
  if (title.includes('播種') || title.includes('育苗') || title.includes('種植')) return 'seeding'
  if (title.includes('剪枝') || title.includes('修剪') || title.includes('整枝')) return 'pruning'
  if (title.includes('收成') || title.includes('採收') || title.includes('收穫')) return 'harvesting'
  if (title.includes('防颱') || title.includes('颱風') || title.includes('加固')) return 'typhoon_prep'

  return 'default'
}

export function getTaskTheme(item: { type: string; title: string }): TaskTypeTheme {
  const key = getTaskTypeKey(item)
  return TASK_TYPE_THEMES[key] ?? DEFAULT_THEME
}

// ---------------------------------------------------------------------------
// Source badge (used only in RecommendationRow now; TaskRow uses inline labels)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Priority badge (larger, more visible)
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'urgent') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-50 text-rose-600 border-rose-200 font-semibold">
        急
      </Badge>
    )
  }
  if (priority === 'high') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200 font-semibold">
        高
      </Badge>
    )
  }
  return null
}

// ---------------------------------------------------------------------------
// Skip reason pills
// ---------------------------------------------------------------------------

const SKIP_REASONS = [
  { label: '天氣不佳', value: '天氣不佳' },
  { label: '沒時間', value: '沒時間' },
  { label: '不需要', value: '不需要' },
  { label: '其他', value: '其他' },
] as const

// ---------------------------------------------------------------------------
// TaskRow component
// ---------------------------------------------------------------------------

export function TaskRow({
  item,
  fieldName,
  cropName,
  onComplete,
  onSkip,
}: TaskRowProps) {
  const [completing, setCompleting] = useState(false)
  const [showAiReasoning, setShowAiReasoning] = useState(false)

  const isCompleted = item.status === 'completed' || item.completed
  const isSkipped = item.status === 'skipped'
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0]!, [])
  const isOverdue =
    item.dueDate &&
    item.dueDate < todayStr &&
    !isCompleted &&
    !isSkipped

  const theme = getTaskTheme(item)
  const TypeIcon = theme.icon

  // All cards are white with stone border; overdue handled separately
  const bgColor = theme.bgBase
  const borderColor = theme.borderBase

  const handleComplete = async () => {
    if (completing || isCompleted) return
    setCompleting(true)
    try {
      await onComplete(item._id)
    } finally {
      setCompleting(false)
    }
  }

  const handleSkipWithReason = async (reason: string) => {
    try {
      await onSkip(item._id, reason)
    } catch {
      toast.error('跳過任務失敗，請重試')
    }
  }

  // Color strip on left edge per type
  const stripColorMap: Record<string, string> = {
    watering: 'bg-sky-400',
    fertilizing: 'bg-emerald-400',
    pest_control: 'bg-amber-400',
    seeding: 'bg-teal-400',
    pruning: 'bg-violet-400',
    harvesting: 'bg-orange-400',
    typhoon_prep: 'bg-rose-400',
    default: 'bg-stone-300',
  }
  const typeKey = getTaskTypeKey(item)
  const stripColor = stripColorMap[typeKey] ?? stripColorMap.default

  // Confidence color for AI analysis
  const confidenceColor = item.aiConfidence === 'high'
    ? 'bg-emerald-100 text-emerald-700'
    : item.aiConfidence === 'medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700'
  const confidenceLabel = item.aiConfidence === 'high' ? '高' : item.aiConfidence === 'medium' ? '中' : '低'

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border transition-all duration-200',
        // Clean white cards with consistent border
        !isCompleted && !isSkipped && bgColor,
        !isCompleted && !isSkipped && borderColor,
        // Overdue: subtle red border
        isOverdue && 'border-rose-300',
        // Urgent: slightly elevated
        item.priority === 'urgent' && !isCompleted && !isSkipped && 'shadow-sm',
        // Completed/skipped states
        isCompleted && 'opacity-50 bg-stone-50 border-stone-200 shadow-none',
        isSkipped && 'opacity-40 bg-stone-50 border-stone-200 shadow-none',
        // Hover
        !isCompleted && !isSkipped && 'hover:shadow-md hover:border-stone-300',
      )}
    >
      {/* Left color strip -- type indicator */}
      {!isCompleted && !isSkipped && (
        <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', stripColor)} />
      )}

      {/* Card body */}
      <div className="flex items-start gap-2 px-2.5 py-2 pl-3">
        {/* LEFT: Action buttons - ButtonGroup */}
        {!isCompleted && !isSkipped && (
          <ButtonGroup className="shrink-0 self-start mt-0.5 gap-0">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'size-7',
                completing ? 'bg-emerald-50 border-emerald-400' : 'hover:border-emerald-400 hover:bg-emerald-50',
              )}
              onClick={handleComplete}
              title="完成"
              aria-label="完成任務"
            >
              <Check className={cn(
                'size-3.5 transition-colors',
                completing ? 'text-emerald-500' : 'text-stone-300 hover:text-emerald-500',
              )} />
            </Button>
            <ButtonGroupSeparator />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7 text-stone-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50"
                  title="跳過"
                  aria-label="跳過任務"
                >
                  <SkipForward className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-auto p-2" sideOffset={4}>
                <p className="text-[11px] text-muted-foreground mb-1.5 px-1">跳過原因</p>
                <div className="flex flex-col gap-0.5">
                  {SKIP_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => handleSkipWithReason(reason.value)}
                      className="text-left text-[12px] px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors whitespace-nowrap"
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </ButtonGroup>
        )}

        {/* Completed state indicator - LEFT side */}
        {isCompleted && (
          <div className="flex items-center justify-center size-7 shrink-0 self-start mt-0.5">
            <div className="flex size-4.5 items-center justify-center rounded border-[1.5px] border-emerald-400 bg-emerald-100">
              <Check className="size-2.5 text-emerald-500 stroke-[2.5]" />
            </div>
          </div>
        )}

        {/* Skipped state indicator - LEFT side */}
        {isSkipped && (
          <div className="flex items-center justify-center size-7 shrink-0 self-start mt-0.5">
            <SkipForward className="size-3.5 text-stone-400" />
          </div>
        )}

        {/* CENTER: Main content - takes full remaining width */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Title + Priority badge (top-right for balance) */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <TypeIcon className={cn('size-4 shrink-0', theme.iconColor)} />
              <h4 className={cn(
                'text-sm font-medium truncate',
                isCompleted && 'line-through text-muted-foreground',
                isSkipped && 'line-through text-muted-foreground',
              )}>
                {sanitizeTaskTitle(item.title)}
              </h4>
              {item.source === 'ai_briefing' && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0 rounded-full shrink-0 font-medium">AI</span>
              )}
              {item.source === 'weather' && (
                <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0 rounded-full shrink-0 font-medium">天氣</span>
              )}
              {item.source === 'auto_rule' && (
                <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0 rounded-full shrink-0 font-medium">自動</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isOverdue && item.dueDate && (
                <Badge className="text-[10px] px-1.5 py-0 bg-rose-100 text-rose-700 border-rose-200 font-semibold">
                  逾期
                </Badge>
              )}
              <PriorityBadge priority={item.priority} />
            </div>
          </div>

          {/* Row 2: Description - fills the card body */}
          {item.description && (
            <p className="text-xs text-stone-600 mt-1 line-clamp-2 whitespace-pre-line">
              {item.description}
            </p>
          )}

          {/* Row 3: AI Analysis (foldable, default collapsed) */}
          {item.aiReasoning && !isCompleted && !isSkipped && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setShowAiReasoning(!showAiReasoning)}
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 transition-colors"
              >
                <Sparkles className="size-3 text-amber-400" />
                <ChevronDown className={cn("size-3 transition-transform", showAiReasoning && "rotate-180")} />
              </button>
              {showAiReasoning && (
                <div className="mt-1 rounded-md bg-stone-50 px-2.5 py-2 text-xs text-stone-600 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <Sparkles className="size-3 text-amber-500 shrink-0 mt-0.5" />
                    <span>{item.aiReasoning}</span>
                  </div>
                  {(item.aiConfidence || (item.aiSourceSignals && item.aiSourceSignals.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-stone-200">
                      {item.aiConfidence && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', confidenceColor)}>
                          信心：{confidenceLabel}
                        </span>
                      )}
                      {item.aiSourceSignals?.map((signal) => (
                        <span key={signal} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {translateSignal(signal)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completed timestamp */}
          {isCompleted && item.completedAt && (
            <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">
              完成於 {new Date(item.completedAt).toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Skipped reason */}
          {isSkipped && item.skippedReason && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              跳過原因：{item.skippedReason}
            </p>
          )}

          {/* Row 4: Bottom metadata — only if there's content */}
          {(fieldName || cropName || (item.effortMinutes && !isCompleted && !isSkipped)) && (
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-500">
              {(fieldName || cropName) && (
                <span className="flex items-center gap-0">
                  {fieldName && (
                    item.fieldId ? (
                      <Link
                        href={`/fields/${item.fieldId}`}
                        className="text-primary hover:underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {fieldName}
                      </Link>
                    ) : (
                      <span>{fieldName}</span>
                    )
                  )}
                  {fieldName && cropName && <span className="mx-1">·</span>}
                  {cropName && (
                    item.cropId ? (
                      <Link
                        href={`/crops/${item.cropId}`}
                        className="text-primary hover:underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {cropName}
                      </Link>
                    ) : (
                      <span>{cropName}</span>
                    )
                  )}
                </span>
              )}
              {item.effortMinutes && !isCompleted && !isSkipped && (
                <span className="flex items-center gap-0.5">
                  <Clock className="size-3" />
                  {item.effortMinutes}分
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RecommendationRow component (unaccepted AI suggestions)
// ---------------------------------------------------------------------------

export function RecommendationRow({
  item,
  fieldName,
  cropName,
  onPromote,
  onSnooze,
  onDismiss,
}: RecommendationRowProps) {
  const [showReasoning, setShowReasoning] = useState(false)

  const confidenceColor = item.confidence === 'high'
    ? 'bg-emerald-100 text-emerald-700'
    : item.confidence === 'medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700'
  const confidenceLabel = item.confidence === 'high' ? '高' : item.confidence === 'medium' ? '中' : '低'

  return (
    <div className="group relative overflow-hidden rounded-xl border border-amber-200 bg-white transition-all hover:shadow-md hover:border-amber-300">
      {/* Left color strip -- amber for AI suggestions */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-amber-400" />

      {/* Card body */}
      <div className="px-3 py-2 pl-3.5">
        {/* Row 1: Icon + Title + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lightbulb className="size-4 shrink-0 text-amber-500" />
            <h4 className="text-sm font-medium truncate">{item.title}</h4>
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0 rounded-full shrink-0 font-medium">AI</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PriorityBadge priority={item.priority} />
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', confidenceColor)}>
              {confidenceLabel}
            </span>
          </div>
        </div>

        {/* Row 2: Summary */}
        <p className="text-xs text-stone-600 mt-1 line-clamp-2">{item.summary}</p>

        {/* Row 3: AI reasoning (foldable, default collapsed) */}
        {item.reasoning && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 transition-colors"
            >
              <Sparkles className="size-3 text-amber-400" />
              <ChevronDown className={cn("size-3 transition-transform", showReasoning && "rotate-180")} />
            </button>
            {showReasoning && (
              <div className="mt-1 rounded-md bg-stone-50 px-2.5 py-2 text-xs text-stone-600 leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <Sparkles className="size-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>{item.reasoning}</span>
                </div>
                {item.recommendedAction && (
                  <div className="flex items-start gap-1.5 mt-1.5 pt-1.5 border-t border-stone-200">
                    <span className="text-[11px] font-medium text-stone-500 shrink-0">建議：</span>
                    <span className="text-[11px]">{item.recommendedAction}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Row 4: Metadata — only if there's content */}
        {(fieldName || cropName || item.sourceSignals.length > 0) && (
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-500">
            {(fieldName || cropName) && (
              <span className="flex items-center gap-0">
                {fieldName && (
                  item.relatedFieldId ? (
                    <Link
                      href={`/fields/${item.relatedFieldId}`}
                      className="text-primary hover:underline underline-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {fieldName}
                    </Link>
                  ) : (
                    <span>{fieldName}</span>
                  )
                )}
                {fieldName && cropName && <span className="mx-1">·</span>}
                {cropName && (
                  item.relatedCropId ? (
                    <Link
                      href={`/crops/${item.relatedCropId}`}
                      className="text-primary hover:underline underline-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {cropName}
                    </Link>
                  ) : (
                    <span>{cropName}</span>
                  )
                )}
              </span>
            )}
            {item.sourceSignals.length > 0 && (
              <div className="flex items-center gap-1">
                {item.sourceSignals.map((signal) => (
                  <span key={signal} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {translateSignal(signal)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Action buttons — visually distinct from task actions */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-stone-100">
        <Button
          size="sm"
          className="h-6 text-[11px] gap-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full"
          onClick={() => onPromote(item._id)}
        >
          <Plus className="size-3" />
          加入待辦
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] gap-1 px-2 text-stone-500 hover:text-stone-700 rounded-full"
          onClick={() => onSnooze(item._id)}
        >
          <Clock className="size-3" />
          稍後
        </Button>
        <button
          type="button"
          className="h-6 text-[11px] text-stone-400 hover:text-stone-600 transition-colors ml-auto"
          onClick={() => onDismiss(item._id)}
        >
          忽略
        </button>
      </div>
    </div>
  )
}
