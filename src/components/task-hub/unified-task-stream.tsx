'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TaskRow,
  RecommendationRow,
  type UnifiedItem,
  type UnifiedTaskItem,
  type UnifiedRecommendationItem,
} from './task-row'
import {
  Zap,
  CalendarCheck,
  Lightbulb,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldLookup {
  [fieldId: string]: string // fieldId -> fieldName
}
interface CropLookup {
  [cropId: string]: string // cropId -> cropName
}

interface UnifiedTaskStreamProps {
  items: UnifiedItem[] | undefined
  loading: boolean
  fieldNames: FieldLookup
  cropNames: CropLookup
  onComplete: (taskId: Id<'tasks'>) => void
  onSkip: (taskId: Id<'tasks'>, reason?: string) => void
  onPromote: (recId: Id<'recommendations'>) => void
  onSnooze: (recId: Id<'recommendations'>) => void
  onDismiss: (recId: Id<'recommendations'>, reason?: string) => void
}

// ---------------------------------------------------------------------------
// Grouping logic
// ---------------------------------------------------------------------------

interface GroupedItems {
  urgent: UnifiedTaskItem[]      // urgent + overdue tasks
  today: UnifiedTaskItem[]       // today's pending tasks
  aiSuggestions: UnifiedRecommendationItem[]  // unaccepted recommendations
  upcoming: UnifiedTaskItem[]    // future tasks
  completed: UnifiedTaskItem[]  // done tasks
  skipped: UnifiedTaskItem[] // skipped tasks
}

function isTaskItem(item: UnifiedItem): item is UnifiedTaskItem {
  return item.kind === 'task'
}

function groupItems(items: UnifiedItem[]): GroupedItems {
  const today = new Date().toISOString().split('T')[0]!

  const urgent: UnifiedTaskItem[] = []
  const todayItems: UnifiedTaskItem[] = []
  const aiSuggestions: UnifiedRecommendationItem[] = []
  const upcoming: UnifiedTaskItem[] = []
  const completed: UnifiedTaskItem[] = []
  const skipped: UnifiedTaskItem[] = []

  for (const item of items) {
    if (item.kind === 'recommendation') {
      aiSuggestions.push(item)
      continue
    }

    // Task items — narrowed via type guard
    if (!isTaskItem(item)) continue
    const task = item
    if (task.status === 'completed' || task.completed) {
      completed.push(task)
      continue
    }
    if (task.status === 'skipped') {
      skipped.push(task)
      continue
    }

    // Categorize active tasks
    const isOverdue = task.dueDate && task.dueDate < today
    const isDueToday = task.dueDate === today
    const isUrgentPriority = task.priority === 'urgent' || task.priority === 'high'

    if (isOverdue || (isDueToday && isUrgentPriority)) {
      urgent.push(task)
    } else if (isDueToday || !task.dueDate) {
      todayItems.push(task)
    } else {
      upcoming.push(task)
    }
  }

  return { urgent, today: todayItems, aiSuggestions, upcoming, completed, skipped }
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  count,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count: number
  iconClassName?: string
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className={cn('size-4', iconClassName)} />
      <span className="text-sm font-semibold">{title}</span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
        {count}
      </Badge>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnifiedTaskStream({
  items,
  loading,
  fieldNames,
  cropNames,
  onComplete,
  onSkip,
  onPromote,
  onSnooze,
  onDismiss,
}: UnifiedTaskStreamProps) {
  const [completedOpen, setCompletedOpen] = useState(false)
  const [upcomingOpen, setUpcomingOpen] = useState(false)

  const grouped = useMemo(() => {
    if (!items) return null
    return groupItems(items)
  }, [items])

  if (loading || !grouped) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const hasAnyItems =
    grouped.urgent.length > 0 ||
    grouped.today.length > 0 ||
    grouped.aiSuggestions.length > 0 ||
    grouped.upcoming.length > 0

  if (!hasAnyItems && grouped.completed.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <CheckCircle2 className="mx-auto size-10 mb-3 text-emerald-400" />
        <p className="text-sm font-medium">今天沒有待辦農務</p>
        <p className="text-xs mt-1">點擊右下角的 + 按鈕新增任務</p>
      </div>
    )
  }

  const getFieldName = (item: UnifiedItem) => {
    if (item.kind === 'task' && item.fieldId) return fieldNames[item.fieldId] ?? undefined
    if (item.kind === 'recommendation' && item.relatedFieldId) return fieldNames[item.relatedFieldId] ?? undefined
    return undefined
  }

  const getCropName = (item: UnifiedItem) => {
    if (item.kind === 'task' && item.cropId) return cropNames[item.cropId] ?? undefined
    if (item.kind === 'recommendation' && item.relatedCropId) return cropNames[item.relatedCropId] ?? undefined
    return undefined
  }

  return (
    <div className="space-y-4">
      {/* Urgent section */}
      {grouped.urgent.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={Zap}
            title="緊急"
            count={grouped.urgent.length}
            iconClassName="text-rose-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {grouped.urgent.map((item) => (
              <TaskRow
                key={item._id}
                item={item}
                fieldName={getFieldName(item)}
                cropName={getCropName(item)}
                onComplete={onComplete}
                onSkip={onSkip}
              />
            ))}
          </div>
        </div>
      )}

      {/* Today section */}
      {grouped.today.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={CalendarCheck}
            title="今日待辦"
            count={grouped.today.length}
            iconClassName="text-emerald-600"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {grouped.today.map((item) => (
              <TaskRow
                key={item._id}
                item={item}
                fieldName={getFieldName(item)}
                cropName={getCropName(item)}
                onComplete={onComplete}
                onSkip={onSkip}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions section */}
      {grouped.aiSuggestions.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            icon={Lightbulb}
            title="AI 建議"
            count={grouped.aiSuggestions.length}
            iconClassName="text-violet-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {grouped.aiSuggestions.map((item) => (
              <RecommendationRow
                key={item._id}
                item={item}
                fieldName={getFieldName(item)}
                cropName={getCropName(item)}
                onPromote={onPromote}
                onSnooze={onSnooze}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming section (collapsed by default) */}
      {grouped.upcoming.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setUpcomingOpen(!upcomingOpen)}
            className="flex items-center gap-2 py-1 w-full"
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">即將到來</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {grouped.upcoming.length}
            </Badge>
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground ml-auto transition-transform duration-200',
                upcomingOpen && 'rotate-180',
              )}
            />
          </button>
          {upcomingOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {grouped.upcoming.map((item) => (
                <TaskRow
                  key={item._id}
                  item={item}
                  fieldName={getFieldName(item)}
                  cropName={getCropName(item)}
                  onComplete={onComplete}
                  onSkip={onSkip}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed section (collapsed by default) */}
      {grouped.completed.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setCompletedOpen(!completedOpen)}
            className="flex items-center gap-2 py-1 w-full"
          >
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">已完成</span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700"
            >
              {grouped.completed.length}
            </Badge>
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground ml-auto transition-transform duration-200',
                completedOpen && 'rotate-180',
              )}
            />
          </button>
          {completedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {grouped.completed.map((item) => (
                <TaskRow
                  key={item._id}
                  item={item}
                  fieldName={getFieldName(item)}
                  cropName={getCropName(item)}
                  onComplete={onComplete}
                  onSkip={onSkip}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
