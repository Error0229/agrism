'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn, sanitizeTaskTitle } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Check,
  Sparkles,
  ChevronDown,
  Clock,
  SkipForward,
  Lightbulb,
  Droplets,
  Leaf,
  Scissors,
  Bug,
  Sprout,
  Wheat,
  ShieldAlert,
} from 'lucide-react'
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
    bgBase: 'bg-sky-50/70',
    bgHigh: 'bg-sky-100/80',
    bgUrgent: 'bg-sky-100',
    borderBase: 'border-sky-200',
    borderHigh: 'border-sky-300',
    borderUrgent: 'border-sky-400',
    iconColor: 'text-sky-500',
    accentText: 'text-sky-700',
  },
  fertilizing: {
    icon: Leaf,
    label: '施肥',
    bgBase: 'bg-emerald-50/70',
    bgHigh: 'bg-emerald-100/80',
    bgUrgent: 'bg-emerald-100',
    borderBase: 'border-emerald-200',
    borderHigh: 'border-emerald-300',
    borderUrgent: 'border-emerald-400',
    iconColor: 'text-emerald-500',
    accentText: 'text-emerald-700',
  },
  pest_control: {
    icon: Bug,
    label: '病蟲害巡檢',
    bgBase: 'bg-amber-50/70',
    bgHigh: 'bg-amber-100/80',
    bgUrgent: 'bg-amber-100',
    borderBase: 'border-amber-200',
    borderHigh: 'border-amber-300',
    borderUrgent: 'border-amber-400',
    iconColor: 'text-amber-500',
    accentText: 'text-amber-700',
  },
  seeding: {
    icon: Sprout,
    label: '播種',
    bgBase: 'bg-teal-50/70',
    bgHigh: 'bg-teal-100/80',
    bgUrgent: 'bg-teal-100',
    borderBase: 'border-teal-200',
    borderHigh: 'border-teal-300',
    borderUrgent: 'border-teal-400',
    iconColor: 'text-teal-500',
    accentText: 'text-teal-700',
  },
  pruning: {
    icon: Scissors,
    label: '剪枝',
    bgBase: 'bg-violet-50/70',
    bgHigh: 'bg-violet-100/80',
    bgUrgent: 'bg-violet-100',
    borderBase: 'border-violet-200',
    borderHigh: 'border-violet-300',
    borderUrgent: 'border-violet-400',
    iconColor: 'text-violet-500',
    accentText: 'text-violet-700',
  },
  harvesting: {
    icon: Wheat,
    label: '收成',
    bgBase: 'bg-orange-50/70',
    bgHigh: 'bg-orange-100/80',
    bgUrgent: 'bg-orange-100',
    borderBase: 'border-orange-200',
    borderHigh: 'border-orange-300',
    borderUrgent: 'border-orange-400',
    iconColor: 'text-orange-500',
    accentText: 'text-orange-700',
  },
  typhoon_prep: {
    icon: ShieldAlert,
    label: '防颱',
    bgBase: 'bg-rose-50/70',
    bgHigh: 'bg-rose-100/80',
    bgUrgent: 'bg-rose-100',
    borderBase: 'border-rose-200',
    borderHigh: 'border-rose-300',
    borderUrgent: 'border-rose-400',
    iconColor: 'text-rose-500',
    accentText: 'text-rose-700',
  },
}

