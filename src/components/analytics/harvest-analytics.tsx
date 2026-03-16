'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QUALITY_GRADE_LABELS } from '@/lib/types/labels'
import type { QualityGrade } from '@/lib/types/enums'
import { BarChart3, Wheat, TrendingUp, Award, MapPin } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HarvestLog {
  _id: string
  date: string
  cropId?: string
  fieldId?: string
  quantity: number
  unit: string
  qualityGrade?: string
  notes?: string
}

interface HarvestAnalyticsProps {
  logs: HarvestLog[]
  cropMap: Map<string, string>
  fieldMap: Map<string, string>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATE_RANGE_OPTIONS = [
  { value: '3', label: '近3個月' },
  { value: '6', label: '近6個月' },
  { value: '12', label: '近12個月' },
  { value: 'all', label: '全部' },
] as const

const QUALITY_COLORS: Record<string, string> = {
  a: 'var(--color-chart-2)',
  b: 'var(--color-chart-4)',
  c: 'var(--color-chart-5)',
  reject: 'var(--color-destructive)',
}

const QUALITY_GRADE_ORDER = ['a', 'b', 'c', 'reject'] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize quantity to kg. 1 斤 = 0.6 kg. */
function toKg(quantity: number, unit: string): number {
  if (unit === '斤') return quantity * 0.6
  if (unit === 'g' || unit === '克') return quantity / 1000
  // Default: treat as kg
  return quantity
}

/** Get YYYY-MM string from a date string */
function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** Format YYYY-MM to zh-TW display */
function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  return `${y}/${m}`
}

