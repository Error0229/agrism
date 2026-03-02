'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isBefore,
  isToday,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Wrench,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useFarmId } from '@/hooks/use-farm-id'
import { useTasks, useToggleTask, useDeleteTask } from '@/hooks/use-tasks'
import { useCrops } from '@/hooks/use-crops'
import { useFields } from '@/hooks/use-fields'
import { TaskType, TaskDifficulty } from '@/lib/types/enums'
import {
  TASK_TYPE_LABELS,
  TASK_DIFFICULTY_LABELS,
} from '@/lib/types/labels'
import { cn } from '@/lib/utils'
import { AddTaskDialog } from '@/components/calendar/add-task-dialog'

// ── Task type dot colors ──────────────────────────────────────────────
const TASK_DOT_COLORS: Record<TaskType, string> = {
  seeding: 'bg-green-500',
  fertilizing: 'bg-yellow-500',
  watering: 'bg-blue-500',
  pruning: 'bg-purple-500',
  harvesting: 'bg-orange-500',
  typhoon_prep: 'bg-red-500',
  pest_control: 'bg-pink-500',
}

const TASK_BADGE_COLORS: Record<TaskType, string> = {
  seeding: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  fertilizing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  watering: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pruning: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  harvesting: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  typhoon_prep: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  pest_control: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
}

const DIFFICULTY_BADGE_COLORS: Record<TaskDifficulty, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const ALL_TASK_TYPES = 'all'

