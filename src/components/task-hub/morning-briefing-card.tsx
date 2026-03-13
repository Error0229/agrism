'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProgressRing } from './progress-ring'
import type { DailyProgress } from '@/hooks/use-unified-tasks'
import {
  Sun,
  Cloud,
  CloudRain,
  Droplets,
  Wind,
  AlertTriangle,
  RefreshCw,
  Plus,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeatherData {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    precipitation: number
    wind_speed_10m: number
    weather_code: number
    apparent_temperature: number
  }
  alerts: Array<{
    id: string
    type: string
    severity: 'info' | 'warning' | 'critical'
    title: string
    recommendation: string
  }>
}

interface MorningBriefingCardProps {
  weather: WeatherData | null
  weatherLoading: boolean
  progress: DailyProgress | undefined
  onRefresh: () => void
  onQuickAdd: () => void
  refreshing: boolean
}

// ---------------------------------------------------------------------------
// Weather icon helper
// ---------------------------------------------------------------------------

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={cn('text-amber-500', className)} />
  if (code <= 3) return <Cloud className={cn('text-slate-400', className)} />
  return <CloudRain className={cn('text-blue-400', className)} />
}

function weatherLabel(code: number): string {
  if (code === 0) return '晴天'
  if (code <= 3) return '多雲'
  if (code <= 49) return '霧'
  if (code <= 59) return '毛毛雨'
  if (code <= 69) return '下雨'
  if (code <= 79) return '下雪'
  if (code <= 84) return '陣雨'
  if (code <= 94) return '雷雨'
  return '暴風雨'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MorningBriefingCard({
  weather,
  weatherLoading,
  progress,
  onRefresh,
  onQuickAdd,
  refreshing,
}: MorningBriefingCardProps) {
  const hasAlerts = weather && weather.alerts.length > 0
  const hasCriticalAlert = weather?.alerts.some((a) => a.severity === 'critical')

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
      {/* Top gradient accent — sunrise feel */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-300 to-sky-400" />

      <div className="p-4 pt-5 space-y-3">
        {/* Row 1: Weather strip */}
        {weatherLoading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="size-5 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        ) : weather ? (
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <WeatherIcon code={weather.current.weather_code} className="size-5" />
              <span className="font-semibold text-base tabular-nums">
                {Math.round(weather.current.temperature_2m)}°C
              </span>
              <span className="text-muted-foreground">
                {weatherLabel(weather.current.weather_code)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplets className="size-3.5" />
              <span className="tabular-nums">{weather.current.relative_humidity_2m}%</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wind className="size-3.5" />
              <span className="tabular-nums">{Math.round(weather.current.wind_speed_10m)} km/h</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">天氣資料載入中...</div>
        )}

        {/* Row 2: Task summary + progress ring + action buttons */}
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          {progress ? (
            <ProgressRing
              completed={progress.completed}
              total={progress.total}
              size={52}
              strokeWidth={3.5}
              className="shrink-0"
            />
          ) : (
            <div className="size-[52px] shrink-0 rounded-full border-2 border-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">--</span>
            </div>
          )}

          {/* Task count text */}
          <div className="flex-1 min-w-0">
            {progress ? (
              <>
                <p className="text-sm font-semibold">
                  今日 {progress.total} 項農務
                  {progress.urgentCount > 0 && (
                    <span className="text-rose-600 ml-1.5">
                      {progress.urgentCount} 項緊急
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  已完成 {progress.completed}/{progress.total}
                  {progress.remainingEffortMinutes > 0 && (
                    <span className="ml-1.5">
                      剩餘約 {progress.remainingEffortMinutes} 分鐘
                    </span>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">載入中...</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={onRefresh}
              disabled={refreshing}
              title="更新農務資料"
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={onQuickAdd}
              title="快速新增任務"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Row 3: Alert banner (conditional) */}
        {hasAlerts && (
          <Link href="/weather" className="block">
            <div
              className={cn(
                'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
                hasCriticalAlert
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200',
              )}
            >
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span className="line-clamp-2">
                {weather!.alerts[0]!.title}
                {weather!.alerts[0]!.recommendation && (
                  <span className="ml-1">{weather!.alerts[0]!.recommendation}</span>
                )}
              </span>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
