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
// Source badge
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  switch (source) {
    case 'ai_briefing':
      return (
        <span className="text-[10px] text-stone-400 font-medium">AI</span>
      )
    case 'weather':
      return (
        <span className="text-[10px] text-stone-400 font-medium">天氣</span>
      )
    case 'auto_rule':
      return (
        <span className="text-[10px] text-stone-400 font-medium">自動</span>
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
    setShowSkipReasons(false)
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
      <div className="px-2.5 py-2 pl-3">
        {/* Top: type icon + title row */}
        <div className="flex items-start gap-2.5">
          {/* Type icon -- simple, no background box */}
          <div className="flex size-5 shrink-0 items-center justify-center mt-0.5">
            {isCompleted ? (
              <Check className="size-4 text-emerald-500 stroke-[2.5]" />
            ) : isSkipped ? (
              <SkipForward className="size-3.5 text-stone-400" />
            ) : (
              <TypeIcon className={cn('size-4', theme.iconColor)} />
            )}
          </div>

          {/* Title + context */}
          <div className="flex-1 min-w-0">
            <span className={cn(
              'text-[13px] font-medium leading-snug line-clamp-2',
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
            {/* Description (from promoted recommendations) */}
            {item.description && (
              <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <PriorityBadge priority={item.priority} />
          <SourceBadge source={item.source} />
          {item.effortMinutes && !isCompleted && !isSkipped && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="size-3" />
              {item.effortMinutes}分
            </span>
          )}
          {isOverdue && item.dueDate && (
            <Badge className="text-[11px] px-1.5 py-0 bg-rose-100 text-rose-700 border-rose-200 font-semibold">
              逾期
            </Badge>
          )}
        </div>

        {/* Action buttons - always visible */}
        {!isCompleted && !isSkipped && (
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-stone-100">
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all',
                'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.98]',
                completing && 'bg-emerald-100'
              )}
            >
              <Check className="size-3.5 stroke-[2.5]" />
              <span>{completing ? '完成中...' : '完成'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSkipReasons(!showSkipReasons)}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100 transition-all active:scale-[0.98]"
            >
              <SkipForward className="size-3.5" />
              <span>跳過</span>
            </button>
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

        {/* AI reasoning toggle */}
        {item.aiReasoning && !isCompleted && !isSkipped && (
          <button
            type="button"
            onClick={() => setShowAiReasoning(!showAiReasoning)}
            className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 mt-2 transition-colors"
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
          <div className="mt-2 rounded-lg bg-stone-50 border border-stone-200 p-2 text-[11px] space-y-1.5">
            <div className="flex items-start gap-1.5">
              <Sparkles className="size-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-stone-700">{item.aiReasoning}</p>
            </div>
            {item.aiConfidence && (
              <div className="flex items-center gap-1.5 pl-[18px]">
                <span className="font-medium text-muted-foreground">信心度：</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    item.aiConfidence === 'high' && 'bg-emerald-100 text-emerald-700',
                    item.aiConfidence === 'medium' && 'bg-amber-100 text-amber-700',
                    item.aiConfidence === 'low' && 'bg-rose-100 text-rose-700',
                  )}
                >
                  {item.aiConfidence === 'high' ? '高' : item.aiConfidence === 'medium' ? '中' : '低'}
                </Badge>
              </div>
            )}
            {item.aiSourceSignals && item.aiSourceSignals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pl-[18px]">
                <span className="font-medium text-muted-foreground">依據：</span>
                {item.aiSourceSignals.map((signal) => (
                  <Badge key={signal} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {translateSignal(signal)}
                  </Badge>
                ))}
              </div>
            )}
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
    <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white px-2.5 py-2 space-y-2 transition-all hover:shadow-md hover:border-stone-300">
      {/* Left color strip -- amber for AI suggestions */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-amber-400" />

      {/* Top: icon + title + badges */}
      <div className="flex items-start gap-2.5 pl-0.5">
        <div className="flex size-5 shrink-0 items-center justify-center mt-0.5">
          <Lightbulb className="size-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-medium">{item.title}</span>
            <span className="text-[10px] text-stone-400 font-medium">AI</span>
            <PriorityBadge priority={item.priority} />
          </div>
          {(fieldName || cropName) && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {fieldName}
              {fieldName && cropName && ' · '}
              {cropName}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
        </div>
      </div>

      {/* Reasoning toggle */}
      <button
        type="button"
        onClick={() => setShowReasoning(!showReasoning)}
        className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 transition-colors pl-0.5"
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
        <div className="rounded-lg bg-stone-50 border border-stone-150 p-2.5 text-xs space-y-1.5 ml-0.5">
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
      <div className="flex items-center gap-2 pl-0.5">
        <Button
          size="sm"
          className="h-7 text-xs gap-1 bg-stone-800 hover:bg-stone-900 text-white"
          onClick={() => onPromote(item._id)}
        >
          <Check className="size-3" />
          加入待辦
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => onSnooze(item._id)}
        >
          <Clock className="size-3" />
          稍後
        </Button>
        <button
          type="button"
          className="h-7 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onDismiss(item._id)}
        >
          忽略
        </button>
      </div>
    </div>
  )
}
