'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TaskRow,
  RecommendationRow,
  getTaskTypeKey,
  getTaskTheme,
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
  ChevronRight,
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

    // Task items
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
// Group tasks by type for visual clustering
// ---------------------------------------------------------------------------

interface TypeGroup {
  typeKey: string
  label: string
  items: UnifiedTaskItem[]
}

function groupByType(tasks: UnifiedTaskItem[]): TypeGroup[] {
  const groups = new Map<string, UnifiedTaskItem[]>()

  for (const task of tasks) {
    const key = getTaskTypeKey(task)
    const existing = groups.get(key)
    if (existing) {
      existing.push(task)
    } else {
      groups.set(key, [task])
    }
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    typeKey: key,
    label: getTaskTheme(items[0]!).label,
    items,
  }))
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  count,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count: number
  variant?: 'urgent' | 'today' | 'ai' | 'default'
}) {
  const colorMap = {
    urgent: {
      icon: 'text-rose-600',
      text: 'text-rose-900',
      count: 'text-rose-600',
      line: 'bg-rose-200',
    },
    today: {
      icon: 'text-emerald-600',
      text: 'text-stone-800',
      count: 'text-emerald-600',
      line: 'bg-emerald-200',
    },
    ai: {
      icon: 'text-amber-600',
      text: 'text-stone-800',
      count: 'text-amber-600',
      line: 'bg-amber-200',
    },
    default: {
      icon: 'text-stone-400',
      text: 'text-stone-600',
      count: 'text-stone-500',
      line: 'bg-stone-200',
    },
  }

  const colors = colorMap[variant]

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <Icon className={cn('size-[18px]', colors.icon)} />
        <span className={cn('text-[15px] font-semibold', colors.text)}>{title}</span>
        <span className={cn('text-sm font-medium tabular-nums', colors.count)}>
          {count}
        </span>
      </div>
      <div className={cn('flex-1 h-px', colors.line)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Type group sub-header (inline label for clustered tasks)
// ---------------------------------------------------------------------------

function TypeGroupHeader({ group }: { group: TypeGroup }) {
  const theme = getTaskTheme(group.items[0]!)
  const TypeIcon = theme.icon

  // Only show group header when 2+ tasks of same type
  if (group.items.length < 2) return null

  return (
    <div className="flex items-center gap-2 col-span-full">
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted-foreground">
        <TypeIcon className={cn('size-3', theme.iconColor)} />
        <span className="font-medium">{group.label}</span>
        <span className="text-muted-foreground/60">x{group.items.length}</span>
      </div>
      <div className="flex-1 h-px bg-border/40" />
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

  // Group today's tasks by type for visual clustering
  // Must be called before any early returns to satisfy React hooks rules
  const todayTypeGroups = useMemo(
    () => (grouped ? groupByType(grouped.today) : []),
    [grouped],
  )

  if (loading || !grouped) {
    return (
      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
    <div className="space-y-6">
      {/* Urgent section */}
      {grouped.urgent.length > 0 && (
        <div className="space-y-4">
          <SectionHeader
            icon={Zap}
            title="緊急"
            count={grouped.urgent.length}
            variant="urgent"
          />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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

      {/* Today section -- grouped by task type */}
      {grouped.today.length > 0 && (
        <div className="space-y-4">
          <SectionHeader
            icon={CalendarCheck}
            title="今日待辦"
            count={grouped.today.length}
            variant="today"
          />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {todayTypeGroups.map((group) => (
              <TypeGroupFragment
                key={group.typeKey}
                group={group}
                fieldNames={fieldNames}
                cropNames={cropNames}
                onComplete={onComplete}
                onSkip={onSkip}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions section */}
      {grouped.aiSuggestions.length > 0 && (
        <div className="space-y-4">
          <SectionHeader
            icon={Lightbulb}
            title="AI 建議"
            count={grouped.aiSuggestions.length}
            variant="ai"
          />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setUpcomingOpen(!upcomingOpen)}
            className="flex items-center gap-2.5 py-2 px-4 rounded-full bg-stone-100 hover:bg-stone-200/70 transition-colors w-fit"
          >
            <CalendarDays className="size-4 text-stone-500" />
            <span className="text-sm font-semibold text-stone-600">即將到來</span>
            <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-stone-400 text-white">
              {grouped.upcoming.length}
            </span>
            {upcomingOpen ? (
              <ChevronDown className="size-4 text-stone-400" />
            ) : (
              <ChevronRight className="size-4 text-stone-400" />
            )}
          </button>
          {upcomingOpen && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setCompletedOpen(!completedOpen)}
            className="flex items-center gap-2.5 py-2 px-4 rounded-full bg-emerald-100 hover:bg-emerald-200/70 transition-colors w-fit"
          >
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">已完成</span>
            <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-emerald-500 text-white">
              {grouped.completed.length}
            </span>
            {completedOpen ? (
              <ChevronDown className="size-4 text-emerald-500" />
            ) : (
              <ChevronRight className="size-4 text-emerald-500" />
            )}
          </button>
          {completedOpen && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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

// ---------------------------------------------------------------------------
// Type group fragment (renders group header + items in grid flow)
// ---------------------------------------------------------------------------

function TypeGroupFragment({
  group,
  fieldNames,
  cropNames,
  onComplete,
  onSkip,
}: {
  group: TypeGroup
  fieldNames: FieldLookup
  cropNames: CropLookup
  onComplete: (taskId: Id<'tasks'>) => void
  onSkip: (taskId: Id<'tasks'>, reason?: string) => void
}) {
  const getFieldName = (item: UnifiedTaskItem) => {
    if (item.fieldId) return fieldNames[item.fieldId] ?? undefined
    return undefined
  }

  const getCropName = (item: UnifiedTaskItem) => {
    if (item.cropId) return cropNames[item.cropId] ?? undefined
    return undefined
  }

  return (
    <>
      <TypeGroupHeader group={group} />
      {group.items.map((item) => (
        <TaskRow
          key={item._id}
          item={item}
          fieldName={getFieldName(item)}
          cropName={getCropName(item)}
          onComplete={onComplete}
          onSkip={onSkip}
        />
      ))}
    </>
  )
}