export default function CalendarPage() {
  const farmId = useFarmId()
  const { data: tasks = [] } = useTasks(farmId)
  const { data: crops = [] } = useCrops(farmId)
  const { data: fields = [] } = useFields(farmId)
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()

  // ── Calendar state ────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // ── Filter state ──────────────────────────────────────────────────
  const [filterType, setFilterType] = useState(ALL_TASK_TYPES)
  const [filterCompleted, setFilterCompleted] = useState(ALL_TASK_TYPES)

  // ── Month navigation ──────────────────────────────────────────────
  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1))
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1))
  const goToday = () => {
    setCurrentMonth(startOfMonth(new Date()))
    setSelectedDate(new Date())
  }

  // ── Build calendar grid ───────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentMonth])

  // ── Build task lookup by date ─────────────────────────────────────
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    for (const task of tasks) {
      const key = task.dueDate
      const list = map.get(key)
      if (list) {
        list.push(task)
      } else {
        map.set(key, [task])
      }
    }
    return map
  }, [tasks])

  // ── Overdue dates (incomplete tasks before today) ─────────────────
  const overdueDates = useMemo(() => {
    const today = new Date()
    const set = new Set<string>()
    for (const task of tasks) {
      if (!task.completed && isBefore(new Date(task.dueDate), today) && !isToday(new Date(task.dueDate))) {
        set.add(task.dueDate)
      }
    }
    return set
  }, [tasks])

  // ── Filtered task list ────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let list = [...tasks]

    // Date filter: if a day is selected, filter by that day
    if (selectedDate) {
      const key = format(selectedDate, 'yyyy-MM-dd')
      list = list.filter((t) => t.dueDate === key)
    }

    // Type filter
    if (filterType !== ALL_TASK_TYPES) {
      list = list.filter((t) => t.type === filterType)
    }

    // Completed filter
    if (filterCompleted === 'completed') {
      list = list.filter((t) => t.completed)
    } else if (filterCompleted === 'incomplete') {
      list = list.filter((t) => !t.completed)
    }

    // Sort by due date
    list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))

    return list
  }, [tasks, selectedDate, filterType, filterCompleted])

  // ── Helpers ───────────────────────────────────────────────────────
  function getTaskDotsForDay(dateStr: string): TaskType[] {
    const dayTasks = tasksByDate.get(dateStr)
    if (!dayTasks) return []
    const types = new Set<TaskType>()
    for (const t of dayTasks) types.add(t.type as TaskType)
    return [...types]
  }

  function getCropName(cropId: string | null) {
    if (!cropId) return null
    const crop = crops.find((c) => c.id === cropId)
    return crop ? `${crop.emoji ?? ''} ${crop.name}` : null
  }

  function getFieldName(fieldId: string | null) {
    if (!fieldId) return null
    const field = fields.find((f) => f.id === fieldId)
    return field?.name ?? null
  }

  return (
    <div className="space-y-6">
      {/* ── Month Calendar Grid ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={prevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[140px] text-center">
                {format(currentMonth, 'yyyy年 M月', { locale: zhTW })}
              </h2>
              <Button variant="outline" size="icon-sm" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={goToday}>
              今天
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const selected = selectedDate ? isSameDay(day, selectedDate) : false
              const overdue = overdueDates.has(dateStr)
              const dots = getTaskDotsForDay(dateStr)

              return (
                <button
                  key={dateStr}
                  onClick={() =>
                    setSelectedDate((prev) =>
                      prev && isSameDay(prev, day) ? null : day,
                    )
                  }
                  className={cn(
                    'relative flex flex-col items-center justify-center py-2 px-1 min-h-[52px] text-sm transition-colors rounded-md',
                    !inMonth && 'text-muted-foreground/40',
                    inMonth && 'hover:bg-accent',
                    today && 'ring-2 ring-primary ring-inset',
                    selected && 'bg-primary/10',
                    overdue && inMonth && 'bg-red-50 dark:bg-red-950/30',
                  )}
                >
                  <span className={cn('leading-none', today && 'font-bold text-primary')}>
                    {format(day, 'd')}
                  </span>
                  {dots.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[32px]">
                      {dots.slice(0, 4).map((type) => (
                        <span
                          key={type}
                          className={cn('size-1.5 rounded-full', TASK_DOT_COLORS[type])}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Task List ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="size-5" />
              {selectedDate
                ? format(selectedDate, 'M月d日 (EEEE)', { locale: zhTW })
                : '所有任務'}
            </CardTitle>
            <AddTaskDialog />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TASK_TYPES}>全部類型</SelectItem>
                {(Object.values(TaskType) as TaskType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TASK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCompleted} onValueChange={setFilterCompleted}>
              <SelectTrigger className="w-[120px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TASK_TYPES}>全部狀態</SelectItem>
                <SelectItem value="incomplete">未完成</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>

            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(null)}
              >
                清除日期篩選
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {filteredTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {selectedDate ? '此日期無任務' : '尚無任務'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const cropName = getCropName(task.cropId)
                const fieldName = getFieldName(task.fieldId)
                const taskType = task.type as TaskType
                const taskDifficulty = task.difficulty as TaskDifficulty | null
                const isOverdue =
                  !task.completed &&
                  isBefore(new Date(task.dueDate), new Date()) &&
                  !isToday(new Date(task.dueDate))

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                      task.completed && 'opacity-50',
                      isOverdue && 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
                    )}
                  >
                    {/* Toggle complete button */}
                    <button
                      onClick={() => toggleTask.mutate(task.id)}
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                        task.completed
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-muted-foreground/30 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950',
                      )}
                    >
                      {task.completed && <Check className="size-3" />}
                    </button>

                    {/* Task info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', TASK_BADGE_COLORS[taskType])}
                        >
                          {TASK_TYPE_LABELS[taskType]}
                        </Badge>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            task.completed && 'line-through',
                          )}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{format(new Date(task.dueDate), 'M/d (EEE)', { locale: zhTW })}</span>
                        {cropName && <span>{cropName}</span>}
                        {fieldName && <span>{fieldName}</span>}
                        {task.effortMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {task.effortMinutes} 分鐘
                          </span>
                        )}
                        {taskDifficulty && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              DIFFICULTY_BADGE_COLORS[taskDifficulty],
                            )}
                          >
                            {TASK_DIFFICULTY_LABELS[taskDifficulty]}
                          </Badge>
                        )}
                      </div>

                      {task.requiredTools && task.requiredTools.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Wrench className="size-3 text-muted-foreground" />
                          {task.requiredTools.map((tool) => (
                            <Badge
                              key={tool}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask.mutate(task.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
