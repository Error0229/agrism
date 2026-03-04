'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertTriangle,
  Cloud,
  CloudRain,
  Droplets,
  Loader2,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react'
import { useFarmId } from '@/hooks/use-farm-id'
import { useCreateWeatherLog } from '@/hooks/use-weather-logs'

// ---------------------------------------------------------------------------
// Types matching the weather API response
// ---------------------------------------------------------------------------

interface WeatherCurrent {
  temperature_2m: number
  relative_humidity_2m: number
  precipitation: number
  rain: number
  wind_speed_10m: number
  wind_direction_10m: number
  weather_code: number
  apparent_temperature: number
  uv_index: number
}

interface WeatherDaily {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  rain_sum: number[]
  uv_index_max: number[]
  weather_code: number[]
  wind_speed_10m_max: number[]
  sunrise: (string | null)[]
  sunset: (string | null)[]
}

interface WeatherAlert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  recommendation: string
}

interface WeatherMeta {
  source: string
  fetchedAt: string
  fallbackUsed: boolean
  providerErrors: string[]
  confidence: { score: number; level: string; freshness: string }
}

interface WeatherData {
  current: WeatherCurrent
  daily: WeatherDaily
  alerts: WeatherAlert[]
  meta: WeatherMeta
}

// ---------------------------------------------------------------------------
// Weather code → label mapping
// ---------------------------------------------------------------------------

