'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFarmIdWithStatus } from '@/hooks/use-farm-id'
import type { Id } from '../../convex/_generated/dataModel'
import { useCreateTask } from '@/hooks/use-tasks'
import { useGenerateDailyTasks } from '@/hooks/use-daily-tasks'
import { useFieldsSummary } from '@/hooks/use-fields'
import { useCrops } from '@/hooks/use-crops'
import {
  useUnifiedTasks,
  useDailyProgress,
  useCompleteTask,
  useSkipTask,
  usePromoteRecommendation,
} from '@/hooks/use-unified-tasks'
import {
  useGenerateBriefing,
  useCheckWeatherReplan,
  useSnoozeRecommendation,
  useDismissRecommendation,
} from '@/hooks/use-recommendations'
import { cn } from '@/lib/utils'
import {
  MorningBriefingCard,
  UnifiedTaskStream,
  QuickAddFAB,
} from '@/components/task-hub'
import { GrowingCropsSection } from '@/components/dashboard/growing-crops-section'
import {
  Loader2,
  Sprout,
  Cloud,
  Thermometer,
  AlertTriangle,
  ArrowRight,
  Wind,
  Map,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { weatherCodeLabel, weatherCodeIcon } from '@/lib/weather-utils'
import { fetchWithRetry } from '@/lib/fetch-utils'
import { QueryErrorBoundary } from '@/components/query-error-boundary'
import { format } from 'date-fns'
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
  const fieldsData = useFieldsSummary(farmId)
  const cropsData = useCrops(farmId)
  const createTask = useCreateTask()
  const generateDailyTasks = useGenerateDailyTasks()

  // Unified task hub hooks
  const unifiedItems = useUnifiedTasks(farmId)
  const progress = useDailyProgress(unifiedItems)
  const completeTask = useCompleteTask()
  const skipTask = useSkipTask()
  const promoteRecommendation = usePromoteRecommendation()

  // Recommendation actions
  const generateBriefing = useGenerateBriefing()
  const checkWeatherReplan = useCheckWeatherReplan()
  const snoozeRecommendation = useSnoozeRecommendation()
  const dismissRecommendation = useDismissRecommendation()

  const [refreshing, setRefreshing] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState(false)

  const fieldsLoading = fieldsData === undefined

  // Dedup guard: prevent double-fire in React Strict Mode
  const weatherFetchedRef = useRef(false)

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true)
    setWeatherError(false)
    try {
      const res = await fetchWithRetry('/api/weather', { retries: 3, timeoutMs: 10_000 })
      const data = await res.json()
      setWeather(data)
    } catch {
      setWeatherError(true)
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  useEffect(() => {
    if (weatherFetchedRef.current) return
    weatherFetchedRef.current = true
    fetchWeather()
  }, [fetchWeather])

  // --- Name lookups for field/crop resolution ---
  const fieldNames = useMemo(() => {
    const map: Record<string, string> = {}
    if (fieldsData) {
      for (const f of fieldsData) {
        map[f._id] = f.name
      }
    }
    return map
  }, [fieldsData])

  const cropNames = useMemo(() => {
    const map: Record<string, string> = {}
    if (cropsData) {
      for (const c of cropsData) {
        map[c._id] = c.name
      }
    }
    return map
  }, [cropsData])

  // --- Field/crop options for quick add ---
  const fieldOptions = useMemo(() => {
    if (!fieldsData) return []
    return fieldsData.map((f) => ({ id: f._id as Id<'fields'>, name: f.name }))
  }, [fieldsData])

  const cropOptions = useMemo(() => {
    if (!cropsData) return []
    return cropsData.map((c) => ({
      id: c._id as Id<'crops'>,
      name: c.name,
      emoji: c.emoji,
    }))
  }, [cropsData])

  // --- Growing crops ---
  const growingEntries = useMemo(() => {
    if (!fieldsData) return []
    return fieldsData.flatMap((field) =>
      field.plantedCrops
        .filter((entry) => entry.status === 'growing' && entry.cropName !== '未知')
        .map((entry) => ({
          ...entry,
          fieldName: field.name,
        })),
    )
  }, [fieldsData])

  // --- Handlers ---
  const handleRefresh = useCallback(async () => {
    if (!farmId || refreshing) return
    setRefreshing(true)
    try {
      // Run all refresh operations in parallel
      const results = await Promise.allSettled([
        checkWeatherReplan({ farmId }),
        generateBriefing({ farmId }),
        generateDailyTasks({ farmId }),
      ])

      // Report results
      const weatherResult = results[0]
      if (weatherResult.status === 'fulfilled') {
        const count = (weatherResult.value as { count?: number })?.count ?? 0
        if (count > 0) toast.success(`已生成 ${count} 個天氣建議`)
      }
      const taskResult = results[2]
      if (taskResult.status === 'fulfilled') {
        const generated = (taskResult.value as { generated?: number })?.generated ?? 0
        if (generated > 0) toast.success(`已生成 ${generated} 項任務`)
      }

      // Refresh weather data too
      let weatherFailed = false
      try {
        const res = await fetchWithRetry('/api/weather', { retries: 2, timeoutMs: 10_000 })
        const data = await res.json()
        if (data) setWeather(data)
      } catch {
        weatherFailed = true
      }

      if (weatherFailed) {
        toast.warning('部分資料更新失敗')
      } else {
        toast.success('農務資料已更新')
      }
    } catch {
      toast.error('部分更新失敗，請稍後重試')
    } finally {
      setRefreshing(false)
    }
  }, [farmId, refreshing, checkWeatherReplan, generateBriefing, generateDailyTasks])

  const handleComplete = useCallback(
    async (taskId: Id<'tasks'>) => {
      try {
        await completeTask({ taskId })
        toast.success('任務已完成')
      } catch {
        toast.error('完成任務失敗', {
          action: { label: '重試', onClick: () => handleComplete(taskId) },
        })
      }
    },
    [completeTask],
  )

  const handleSkip = useCallback(
    async (taskId: Id<'tasks'>, reason?: string) => {
      try {
        await skipTask({ taskId, reason })
        toast.success('已跳過任務')
      } catch {
        toast.error('跳過任務失敗', {
          action: { label: '重試', onClick: () => handleSkip(taskId, reason) },
        })
      }
    },
    [skipTask],
  )

  const handlePromote = useCallback(
    async (recId: Id<'recommendations'>) => {
      try {
        await promoteRecommendation({ recommendationId: recId })
        toast.success('已加入待辦')
      } catch {
        toast.error('加入待辦失敗', {
          action: { label: '重試', onClick: () => handlePromote(recId) },
        })
      }
    },
    [promoteRecommendation],
  )

  const handleSnooze = useCallback(
    async (recId: Id<'recommendations'>) => {
      try {
        await snoozeRecommendation({ recommendationId: recId })
        toast.success('已延後')
      } catch {
        toast.error('延後建議失敗', {
          action: { label: '重試', onClick: () => handleSnooze(recId) },
        })
      }
    },
    [snoozeRecommendation],
  )

  const handleDismiss = useCallback(
    async (recId: Id<'recommendations'>, reason?: string) => {
      try {
        await dismissRecommendation({ recommendationId: recId, reason })
        toast.success('已忽略')
      } catch {
        toast.error('忽略建議失敗', {
          action: { label: '重試', onClick: () => handleDismiss(recId, reason) },
        })
      }
    },
    [dismissRecommendation],
  )

  const handleCreate = useCallback(
    async (args: Parameters<typeof createTask>[0]) => {
      return createTask(args)
    },
    [createTask],
  )

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

  // Authenticated but no farm assigned -- show onboarding prompt
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

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-stone-800 tracking-tight">花蓮蔬果種植指南</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          {format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhTW })}
        </p>
      </div>

      {/* ================================================================
          Section 1: Morning Briefing (full-width)
          ================================================================ */}
      <QueryErrorBoundary fallback={(_err, retry) => (
        <Card className="border-amber-200/60 bg-amber-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="size-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">每日簡報載入失敗</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={retry}>重試</Button>
          </CardContent>
        </Card>
      )}>
        <MorningBriefingCard
          weather={weather}
          weatherLoading={weatherLoading}
          progress={progress}
          onRefresh={handleRefresh}
          onQuickAdd={() => setQuickAddOpen(true)}
          refreshing={refreshing}
        />
      </QueryErrorBoundary>

      {/* ================================================================
          Section 2: Task Stream (full-width)
          ================================================================ */}
      <QueryErrorBoundary fallback={(_err, retry) => (
        <Card className="border-rose-200/60 bg-rose-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="size-5 text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700">任務列表載入失敗</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={retry}>重試</Button>
          </CardContent>
        </Card>
      )}>
        <UnifiedTaskStream
          items={unifiedItems}
          loading={unifiedItems === undefined}
          fieldNames={fieldNames}
          cropNames={cropNames}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onPromote={handlePromote}
          onSnooze={handleSnooze}
          onDismiss={handleDismiss}
        />
      </QueryErrorBoundary>

      {/* ================================================================
          Section 3: Growing Crops Overview
          ================================================================ */}
      <QueryErrorBoundary fallback={(_err, retry) => (
        <Card className="border-emerald-200/60 bg-emerald-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="size-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700">作物資料載入失敗</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={retry}>重試</Button>
          </CardContent>
        </Card>
      )}>
        <GrowingCropsSection
          entries={growingEntries}
          loading={fieldsLoading}
        />
      </QueryErrorBoundary>

      {/* ================================================================
          Section 4: Weather Summary (simplified)
          ================================================================ */}
      <QueryErrorBoundary fallback={(_err, retry) => (
        <Card className="border-sky-200/60 bg-sky-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Cloud className="size-5 text-sky-500 shrink-0" />
            <p className="text-sm text-sky-700">天氣資料載入失敗</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={retry}>重試</Button>
          </CardContent>
        </Card>
      )}>
        <Card className="border-stone-200 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-stone-800">
              <Cloud className="size-[18px] text-sky-500" />
              天氣概況
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {weatherLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ) : weatherError ? (
              <div className="flex items-center gap-3 py-2">
                <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                <p className="text-sm text-muted-foreground">天氣資料暫時無法取得</p>
                <Button variant="outline" size="sm" className="ml-auto" onClick={fetchWeather}>重試</Button>
              </div>
            ) : !weather ? (
              <p className="text-sm text-muted-foreground py-2">
                無法取得天氣資料
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {weatherCodeIcon(weather.current.weather_code)}
                    <span className="font-medium text-stone-700">
                      {weatherCodeLabel(weather.current.weather_code)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="size-4 text-rose-400" />
                    <span className="text-base font-semibold tabular-nums">
                      {weather.current.temperature_2m.toFixed(1)}°C
                    </span>
                    <span className="text-xs text-muted-foreground">
                      體感 {weather.current.apparent_temperature.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
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
                        className={cn(
                          'flex items-start gap-2 rounded-lg border p-2.5 text-[13px]',
                          alert.severity === 'critical'
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : alert.severity === 'warning'
                              ? 'border-amber-200/60 bg-amber-50/80 text-amber-700'
                              : 'border-sky-200 bg-sky-50 text-sky-700',
                        )}
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

                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link href="/weather">
                    查看完整天氣
                    <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </QueryErrorBoundary>

      {/* ================================================================
          Section 5: Quick Actions
          ================================================================ */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] font-semibold text-stone-800">快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-3.5 flex-col gap-1.5 border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors">
              <Link href="/fields">
                <Map className="size-5 text-stone-500" />
                <span className="text-xs text-stone-600">田地規劃</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3.5 flex-col gap-1.5 border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors">
              <Link href="/crops">
                <Sprout className="size-5 text-stone-500" />
                <span className="text-xs text-stone-600">作物資料庫</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3.5 flex-col gap-1.5 border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors">
              <Link href="/calendar">
                <CalendarDays className="size-5 text-stone-500" />
                <span className="text-xs text-stone-600">農事日曆</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3.5 flex-col gap-1.5 border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors">
              <Link href="/records/harvest">
                <CheckCircle2 className="size-5 text-stone-500" />
                <span className="text-xs text-stone-600">收成紀錄</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          Quick Add FAB
          ================================================================ */}
      <QuickAddFAB
        farmId={farmId}
        fields={fieldOptions}
        crops={cropOptions}
        onCreate={handleCreate}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
      />
    </div>
  )
}
