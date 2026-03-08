'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFarmIdWithStatus } from '@/hooks/use-farm-id'
import { useTasks, useToggleTask } from '@/hooks/use-tasks'
import { useGenerateDailyTasks } from '@/hooks/use-daily-tasks'
import { useFieldsSummary } from '@/hooks/use-fields'
import {
  TASK_TYPE_LABELS,
  TASK_DIFFICULTY_LABELS,
} from '@/lib/types/labels'
import type { TaskType, TaskDifficulty } from '@/lib/types/enums'
import {
  CheckCircle2,
  Loader2,
  Map,
  CalendarDays,
  Sprout,
  Thermometer,
  AlertTriangle,
  ArrowRight,
  Clock,
  Cloud,
  Wind,
  BrainCircuit,
  Sparkles,
  ChevronDown,
  History,
  CloudRain,
  ListChecks,
} from 'lucide-react'
import { toast } from 'sonner'
import { weatherCodeLabel, weatherCodeIcon } from '@/lib/weather-utils'
import {
  useActiveRecommendations,
  useRecommendationHistory,
  useGenerateBriefing,
  useCheckWeatherReplan,
} from '@/hooks/use-recommendations'
import { RecommendationCard } from '@/components/recommendations/recommendation-card'
import {
  isToday,
  isBefore,
  startOfDay,
  addDays,
  differenceInDays,
  format,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'

// ---------------------------------------------------------------------------
// Weather types (matching /api/weather response)
// ---------------------------------------------------------------------------

interface WeatherCurrent {
  temperature_2m: number
  relative_humidity_2m: number
  precipitation: number
  wind_speed_10m: number
  weather_code: number
  apparent_temperature: number
}

interface WeatherAlert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  recommendation: string
}

interface WeatherData {
  current: WeatherCurrent
  alerts: WeatherAlert[]
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { farmId, isLoading: farmLoading } = useFarmIdWithStatus()
  const allTasks = useTasks(farmId)
  const fieldsData = useFieldsSummary(farmId)
  const toggleTask = useToggleTask()
  const generateDailyTasks = useGenerateDailyTasks()
  const [generatingTasks, setGeneratingTasks] = useState(false)

  const tasksLoading = allTasks === undefined
  const fieldsLoading = fieldsData === undefined

  const recommendations = useActiveRecommendations(farmId)
  const recommendationHistory = useRecommendationHistory(farmId)
  const generateBriefing = useGenerateBriefing()
  const checkWeatherReplan = useCheckWeatherReplan()
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [weatherReplanLoading, setWeatherReplanLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const recommendationsLoading = recommendations === undefined

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  useEffect(() => {
    fetch('/api/weather')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setWeather(data))
      .catch(() => null)
      .finally(() => setWeatherLoading(false))
  }, [])