function weatherCodeLabel(code: number): string {
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

function weatherCodeIcon(code: number) {
  if (code === 0) return <Sun className="size-5" />
  if (code <= 3) return <Cloud className="size-5" />
  if (code <= 69) return <CloudRain className="size-5" />
  return <CloudRain className="size-5" />
}

function uvLabel(uv: number): string {
  if (uv <= 2) return '低'
  if (uv <= 5) return '中等'
  if (uv <= 7) return '高'
  if (uv <= 10) return '非常高'
  return '極高'
}

function alertSeverityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return 'destructive' as const
    case 'warning':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeatherPage() {
  const farmId = useFarmId()
  const createWeatherLog = useCreateWeatherLog()
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logError, setLogError] = useState<string | null>(null)
  const [logSuccess, setLogSuccess] = useState(false)

  // Weather log form state
  const [logDate, setLogDate] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [logTemp, setLogTemp] = useState('')
  const [logRain, setLogRain] = useState('')
  const [logCondition, setLogCondition] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [logSaving, setLogSaving] = useState(false)

  const fetchWeather = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/weather')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch {
      setError('無法取得天氣資料')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
  }, [])

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLogSaving(true)
    setLogError(null)
    setLogSuccess(false)
    try {
      if (!farmId) return
      await createWeatherLog({
        farmId: farmId as any,
        date: logDate,
        temperature: logTemp ? Number(logTemp) : undefined,
        rainfallMm: logRain ? Number(logRain) : undefined,
        condition: logCondition || undefined,
        notes: logNotes || undefined,
      })
      // Reset form
      setLogTemp('')
      setLogRain('')
      setLogCondition('')
      setLogNotes('')
      setLogSuccess(true)
      setTimeout(() => setLogSuccess(false), 3000)
    } catch {
      setLogError('儲存失敗，請稍後再試')
      setTimeout(() => setLogError(null), 5000)
    } finally {
      setLogSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">載入天氣資料中...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">天氣</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{error ?? '無法取得天氣資料'}</p>
            <Button variant="outline" className="mt-4" onClick={fetchWeather}>
              <RefreshCw className="mr-2 size-4" />
              重試
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { current, daily, alerts, meta } = data
  const forecastDays = daily.time.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">天氣</h1>
          <p className="text-muted-foreground">
            花蓮地區天氣資訊與預報
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWeather} aria-label="更新天氣資料">
          <RefreshCw className="mr-2 size-4" />
          更新
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={
                alert.severity === 'critical'
                  ? 'border-destructive'
                  : alert.severity === 'warning'
                    ? 'border-orange-400'
                    : ''
              }
            >
              <CardContent className="flex items-start gap-3 py-3">
                <AlertTriangle
                  className={`size-5 mt-0.5 shrink-0 ${
                    alert.severity === 'critical'
                      ? 'text-destructive'
                      : alert.severity === 'warning'
                        ? 'text-orange-500'
                        : 'text-muted-foreground'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.title}</span>
                    <Badge variant={alertSeverityColor(alert.severity)}>
                      {alert.severity === 'critical'
                        ? '嚴重'
                        : alert.severity === 'warning'
                          ? '警告'
                          : '資訊'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {alert.recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Current Weather */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {weatherCodeIcon(current.weather_code)}
            目前天氣 — {weatherCodeLabel(current.weather_code)}
          </CardTitle>
          <CardDescription>
            資料來源：{meta.source} | 信心度：{meta.confidence.level === 'high' ? '高' : meta.confidence.level === 'medium' ? '中' : '低'} ({meta.confidence.score}/100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Thermometer className="size-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {current.temperature_2m.toFixed(1)}°C
                </p>
                <p className="text-xs text-muted-foreground">
                  體感 {current.apparent_temperature.toFixed(1)}°C
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="size-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {current.relative_humidity_2m}%
                </p>
                <p className="text-xs text-muted-foreground">相對濕度</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CloudRain className="size-4 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">
                  {current.precipitation.toFixed(1)} mm
                </p>
                <p className="text-xs text-muted-foreground">降水量</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="size-4 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">
                  {current.wind_speed_10m.toFixed(1)} km/h
                </p>
                <p className="text-xs text-muted-foreground">風速</p>
              </div>
            </div>
          </div>
          {current.uv_index > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              UV 指數：{current.uv_index.toFixed(1)} ({uvLabel(current.uv_index)}
              )
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3-Day Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>3 日預報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {forecastDays.map((date, i) => {
              const d = new Date(date)
              const dayLabel = d.toLocaleDateString('zh-TW', {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
              })
              return (
                <div
                  key={date}
                  className="rounded-lg border p-4 text-center space-y-2"
                >
                  <p className="text-sm font-medium">{dayLabel}</p>
                  <div className="flex items-center justify-center gap-1">
                    {weatherCodeIcon(daily.weather_code[i])}
                    <span className="text-sm">
                      {weatherCodeLabel(daily.weather_code[i])}
                    </span>
                  </div>
                  <p className="text-lg font-bold">
                    {daily.temperature_2m_max[i].toFixed(0)}° /{' '}
                    <span className="text-muted-foreground font-normal">
                      {daily.temperature_2m_min[i].toFixed(0)}°
                    </span>
                  </p>
                  <div className="flex justify-center gap-3 text-xs text-muted-foreground">
                    <span>
                      <CloudRain className="size-3 inline mr-1" />
                      {daily.precipitation_sum[i].toFixed(1)} mm
                    </span>
                    <span>
                      <Wind className="size-3 inline mr-1" />
                      {daily.wind_speed_10m_max[i].toFixed(0)} km/h
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Manual Weather Log */}
      <Card>
        <CardHeader>
          <CardTitle>記錄天氣觀察</CardTitle>
          <CardDescription>手動記錄田間觀察到的天氣狀況</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="log-date">日期</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-temp">溫度 (°C)</Label>
                <Input
                  id="log-temp"
                  type="number"
                  step="0.1"
                  placeholder="例：28.5"
                  value={logTemp}
                  onChange={(e) => setLogTemp(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-rain">降雨量 (mm)</Label>
                <Input
                  id="log-rain"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="例：12.0"
                  value={logRain}
                  onChange={(e) => setLogRain(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-condition">天氣狀況</Label>
                <Input
                  id="log-condition"
                  placeholder="例：晴轉多雲"
                  value={logCondition}
                  onChange={(e) => setLogCondition(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-notes">備註</Label>
              <Textarea
                id="log-notes"
                placeholder="田間觀察筆記..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={logSaving || !farmId}>
                {logSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                儲存觀察紀錄
              </Button>
              {logSuccess && (
                <span className="text-sm text-green-600">已儲存</span>
              )}
              {logError && (
                <span className="text-sm text-destructive">{logError}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
