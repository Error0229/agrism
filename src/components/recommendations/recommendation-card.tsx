'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Sprout,
  Scissors,
  CloudRain,
  CalendarRange,
  Bug,
  Lightbulb,
  Check,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  useAcceptRecommendation,
  useSnoozeRecommendation,
  useDismissRecommendation,
  useCompleteRecommendation,
} from '@/hooks/use-recommendations'
import type { Id } from '../../../convex/_generated/dataModel'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Recommendation {
  _id: Id<'recommendations'>
  type: string
  title: string
  summary: string
  recommendedAction: string
  priority: 'high' | 'medium' | 'low'
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  sourceSignals: string[]
  status: string
  relatedCropId?: Id<'crops'>
  relatedFieldId?: Id<'fields'>
  createdAt: number
}

interface RecommendationCardProps {
  recommendation: Recommendation
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  care: Sprout,
  harvest: Scissors,
  weather: CloudRain,
  planning: CalendarRange,
  pest: Bug,
  general: Lightbulb,
}

// ---------------------------------------------------------------------------
// Priority / confidence labels & colors
// ---------------------------------------------------------------------------

const PRIORITY_CONFIG = {
  high: { label: '急', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  medium: { label: '中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: '低', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
} as const

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '高信心',
  medium: '中信心',
  low: '低信心',
}

const BORDER_COLORS: Record<string, string> = {
  high: 'border-l-rose-500',
  medium: 'border-l-amber-500',
  low: 'border-l-emerald-500',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommendationCard({ recommendation: rec }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showDismissInput, setShowDismissInput] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

  const accept = useAcceptRecommendation()
  const snooze = useSnoozeRecommendation()
  const dismiss = useDismissRecommendation()
  const complete = useCompleteRecommendation()

  const Icon = TYPE_ICONS[rec.type] ?? Lightbulb
  const priority = PRIORITY_CONFIG[rec.priority]
  const borderColor = BORDER_COLORS[rec.priority]

  const handleAccept = async () => {
    try {
      await accept({ recommendationId: rec._id })
      toast.success('已接受')
    } catch {
      toast.error('操作失敗')
    }
  }

  const handleSnooze = async () => {
    try {
      await snooze({ recommendationId: rec._id })
      toast.success('已延後')
    } catch {
      toast.error('操作失敗')
    }
  }

  const handleComplete = async () => {
    try {
      await complete({ recommendationId: rec._id })
      toast.success('已標記完成')
    } catch {
      toast.error('操作失敗')
    }
  }

  const handleDismissClick = () => {
    setShowDismissInput(true)
  }

  const handleDismissConfirm = async () => {
    try {
      await dismiss({
        recommendationId: rec._id,
        reason: dismissReason.trim() || undefined,
      })
      toast.success('已忽略')
      setShowDismissInput(false)
      setDismissReason('')
    } catch {
      toast.error('操作失敗')
    }
  }

  return (
    <Card
      className={cn(
        'border-l-4 py-0 gap-0 overflow-hidden transition-all',
        borderColor,
      )}
    >
      <CardContent className="px-4 py-3 space-y-2">
        {/* Top row: icon + title + badges */}
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold truncate flex-1">{rec.title}</span>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0', priority.className)}
          >
            {priority.label}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {CONFIDENCE_LABELS[rec.confidence] ?? rec.confidence}
          </Badge>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-2">{rec.summary}</p>

        {/* Expandable detail */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={cn(
              'size-3 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
          {expanded ? '收合' : '詳細資訊'}
        </button>

        <div
          className={cn(
            'grid transition-all duration-200 ease-in-out',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-2 pt-1 pb-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">建議行動</p>
                <p className="text-sm">{rec.recommendedAction}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">分析原因</p>
                <p className="text-sm">{rec.reasoning}</p>
              </div>
              {rec.sourceSignals.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rec.sourceSignals.map((signal) => (
                    <Badge
                      key={signal}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 text-muted-foreground"
                    >
                      {signal}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAccept}>
            <Check className="size-3" />
            執行
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleComplete}
          >
            <CheckCircle className="size-3" />
            已完成
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleSnooze}
          >
            <Clock className="size-3" />
            稍後
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={handleDismissClick}
          >
            <X className="size-3" />
            忽略
          </Button>
        </div>

        {/* Dismiss reason input */}
        {showDismissInput && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              placeholder="忽略原因（選填）"
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDismissConfirm()
              }}
              className="h-7 text-xs flex-1"
              autoFocus
              onBlur={() => {
                // Small delay to allow button click to register
                setTimeout(() => {
                  if (showDismissInput) handleDismissConfirm()
                }, 150)
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs shrink-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDismissConfirm}
            >
              確認忽略
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
