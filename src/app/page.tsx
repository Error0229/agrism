'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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
import { CropAvatar } from '@/components/crops/crop-avatar'
import {
  MorningBriefingCard,
  UnifiedTaskStream,
  QuickAddFAB,
} from '@/components/task-hub'
import {
  Loader2,
  Sprout,
  Clock,
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
import {
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

  const fieldsLoading = fieldsData === undefined

  useEffect(() => {
    fetch('/api/weather')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setWeather(data))
      .catch(() => null)
      .finally(() => setWeatherLoading(false))
  }, [])

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
      fetch('/api/weather')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data) setWeather(data) })
        .catch(() => null)

      toast.success('農務資料已更新')
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
        toast.error('操作失敗')
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
        toast.error('操作失敗')
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
        toast.error('操作失敗')
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
        toast.error('操作失敗')
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
        toast.error('操作失敗')
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
      <MorningBriefingCard
        weather={weather}
        weatherLoading={weatherLoading}
        progress={progress}
        onRefresh={handleRefresh}
        onQuickAdd={() => setQuickAddOpen(true)}
        refreshing={refreshing}
      />

      {/* ================================================================
          Section 2: Task Stream (full-width)
          ================================================================ */}
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

      {/* ================================================================
          Section 3: Growing Crops Overview
          ================================================================ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Sprout className="size-[18px] text-emerald-600" />
            <span className="text-[15px] font-semibold text-stone-800">生長中作物</span>
          </div>
          <div className="flex-1 h-px bg-emerald-200" />
        </div>
        {fieldsLoading ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : growingEntries.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Sprout className="mx-auto size-8 mb-2 text-stone-300" />
            <p className="text-sm">目前沒有生長中的作物</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/fields">前往田地規劃種植</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {growingEntries.map((entry) => {
              const plantedDate = new Date(entry.plantedDate ?? '2000-01-01')
              const daysSincePlanted = differenceInDays(new Date(), plantedDate)
              const totalGrowthDays =
                entry.customGrowthDays ??
                entry.growthDays ??
                90
              const daysToHarvest = Math.max(0, totalGrowthDays - daysSincePlanted)
              const progressPercent = Math.min(100, Math.round((daysSincePlanted / totalGrowthDays) * 100))

              return (
                <div
                  key={entry._id}
                  className="rounded-xl border border-stone-200 bg-white p-3 space-y-1.5 hover:shadow-md transition-all hover:border-stone-300"
                >
                  <div className="flex items-center gap-2">
                    <CropAvatar
                      name={entry.cropName}
                      emoji={entry.cropEmoji}
                      imageUrl={entry.cropImageUrl}
                      thumbnailUrl={entry.cropThumbnailUrl}
                      size="sm"
                    />
                    <span className="text-sm font-medium truncate">
                      {entry.cropName}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {entry.fieldName}
                  </p>
                  {/* Growth progress bar */}
                  <div className="space-y-1">
                    <div className="h-1 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-0.5">
                        <Clock className="size-3" />
                        第 {daysSincePlanted} 天
                      </span>
                      <span>
                        {daysToHarvest > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {daysToHarvest} 天後收成
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">
                            可收成
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ================================================================
          Section 4: Quick Actions
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