  // Show loading skeleton only while session is loading
  if (farmLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">花蓮蔬果種植指南</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhTW })}
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">載入中...</span>
        </div>
      </div>
    )
  }

  // Authenticated but no farm assigned — show onboarding prompt
  if (!farmId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">花蓮蔬果種植指南</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhTW })}
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Sprout className="mx-auto size-12 text-green-600" />
            <h2 className="text-xl font-semibold">歡迎使用花蓮種植指南</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              您尚未建立農場。請先前往設定頁面建立您的第一個農場，即可開始使用所有功能。
            </p>
            <Button asChild>
              <Link href="/settings">前往設定</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const today = startOfDay(new Date())
  const threeDaysLater = addDays(today, 3)

  // ---- Task grouping ----
  const incompleteTasks = (allTasks ?? []).filter((t) => !t.completed)

  const overdueTasks = incompleteTasks.filter(
    (t) => t.dueDate && isBefore(new Date(t.dueDate), today) && !isToday(new Date(t.dueDate)),
  )
  const todayTasks = incompleteTasks.filter((t) =>
    t.dueDate && isToday(new Date(t.dueDate)),
  )
  const upcomingTasks = incompleteTasks.filter((t) => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    return !isToday(d) && !isBefore(d, today) && isBefore(d, addDays(threeDaysLater, 1))
  })

  // ---- Growing crops ----
  const growingEntries = (fieldsData ?? []).flatMap((field) =>
    field.plantedCrops
      .filter((entry) => entry.status === 'growing' && entry.cropName !== '未知')
      .map((entry) => ({
        ...entry,
        fieldName: field.name,
      })),
  )

  // ---- Handlers ----
  const handleToggle = async (taskId: string) => {
    try {
      await toggleTask({ taskId: taskId as any })
    } catch {
      // ignore
    }
  }

  const handleGenerateBriefing = async () => {
    if (!farmId || briefingLoading) return
    setBriefingLoading(true)
    try {
      await generateBriefing({ farmId })
    } catch {
      // ignore
    } finally {
      setBriefingLoading(false)
    }
  }

  const handleCheckWeather = async () => {
    if (!farmId || weatherReplanLoading) return
    setWeatherReplanLoading(true)
    try {
      const result = await checkWeatherReplan({ farmId })
      const count = (result as { count: number })?.count ?? 0
      if (count > 0) {
        toast.success(`已生成 ${count} 個天氣建議`)
      } else {
        toast.info('天氣正常，無需調整')
      }
    } catch {
      toast.error('天氣檢查失敗')
    } finally {
      setWeatherReplanLoading(false)
    }
  }

  const handleGenerateDailyTasks = async () => {
    if (!farmId || generatingTasks) return
    setGeneratingTasks(true)
    try {
      const result = await generateDailyTasks({ farmId })
      const generated = (result as { generated: number })?.generated ?? 0
      if (generated > 0) {
        toast.success(`已生成 ${generated} 項任務`)
      } else {
        toast.info('目前無需生成新任務')
      }
    } catch {
      toast.error('生成任務失敗')
    } finally {
      setGeneratingTasks(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">花蓮蔬果種植指南</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhTW })}
        </p>
      </div>

      {/* ================================================================
          Section 0: AI Daily Briefing
          ================================================================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BrainCircuit className="size-5 text-violet-600" />
            今日農務建議
          </CardTitle>
          <div className="flex justify-end -mt-6 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleCheckWeather}
              disabled={weatherReplanLoading}
            >
              {weatherReplanLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  檢查天氣中...
                </>
              ) : (
                <>
                  <CloudRain className="size-3.5" />
                  天氣檢查
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleGenerateBriefing}
              disabled={briefingLoading}
            >
              {briefingLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  生成建議
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendationsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !recommendations || recommendations.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <Sparkles className="mx-auto size-8 mb-2" />
              <p>目前沒有建議，點擊上方按鈕生成今日建議</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec._id} recommendation={rec} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          Section 0b: Recommendation History
          ================================================================ */}
      {recommendationHistory && recommendationHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-2 w-full text-left"
            >
              <History className="size-5 text-muted-foreground" />
              <CardTitle className="text-lg flex-1">歷史建議</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {recommendationHistory.length}
              </Badge>
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform duration-200',
                  historyOpen && 'rotate-180',
                )}
              />
            </button>
          </CardHeader>
          <div
            className={cn(
              'grid transition-all duration-200 ease-in-out',
              historyOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <CardContent className="pt-0 pb-3">
                <div className="space-y-2">
                  {recommendationHistory.slice(0, 10).map((rec) => (
                    <div
                      key={rec._id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="flex-1 truncate">{rec.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 shrink-0',
                          rec.status === 'completed' && 'bg-sky-100 text-sky-700 border-sky-200',
                          rec.status === 'dismissed' && 'bg-rose-100 text-rose-700 border-rose-200',
                          rec.status === 'snoozed' && 'bg-amber-100 text-amber-700 border-amber-200',
                          rec.status === 'accepted' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        )}
                      >
                        {rec.status === 'completed' && '已完成'}
                        {rec.status === 'accepted' && '已接受'}
                        {rec.status === 'snoozed' && '已延後'}
                        {rec.status === 'dismissed' && '已忽略'}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(rec.createdAt), 'M/d')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      )}

      {/* ================================================================
          Section 1: Today's Tasks
          ================================================================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="size-5 text-green-600" />
            今日任務
          </CardTitle>
          <div className="flex justify-end -mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDailyTasks}
              disabled={generatingTasks}
              className="gap-1.5"
            >
              {generatingTasks ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <ListChecks className="size-3.5" />
                  自動生成今日任務
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : overdueTasks.length === 0 &&
            todayTasks.length === 0 &&
            upcomingTasks.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto size-8 mb-2 text-green-500" />
              <p>沒有待辦任務，今天可以休息一下！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overdue */}
              {overdueTasks.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-red-600">
                    逾期 ({overdueTasks.length})
                  </p>
                  <div className="space-y-2">
                    {overdueTasks.map((task) => (
                      <TaskRow
                        key={task._id}
                        task={task}
                        variant="overdue"
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Today */}
              {todayTasks.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-green-700">
                    今天 ({todayTasks.length})
                  </p>
                  <div className="space-y-2">
                    {todayTasks.map((task) => (
                      <TaskRow
                        key={task._id}
                        task={task}
                        variant="today"
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming 3 days */}
              {upcomingTasks.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-muted-foreground">
                    未來 3 天 ({upcomingTasks.length})
                  </p>
                  <div className="space-y-2">
                    {upcomingTasks.map((task) => (
                      <TaskRow
                        key={task._id}
                        task={task}
                        variant="upcoming"
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          Section 2: Growing Crops Overview
          ================================================================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sprout className="size-5 text-green-600" />
            生長中作物
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fieldsLoading ? (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : growingEntries.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <Sprout className="mx-auto size-8 mb-2" />
              <p>目前沒有生長中的作物</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/fields">前往田地規劃種植</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {growingEntries.map((entry) => {
                const plantedDate = new Date(entry.plantedDate ?? "2000-01-01")
                const daysSincePlanted = differenceInDays(new Date(), plantedDate)
                const totalGrowthDays =
                  entry.customGrowthDays ??
                  entry.growthDays ??
                  90
                const daysToHarvest = Math.max(0, totalGrowthDays - daysSincePlanted)

                return (
                  <div
                    key={entry._id}
                    className="rounded-lg border p-3 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {entry.cropEmoji || '🌱'}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {entry.cropName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.fieldName}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>第 {daysSincePlanted} 天</span>
                    </div>
                    <p className="text-xs">
                      {daysToHarvest > 0 ? (
                        <span className="text-amber-600">
                          預計 {daysToHarvest} 天後收成
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          可收成
                        </span>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          Section 3: Weather Summary
          ================================================================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="size-5 text-blue-500" />
            天氣概況
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weatherLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ) : !weather ? (
            <p className="text-sm text-muted-foreground py-2">
              無法取得天氣資料
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {weatherCodeIcon(weather.current.weather_code)}
                  <span className="font-medium">
                    {weatherCodeLabel(weather.current.weather_code)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="size-4 text-red-500" />
                  <span className="text-lg font-bold">
                    {weather.current.temperature_2m.toFixed(1)}°C
                  </span>
                  <span className="text-xs text-muted-foreground">
                    體感 {weather.current.apparent_temperature.toFixed(1)}°C
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <Wind className="size-4" />
                  <span>{weather.current.wind_speed_10m.toFixed(0)} km/h</span>
                </div>
              </div>

              {/* Alerts */}
              {weather.alerts.length > 0 && (
                <div className="space-y-2">
                  {weather.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
                        alert.severity === 'critical'
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : alert.severity === 'warning'
                            ? 'border-orange-300 bg-orange-50 text-orange-800'
                            : 'border-blue-200 bg-blue-50 text-blue-800'
                      }`}
                    >
                      <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{alert.title}</span>
                        <span className="ml-1">{alert.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button asChild variant="outline" size="sm">
                <Link href="/weather">
                  查看完整天氣
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          Section 4: Quick Actions
          ================================================================ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/fields">
                <Map className="size-5 text-blue-600" />
                <span>田地規劃</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/crops">
                <Sprout className="size-5 text-green-600" />
                <span>作物資料庫</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/calendar">
                <CalendarDays className="size-5 text-amber-600" />
                <span>農事日曆</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/records/harvest">
                <CheckCircle2 className="size-5 text-red-600" />
                <span>收成紀錄</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskRow sub-component
// ---------------------------------------------------------------------------

interface TaskRowProps {
  task: {
    _id: string
    type: string
    title: string
    dueDate?: string
    effortMinutes?: number | null
    difficulty?: string | null
  }
  variant: 'overdue' | 'today' | 'upcoming'
  onToggle: (id: string) => void
}

function TaskRow({ task, variant, onToggle }: TaskRowProps) {
  const borderColor =
    variant === 'overdue'
      ? 'border-red-200 bg-red-50/50'
      : variant === 'today'
        ? 'border-green-200 bg-green-50/50'
        : ''

  const checkColor =
    variant === 'overdue'
      ? 'border-red-400 hover:bg-red-100'
      : 'border-green-500 hover:bg-green-100'

  const typeLabel =
    TASK_TYPE_LABELS[task.type as TaskType] ?? task.type
  const difficultyLabel = task.difficulty
    ? TASK_DIFFICULTY_LABELS[task.difficulty as TaskDifficulty]
    : null

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${borderColor}`}
    >
      <button
        onClick={() => onToggle(task._id)}
        className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${checkColor}`}
        aria-label="完成任務"
      >
        {/* empty — check mark appears on complete */}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {variant === 'overdue' && task.dueDate && (
            <span className="text-red-600">
              {format(new Date(task.dueDate), 'M/d')}
            </span>
          )}
          {variant === 'upcoming' && task.dueDate && (
            <span>{format(new Date(task.dueDate), 'M/d EEEE', { locale: zhTW })}</span>
          )}
          {task.effortMinutes && (
            <span>{task.effortMinutes} 分鐘</span>
          )}
          {difficultyLabel && <span>難度 {difficultyLabel}</span>}
        </div>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        {typeLabel}
      </Badge>
    </div>
  )
}