/** Filter logs by date range in months from now */
function filterByRange(logs: HarvestLog[], months: number | null): HarvestLog[] {
  if (months === null) return logs
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return logs.filter((l) => l.date >= cutoffStr)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HarvestAnalytics({ logs, cropMap, fieldMap }: HarvestAnalyticsProps) {
  const [dateRange, setDateRange] = useState<string>('12')
  const [selectedCrop, setSelectedCrop] = useState<string>('__all__')

  // --- Filtered logs ---
  const filtered = useMemo(() => {
    const months = dateRange === 'all' ? null : Number(dateRange)
    return filterByRange(logs, months)
  }, [logs, dateRange])

  // --- Unique crops present in filtered logs ---
  const cropOptions = useMemo(() => {
    const cropIds = new Set<string>()
    for (const l of filtered) {
      if (l.cropId) cropIds.add(l.cropId)
    }
    return Array.from(cropIds).map((id) => ({
      id,
      name: cropMap.get(id) ?? '未知作物',
    }))
  }, [filtered, cropMap])

  // --- Summary stats ---
  const stats = useMemo(() => {
    const totalHarvests = filtered.length
    const totalKg = filtered.reduce((sum, l) => sum + toKg(l.quantity, l.unit), 0)

    // Average quality: a=4, b=3, c=2, reject=1
    const gradeValues: Record<string, number> = { a: 4, b: 3, c: 2, reject: 1 }
    const graded = filtered.filter((l) => l.qualityGrade && l.qualityGrade in gradeValues)
    const avgGrade =
      graded.length > 0
        ? graded.reduce((sum, l) => sum + (gradeValues[l.qualityGrade!] ?? 0), 0) / graded.length
        : 0

    // Map numeric avg back to label
    let avgGradeLabel = '—'
    if (avgGrade >= 3.5) avgGradeLabel = 'A級'
    else if (avgGrade >= 2.5) avgGradeLabel = 'B級'
    else if (avgGrade >= 1.5) avgGradeLabel = 'C級'
    else if (avgGrade > 0) avgGradeLabel = '淘汰'

    // Most productive field
    const fieldYield = new Map<string, number>()
    for (const l of filtered) {
      if (!l.fieldId) continue
      fieldYield.set(l.fieldId, (fieldYield.get(l.fieldId) ?? 0) + toKg(l.quantity, l.unit))
    }
    let topFieldName = '—'
    let topYield = 0
    for (const [fid, fy] of fieldYield) {
      if (fy > topYield) {
        topYield = fy
        topFieldName = fieldMap.get(fid) ?? '未知田區'
      }
    }

    return { totalHarvests, totalKg, avgGradeLabel, topFieldName }
  }, [filtered, fieldMap])

  // --- Chart 1: Yield Over Time (monthly, filterable by crop) ---
  const yieldOverTimeData = useMemo(() => {
    const source = selectedCrop === '__all__'
      ? filtered
      : filtered.filter((l) => l.cropId === selectedCrop)

    const monthly = new Map<string, number>()
    for (const l of source) {
      const key = toMonthKey(l.date)
      monthly.set(key, (monthly.get(key) ?? 0) + toKg(l.quantity, l.unit))
    }

    return Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, kg]) => ({
        month: formatMonth(month),
        yield: Math.round(kg * 100) / 100,
      }))
  }, [filtered, selectedCrop])

  const yieldChartConfig: ChartConfig = {
    yield: {
      label: '收穫量 (kg)',
      color: 'var(--color-chart-1)',
    },
  }

  // --- Chart 2: Yield by Field ---
  const yieldByFieldData = useMemo(() => {
    const fieldTotals = new Map<string, number>()
    for (const l of filtered) {
      if (!l.fieldId) continue
      fieldTotals.set(l.fieldId, (fieldTotals.get(l.fieldId) ?? 0) + toKg(l.quantity, l.unit))
    }
    return Array.from(fieldTotals.entries())
      .map(([fid, kg]) => ({
        field: fieldMap.get(fid) ?? '未知田區',
        yield: Math.round(kg * 100) / 100,
      }))
      .sort((a, b) => b.yield - a.yield)
  }, [filtered, fieldMap])

  const fieldChartConfig: ChartConfig = {
    yield: {
      label: '收穫量 (kg)',
      color: 'var(--color-chart-2)',
    },
  }

  // --- Chart 3: Quality Distribution ---
  const qualityData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of filtered) {
      if (!l.qualityGrade) continue
      counts.set(l.qualityGrade, (counts.get(l.qualityGrade) ?? 0) + 1)
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)
    return QUALITY_GRADE_ORDER
      .filter((g) => counts.has(g))
      .map((grade) => {
        const count = counts.get(grade) ?? 0
        return {
          grade,
          name: QUALITY_GRADE_LABELS[grade as QualityGrade] ?? grade,
          count,
          percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
          fill: QUALITY_COLORS[grade] ?? 'var(--color-chart-3)',
        }
      })
  }, [filtered])

  const qualityTotal = useMemo(
    () => qualityData.reduce((sum, d) => sum + d.count, 0),
    [qualityData],
  )

  const qualityChartConfig: ChartConfig = Object.fromEntries(
    QUALITY_GRADE_ORDER.map((grade) => [
      grade,
      {
        label: QUALITY_GRADE_LABELS[grade as QualityGrade] ?? grade,
        color: QUALITY_COLORS[grade] ?? 'var(--color-chart-3)',
      },
    ]),
  )

  // --- Empty state ---
  if (filtered.length === 0 && logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">記錄第一筆收穫以查看分析</p>
          <p className="mt-1 text-sm text-muted-foreground">
            新增收成紀錄後，這裡將顯示產量趨勢、田區比較和品質分布圖表
          </p>
        </CardContent>
      </Card>
    )
  }

  // --- Filtered-empty state (logs exist but date range excludes all) ---
  if (filtered.length === 0 && logs.length > 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">此時間範圍內無收穫紀錄，請嘗試調整日期範圍</p>
          <div className="mt-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">收穫分析</h2>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-1/10">
              <Wheat className="h-5 w-5 text-chart-1" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">本季收穫次數</p>
              <p className="text-xl font-bold tabular-nums">{stats.totalHarvests}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-2/10">
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">總收穫量</p>
              <p className="text-xl font-bold tabular-nums">
                {stats.totalKg >= 1000
                  ? `${(stats.totalKg / 1000).toFixed(1)}t`
                  : `${stats.totalKg.toFixed(1)}kg`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-4/10">
              <Award className="h-5 w-5 text-chart-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">平均品質</p>
              <p className="text-xl font-bold">{stats.avgGradeLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-5/10">
              <MapPin className="h-5 w-5 text-chart-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">最高產田區</p>
              <p className="truncate text-xl font-bold">{stats.topFieldName}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart 1: Yield Over Time */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>收穫趨勢</CardTitle>
              <CardDescription>月度收穫量 (kg)</CardDescription>
            </div>
            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="全部作物" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部作物</SelectItem>
                {cropOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {yieldOverTimeData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
              此期間無收穫紀錄
            </div>
          ) : (
            <ChartContainer config={yieldChartConfig} className="h-[250px] w-full">
              <AreaChart
                data={yieldOverTimeData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-yield)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-yield)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={50}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  type="monotone"
                  dataKey="yield"
                  stroke="var(--color-yield)"
                  strokeWidth={2}
                  fill="url(#yieldGradient)"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Chart Row: Field Comparison + Quality Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 2: Yield by Field */}
        <Card>
          <CardHeader>
            <CardTitle>田區產量比較</CardTitle>
            <CardDescription>各田區總收穫量 (kg)</CardDescription>
          </CardHeader>
          <CardContent>
            {yieldByFieldData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                此期間無田區收穫紀錄
              </div>
            ) : (
              <ChartContainer config={fieldChartConfig} className="h-[250px] w-full">
                <BarChart
                  data={yieldByFieldData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    type="category"
                    dataKey="field"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickMargin={4}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="yield"
                    fill="var(--color-yield)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 3: Quality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>品質分布</CardTitle>
            <CardDescription>各品質等級佔比</CardDescription>
          </CardHeader>
          <CardContent>
            {qualityData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                此期間無品質評級紀錄
              </div>
            ) : (
              <ChartContainer config={qualityChartConfig} className="mx-auto h-[250px] w-full max-w-[360px]">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="name"
                        formatter={(value, name) => (
                          <span className="flex items-center gap-2">
                            <span>{name}</span>
                            <span className="font-mono font-medium tabular-nums">
                              {value} 筆
                            </span>
                          </span>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={qualityData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    strokeWidth={2}
                    paddingAngle={2}
                  >
                    {qualityData.map((entry) => (
                      <Cell key={entry.grade} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {qualityTotal}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 20}
                                className="fill-muted-foreground text-xs"
                              >
                                筆評級
                              </tspan>
                            </text>
                          )
                        }
                        return null
                      }}
                    />
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
