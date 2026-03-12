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
// Source signal label mapping (raw English → zh-TW)
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
// Source badge
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  switch (source) {
    case 'ai_briefing':
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200">
          AI
        </Badge>
      )
    case 'weather':
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-sky-50 text-sky-700 border-sky-200">
          天氣
        </Badge>
      )
    case 'auto_rule':
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-neutral-100 text-neutral-600 border-neutral-200">
          自動
        </Badge>
      )
    // 'manual' — no badge (noise reduction)
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'urgent') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-100 text-rose-700 border-rose-200">
        急
      </Badge>
    )
  }
  if (priority === 'high') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">
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
        'group relative rounded-xl border p-3 transition-all duration-200',
        isCompleted && 'opacity-60 bg-muted/30',
        isSkipped && 'opacity-50 bg-muted/20',
        isOverdue && 'border-l-4 border-l-red-400',
        item.priority === 'urgent' && !isCompleted && !isSkipped && 'border-l-4 border-l-rose-500 bg-rose-50/30',
        !isCompleted && !isSkipped && !isOverdue && item.priority !== 'urgent' && 'hover:bg-accent/50',
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-3">
        {/* Circular checkbox — 44px+ touch target, 24px visual circle */}
        <button
          type="button"
          onClick={handleComplete}
          disabled={isCompleted || isSkipped}
          className="relative flex shrink-0 items-center justify-center min-w-[44px] min-h-[44px] -m-2 mt-[-6px]"
          aria-label={isCompleted ? '已完成' : '完成任務'}
        >
          <span
            className={cn(
              'flex size-[22px] items-center justify-center rounded-full border-[1.5px] transition-all duration-200',
              isCompleted
                ? 'border-emerald-500 bg-emerald-500 text-white scale-100'
                : isSkipped
                  ? 'border-muted-foreground/30 bg-muted text-muted-foreground'
                  : 'border-neutral-300 hover:border-emerald-400 hover:bg-emerald-50 active:scale-90',
              completing && 'scale-110 border-emerald-400 bg-emerald-100',
            )}
          >
            {isCompleted && <Check className="size-3.5 stroke-[2.5]" />}
            {isSkipped && <SkipForward className="size-3 stroke-[2]" />}
          </span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Line 1: title + badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(
              'text-sm font-medium',
              isCompleted && 'line-through text-muted-foreground',
              isSkipped && 'line-through text-muted-foreground',
            )}>
              {sanitizeTaskTitle(item.title)}
            </span>
            <SourceBadge source={item.source} />
            <PriorityBadge priority={item.priority} />
            {item.effortMinutes && !isCompleted && !isSkipped && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="size-3" />
                {item.effortMinutes}分
              </span>
            )}
          </div>

          {/* Line 2: field / crop context */}
          {(fieldName || cropName) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fieldName}
              {fieldName && cropName && ' · '}
              {cropName}
              {isOverdue && item.dueDate && (
                <span className="text-red-500 ml-1.5">
                  逾期 ({item.dueDate})
                </span>
              )}
            </p>
          )}

          {/* Line 3: AI reasoning toggle (for AI/weather tasks) */}
          {item.aiReasoning && !isCompleted && !isSkipped && (
            <button
              type="button"
              onClick={() => setShowAiReasoning(!showAiReasoning)}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 mt-1 transition-colors"
            >
              <ChevronDown
                className={cn(
                  'size-3 transition-transform duration-200',
                  showAiReasoning && 'rotate-180',
                )}
              />
              {showAiReasoning ? '收合 AI 分析' : '展開 AI 分析'}
            </button>
          )}

          {/* AI reasoning expanded content */}
          {showAiReasoning && item.aiReasoning && (
            <div className="mt-2 rounded-lg bg-violet-50/50 border border-violet-100 p-2.5 text-xs space-y-1">
              <div className="flex items-start gap-1.5">
                <Sparkles className="size-3 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-violet-900">{item.aiReasoning}</p>
              </div>
            </div>
          )}

          {/* Completed timestamp */}
          {isCompleted && item.completedAt && (
            <p className="text-[10px] text-emerald-600 mt-0.5">
              完成於 {new Date(item.completedAt).toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Skipped reason */}
          {isSkipped && item.skippedReason && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              跳過原因：{item.skippedReason}
            </p>
          )}
        </div>

        {/* Right side: skip button (for non-completed tasks) */}
        {!isCompleted && !isSkipped && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowSkipReasons(!showSkipReasons)}
            title="跳過"
          >
            <SkipForward className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Skip reason pills */}
      {showSkipReasons && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground mr-1">跳過原因：</span>
          {SKIP_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => handleSkipWithReason(reason.value)}
              className="text-xs px-2.5 py-1 rounded-full border hover:bg-accent transition-colors min-h-[32px]"
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
    <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-3 space-y-2">
      {/* Top: icon + title + badges */}
      <div className="flex items-start gap-2.5">
        <div className="size-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="size-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{item.title}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200">
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