const DEFAULT_THEME: TaskTypeTheme = {
  icon: Clock,
  label: '任務',
  bgBase: 'bg-stone-50/70',
  bgHigh: 'bg-stone-100/80',
  bgUrgent: 'bg-stone-100',
  borderBase: 'border-stone-200',
  borderHigh: 'border-stone-300',
  borderUrgent: 'border-stone-400',
  iconColor: 'text-stone-500',
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
// Source badge
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  switch (source) {
    case 'ai_briefing':
      return (
        <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-700 border-violet-200 font-medium">
          AI
        </Badge>
      )
    case 'weather':
      return (
        <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-sky-50 text-sky-700 border-sky-200 font-medium">
          天氣
        </Badge>
      )
    case 'auto_rule':
      return (
        <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-600 border-stone-200 font-medium">
          自動
        </Badge>
      )
    // 'manual' -- no badge (noise reduction)
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Priority badge (larger, more visible)
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'urgent') {
    return (
      <Badge className="text-[11px] px-2 py-0.5 bg-rose-500 text-white border-rose-600 font-bold shadow-sm shadow-rose-200">
        急
      </Badge>
    )
  }
  if (priority === 'high') {
    return (
      <Badge className="text-[11px] px-2 py-0.5 bg-orange-500 text-white border-orange-600 font-bold shadow-sm shadow-orange-200">
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
  const [showAiReasoning, setShowAiReasoning] = useState(false)
  const [showSkipReasons, setShowSkipReasons] = useState(false)
  const [completing, setCompleting] = useState(false)

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

  // Select color tier based on priority
  const bgColor = item.priority === 'urgent'
    ? theme.bgUrgent
    : item.priority === 'high'
      ? theme.bgHigh
      : theme.bgBase
  const borderColor = item.priority === 'urgent'
    ? theme.borderUrgent
    : item.priority === 'high'
      ? theme.borderHigh
      : theme.borderBase

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
    setShowSkipReasons(false)
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl border-[1.5px] shadow-sm transition-all duration-200',
        // Type-based coloring
        !isCompleted && !isSkipped && bgColor,
        !isCompleted && !isSkipped && borderColor,
        // Overdue: red ring override
        isOverdue && 'ring-2 ring-red-300/60 border-red-300',
        // Urgent: subtle glow
        item.priority === 'urgent' && !isCompleted && !isSkipped && 'shadow-md',
        // Completed/skipped states
        isCompleted && 'opacity-60 bg-muted/30 border-muted shadow-none',
        isSkipped && 'opacity-50 bg-muted/20 border-muted shadow-none',
        // Hover
        !isCompleted && !isSkipped && 'hover:shadow-md hover:-translate-y-0.5',
      )}
    >
      {/* Card body */}
      <div className="p-3">
        {/* Top: type icon + title row */}
        <div className="flex items-start gap-2.5">
          {/* Type icon circle */}
          <div className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            isCompleted
              ? 'bg-emerald-100'
              : isSkipped
                ? 'bg-muted'
                : 'bg-white/80 shadow-sm',
          )}>
            {isCompleted ? (
              <Check className="size-4 text-emerald-600 stroke-[2.5]" />
            ) : isSkipped ? (
              <SkipForward className="size-3.5 text-muted-foreground" />
            ) : (
              <TypeIcon className={cn('size-4', theme.iconColor)} />
            )}
          </div>

          {/* Title + context */}
          <div className="flex-1 min-w-0">
            <span className={cn(
              'text-[13px] font-semibold leading-snug line-clamp-2',
              isCompleted && 'line-through text-muted-foreground',
              isSkipped && 'line-through text-muted-foreground',
            )}>
              {sanitizeTaskTitle(item.title)}
            </span>
            {/* Context: field / crop */}
            {(fieldName || cropName) && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {fieldName}
                {fieldName && cropName && ' · '}
                {cropName}
              </p>
            )}
          </div>

          {/* Checkbox button -- top-right */}
          {!isCompleted && !isSkipped && (
            <button
              type="button"
              onClick={handleComplete}
              className="relative flex shrink-0 items-center justify-center min-w-[32px] min-h-[32px] -m-1 mt-[-2px]"
              aria-label="完成任務"
            >
              <span
                className={cn(
                  'flex size-[20px] items-center justify-center rounded-full border-[1.5px] transition-all duration-200',
                  'border-neutral-300 hover:border-emerald-400 hover:bg-emerald-50 active:scale-90',
                  completing && 'scale-110 border-emerald-400 bg-emerald-100',
                )}
              >
                {completing && <Check className="size-3 text-emerald-500 stroke-[2.5]" />}
              </span>
            </button>
          )}

          {/* Skip button -- top-right corner */}
          {!isCompleted && !isSkipped && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-1"
              onClick={() => setShowSkipReasons(!showSkipReasons)}
              title="跳過"
            >
              <SkipForward className="size-3 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <PriorityBadge priority={item.priority} />
          <SourceBadge source={item.source} />
          {item.effortMinutes && !isCompleted && !isSkipped && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 bg-white/60 rounded-full px-1.5 py-0.5">
              <Clock className="size-3" />
              {item.effortMinutes}分
            </span>
          )}
          {isOverdue && item.dueDate && (
            <Badge className="text-[11px] px-2 py-0.5 bg-red-500 text-white border-red-600 font-bold animate-pulse">
              逾期
            </Badge>
          )}
        </div>

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

        {/* AI reasoning toggle */}
        {item.aiReasoning && !isCompleted && !isSkipped && (
          <button
            type="button"
            onClick={() => setShowAiReasoning(!showAiReasoning)}
            className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 mt-2 transition-colors"
          >
            <ChevronDown
              className={cn(
                'size-3 transition-transform duration-200',
                showAiReasoning && 'rotate-180',
              )}
            />
            {showAiReasoning ? '收合' : 'AI 分析'}
          </button>
        )}

        {/* AI reasoning expanded */}
        {showAiReasoning && item.aiReasoning && (
          <div className="mt-2 rounded-lg bg-white/70 border border-violet-100 p-2 text-[11px]">
            <div className="flex items-start gap-1.5">
              <Sparkles className="size-3 text-violet-500 mt-0.5 shrink-0" />
              <p className="text-violet-900">{item.aiReasoning}</p>
            </div>
          </div>
        )}
      </div>

      {/* Skip reason pills -- slides out from card bottom */}
      {showSkipReasons && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2.5 pt-2 border-t border-inherit">
          <span className="text-[11px] text-muted-foreground mr-0.5">原因：</span>
          {SKIP_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => handleSkipWithReason(reason.value)}
              className="text-[11px] px-2 py-0.5 rounded-full border hover:bg-accent transition-colors"
            >
              {reason.label}
            </button>
          ))}
        </div>
      )}
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

  const confidenceLabel =
    item.confidence === 'high' ? '高信心' :
    item.confidence === 'medium' ? '中信心' : '低信心'

  return (
    <div className="rounded-xl border-[1.5px] border-dashed border-violet-200 bg-gradient-to-br from-violet-50/50 to-fuchsia-50/30 p-3 space-y-2 transition-all hover:shadow-md hover:-translate-y-0.5">
      {/* Top: icon + title + badges */}
      <div className="flex items-start gap-2.5">
        <div className="size-8 rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Lightbulb className="size-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">{item.title}</span>
            <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-700 border-violet-200 font-medium">
              AI
            </Badge>
            <PriorityBadge priority={item.priority} />
          </div>
          {(fieldName || cropName) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fieldName}
              {fieldName && cropName && ' · '}
              {cropName}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
        </div>
      </div>

      {/* Reasoning toggle */}
      <button
        type="button"
        onClick={() => setShowReasoning(!showReasoning)}
        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors"
      >
        <ChevronDown
          className={cn(
            'size-3 transition-transform duration-200',
            showReasoning && 'rotate-180',
          )}
        />
        {showReasoning ? '收合分析' : '展開 AI 分析'}
      </button>

      {/* Expanded reasoning */}
      {showReasoning && (
        <div className="rounded-lg bg-white/70 border border-violet-100 p-2.5 text-xs space-y-1.5">
          <div>
            <span className="font-medium text-muted-foreground">建議行動：</span>
            <span>{item.recommendedAction}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">分析原因：</span>
            <span>{item.reasoning}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-muted-foreground">信心度：</span>
            <span>{confidenceLabel}</span>
          </div>
          {item.sourceSignals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.sourceSignals.map((signal) => (
                <Badge key={signal} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {translateSignal(signal)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-8 text-xs gap-1 min-w-[80px]"
          onClick={() => onPromote(item._id)}
        >
          <Check className="size-3" />
          加入待辦
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={() => onSnooze(item._id)}
        >
          <Clock className="size-3" />
          稍後
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs gap-1 text-muted-foreground"
          onClick={() => onDismiss(item._id)}
        >
          忽略
        </Button>
      </div>
    </div>
  )
}
