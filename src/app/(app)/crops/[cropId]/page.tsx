'use client'

import { use, useState, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCropById, useDeleteCrop } from '@/hooks/use-crops'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ArrowLeft,
  Bug,
  ChevronDown,
  Droplets,
  FlaskConical,
  Leaf,
  Move,
  Ruler,
  Scissors,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Timer,
  Trash2,
  TreePine,
  Waves,
  Wind,
  Zap,
} from 'lucide-react'
import {
  CROP_CATEGORY_LABELS,
  WATER_LEVEL_LABELS,
  SUNLIGHT_LEVEL_LABELS,
  RESISTANCE_LEVEL_LABELS,
} from '@/lib/types/labels'
import type { CropCategory, WaterLevel, SunlightLevel, ResistanceLevel } from '@/lib/types/enums'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// === Label maps for new fields ===

const LIFECYCLE_LABELS: Record<string, string> = {
  annual: '一年生',
  biennial: '二年生',
  perennial: '多年生',
  orchard: '果園作物',
}

const PROPAGATION_LABELS: Record<string, string> = {
  seed: '種子',
  seedling: '育苗',
  cutting: '扦插',
  tuber: '塊莖',
  grafted: '嫁接',
  division: '分株',
}

const SUNLIGHT_TYPE_LABELS: Record<string, string> = {
  full_sun: '全日照',
  partial_shade: '半日照',
  shade: '耐陰',
}

const SOIL_TYPE_LABELS: Record<string, string> = {
  sandy: '砂質土',
  loamy: '壤土',
  clay: '黏土',
  'well-drained': '排水良好',
}

const FERTILITY_LABELS: Record<string, string> = {
  light: '輕肥',
  moderate: '中等',
  heavy: '重肥',
}

const HARVEST_METHOD_LABELS: Record<string, string> = {
  cut: '剪採',
  pull: '拔取',
  pick: '摘取',
  dig: '挖掘',
}

const HARVEST_CADENCE_LABELS: Record<string, string> = {
  once: '一次性',
  continuous: '持續採收',
  multiple_flushes: '多次採收',
}

const LEVEL_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

const ROTATION_FAMILY_LABELS: Record<string, string> = {
  brassica: '十字花科',
  solanaceae: '茄科',
  cucurbit: '瓜科',
  legume: '豆科',
  allium: '蔥蒜科',
  root: '根莖類',
}

const GROWTH_STAGE_LABELS: Record<string, string> = {
  germination: '發芽期',
  seedling: '幼苗期',
  vegetative: '營養生長期',
  flowering: '開花期',
  fruiting: '結果期',
  harvest: '採收期',
  dormant: '休眠期',
}

const MONTH_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

// === Helper components ===

function StatCell({
  icon,
  label,
  value,
  sub,
  iconColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  iconColor?: string
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className={cn('mt-0.5 flex-shrink-0', iconColor ?? 'text-muted-foreground')}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium leading-snug">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  )
}

function LevelBar({
  level,
  color,
}: {
  level: string
  color: 'green' | 'amber' | 'red' | 'blue'
}) {
  const levels = ['low', 'medium', 'high']
  const idx = levels.indexOf(level)
  const colorMap = {
    green: ['bg-green-500', 'bg-green-300', 'bg-green-100'],
    amber: ['bg-amber-500', 'bg-amber-300', 'bg-amber-100'],
    red: ['bg-red-500', 'bg-red-300', 'bg-red-100'],
    blue: ['bg-blue-500', 'bg-blue-300', 'bg-blue-100'],
  }

  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 w-3 rounded-full',
            i <= idx ? colorMap[color][0] : 'bg-muted'
          )}
        />
      ))}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-muted-foreground">{icon}</div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

// === Main Page ===

export default function CropDetailPage({
  params,
}: {
  params: Promise<{ cropId: string }>
}) {
  const { cropId } = use(params)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crop = useCropById(cropId as any)
  const deleteCrop = useDeleteCrop()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  if (crop === undefined) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!crop) {
    return (
      <div className="space-y-4">
        <Link href="/crops">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 size-4" />
            返回作物列表
          </Button>
        </Link>
        <p className="text-muted-foreground">找不到此作物</p>
      </div>
    )
  }

  const plantingMonths = crop.plantingMonths ?? []
  const harvestMonths = crop.harvestMonths ?? []
  const hasCalendar = plantingMonths.length > 0 || harvestMonths.length > 0
  const hasEnvironment = crop.tempMin != null || crop.sunlight || crop.humidityMin != null || crop.windSensitivity || crop.droughtTolerance || crop.waterloggingTolerance
  const hasSoil = crop.soilPhMin != null || crop.soilType || crop.fertilityDemand || crop.fertilizerType || crop.commonDeficiencies?.length
  const hasSpacing = crop.spacingPlantCm != null || crop.spacingRowCm != null || crop.maxHeightCm != null || crop.trellisRequired != null || crop.pruningRequired != null
  const hasWater = crop.water || crop.waterFrequencyDays != null || crop.waterAmountMl != null || crop.criticalDroughtStages?.length
  const hasCompanion = crop.companionPlants?.length || crop.antagonistPlants?.length || crop.rotationFamily
  const hasPests = (crop.commonPests ?? []).length > 0 || (crop.commonDiseases ?? []).length > 0
  const hasTyphoon = crop.typhoonResistance || crop.typhoonPrep
  const hasHarvest = crop.harvestMaturitySigns || crop.harvestMethod || crop.harvestCadence || crop.yieldPerPlant || crop.storageNotes || crop.shelfLifeDays != null
  const hasGrowthStages = (crop.growthStages ?? []).length > 0
  const hasGuide = crop.growingGuide && (crop.growingGuide.howToPlant || crop.growingGuide.howToCare || crop.growingGuide.warnings || crop.growingGuide.localNotes)

  // Count how many fields are populated vs total possible
  const totalFields = 60
  const populatedFields = Object.entries(crop).filter(([k, v]) => {
    if (['_id', '_creationTime', 'farmId', 'isDefault'].includes(k)) return false
    if (v === undefined || v === null) return false
    if (Array.isArray(v) && v.length === 0) return false
    if (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => !x)) return false
    return true
  }).length
  const completeness = Math.round((populatedFields / totalFields) * 100)

  async function handleDelete() {
    if (!confirm('確定要刪除此作物嗎？')) return
    setDeleting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await deleteCrop({ cropId: crop!._id as any })
      router.push('/crops')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl space-y-6 pb-12">
        {/* Navigation */}
        <Link href="/crops">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            作物列表
          </Button>
        </Link>

        {/* ===== HERO HEADER ===== */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Emoji avatar */}
              <div
                className="flex size-16 flex-shrink-0 items-center justify-center rounded-xl text-4xl"
                style={{
                  backgroundColor: crop.color ? `${crop.color}18` : undefined,
                }}
              >
                {crop.emoji ?? '🌱'}
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">{crop.name}</h1>
                {crop.scientificName && (
                  <p className="text-sm italic text-muted-foreground mt-0.5">{crop.scientificName}</p>
                )}
                {crop.variety && (
                  <p className="text-xs text-muted-foreground">品種：{crop.variety}</p>
                )}
                {crop.aliases && crop.aliases.length > 0 && (
                  <p className="text-xs text-muted-foreground">別名：{crop.aliases.join('、')}</p>
                )}

                {/* Tags row */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {CROP_CATEGORY_LABELS[crop.category as CropCategory] ?? crop.category}
                  </Badge>
                  {crop.lifecycleType && (
                    <Badge variant="outline" className="text-xs">
                      {LIFECYCLE_LABELS[crop.lifecycleType] ?? crop.lifecycleType}
                    </Badge>
                  )}
                  {crop.propagationMethod && (
                    <Badge variant="outline" className="text-xs">
                      {PROPAGATION_LABELS[crop.propagationMethod] ?? crop.propagationMethod}
                    </Badge>
                  )}
                  {crop.growthDays && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {crop.growthDays}天
                    </Badge>
                  )}
                  {crop.isDefault ? (
                    <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">
                      預設
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700">
                      自訂
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {/* Completeness ring */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative size-10">
                    <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={`${completeness} ${100 - completeness}`}
                        className={cn(
                          completeness >= 70 ? 'text-green-500' :
                          completeness >= 40 ? 'text-amber-500' : 'text-red-400'
                        )}
                        stroke="currentColor"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                      {completeness}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>資料完整度 {completeness}%</TooltipContent>
              </Tooltip>

              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800"
                  onClick={() => toast('功能開發中')}
                >
                  <Sparkles className="size-3.5" />
                  AI 補充知識
                </Button>
                {!crop.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== PLANTING CALENDAR BAR ===== */}
        {hasCalendar && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">種植月曆</span>
              <div className="flex gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2.5 rounded-sm bg-green-500" /> 播種期
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2.5 rounded-sm bg-amber-500" /> 收成期
                </span>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-[3px]">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const isPlanting = plantingMonths.includes(month)
                const isHarvest = harvestMonths.includes(month)
                const isBoth = isPlanting && isHarvest
                return (
                  <div key={month} className="text-center">
                    <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                      {MONTH_NAMES[month - 1]}月
                    </div>
                    <div
                      className={cn(
                        'h-7 rounded-md flex items-center justify-center text-[11px] font-semibold transition-colors',
                        isBoth
                          ? 'bg-gradient-to-b from-green-500 to-amber-500 text-white shadow-sm'
                          : isPlanting
                            ? 'bg-green-500 text-white shadow-sm'
                            : isHarvest
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-muted/60 text-muted-foreground/40'
                      )}
                    >
                      {isBoth ? '播/收' : isPlanting ? '播' : isHarvest ? '收' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Timing quick facts beneath the calendar */}
            {(crop.daysToGermination || crop.daysToTransplant || crop.daysToFlowering || crop.harvestWindowDays) && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground border-t pt-2.5">
                {crop.daysToGermination && (
                  <span>發芽 <b className="text-foreground">{crop.daysToGermination}天</b></span>
                )}
                {crop.daysToTransplant && (
                  <span>可移植 <b className="text-foreground">{crop.daysToTransplant}天</b></span>
                )}
                {crop.daysToFlowering && (
                  <span>開花 <b className="text-foreground">{crop.daysToFlowering}天</b></span>
                )}
                {crop.harvestWindowDays && (
                  <span>採收期 <b className="text-foreground">{crop.harvestWindowDays}天</b></span>
                )}
                {crop.growingSeasonStart && crop.growingSeasonEnd && (
                  <span>生長季 <b className="text-foreground">{crop.growingSeasonStart}月~{crop.growingSeasonEnd}月</b></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== GROWTH STAGES TIMELINE ===== */}
        {hasGrowthStages && (
          <div className="rounded-xl border bg-card p-4">
            <SectionHeader icon={<Sprout className="size-3.5" />} title="生長階段" />
            <div className="relative">
              {/* Timeline track */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-0">
                {(crop.growthStages ?? []).map((stage, idx) => (
                  <div key={idx} className="relative flex gap-3 py-2">
                    {/* Dot */}
                    <div className={cn(
                      'relative z-10 mt-1 size-[15px] flex-shrink-0 rounded-full border-2',
                      idx === 0 ? 'border-green-500 bg-green-100' :
                      idx === (crop.growthStages ?? []).length - 1 ? 'border-amber-500 bg-amber-100' :
                      'border-muted-foreground/40 bg-background'
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">
                          {GROWTH_STAGE_LABELS[stage.stage] ?? stage.stage}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          第{stage.daysFromStart}天起
                        </span>
                      </div>
                      {stage.careNotes && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{stage.careNotes}</p>
                      )}
                      <div className="flex gap-3 mt-0.5">
                        {stage.waterFrequencyDays && (
                          <span className="text-[11px] text-blue-600 flex items-center gap-0.5">
                            <Droplets className="size-2.5" /> 每{stage.waterFrequencyDays}天
                          </span>
                        )}
                        {stage.fertilizerFrequencyDays && (
                          <span className="text-[11px] text-amber-600 flex items-center gap-0.5">
                            <FlaskConical className="size-2.5" /> 每{stage.fertilizerFrequencyDays}天
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== QUICK REFERENCE GRID ===== */}
        {/* Two-column dense grid of environment + soil + water + spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: Environment + Water */}
          {(hasEnvironment || hasWater) && (
            <div className="rounded-xl border bg-card p-4 space-y-1">
              {hasEnvironment && (
                <>
                  <SectionHeader icon={<Thermometer className="size-3.5" />} title="環境需求" />
                  <div className="grid grid-cols-2 gap-x-4">
                    {(crop.tempMin != null || crop.tempOptimalMin != null) && (
                      <StatCell
                        icon={<Thermometer className="size-4" />}
                        iconColor="text-red-400"
                        label="溫度範圍"
                        value={
                          crop.tempOptimalMin != null && crop.tempOptimalMax != null
                            ? `${crop.tempOptimalMin}~${crop.tempOptimalMax}°C`
                            : crop.tempMin != null && crop.tempMax != null
                              ? `${crop.tempMin}~${crop.tempMax}°C`
                              : '—'
                        }
                        sub={
                          crop.tempOptimalMin != null && crop.tempMin != null
                            ? `極限 ${crop.tempMin}~${crop.tempMax}°C`
                            : undefined
                        }
                      />
                    )}
                    {crop.sunlight && (
                      <StatCell
                        icon={<Sun className="size-4" />}
                        iconColor="text-amber-400"
                        label="日照"
                        value={SUNLIGHT_TYPE_LABELS[crop.sunlight] ?? crop.sunlight}
                        sub={
                          crop.sunlightHoursMin != null
                            ? `${crop.sunlightHoursMin}~${crop.sunlightHoursMax ?? '?'}小時/天`
                            : undefined
                        }
                      />
                    )}
                    {(crop.humidityMin != null || crop.humidityMax != null) && (
                      <StatCell
                        icon={<Waves className="size-4" />}
                        iconColor="text-sky-400"
                        label="濕度"
                        value={`${crop.humidityMin ?? '?'}~${crop.humidityMax ?? '?'}%`}
                      />
                    )}
                    {(crop.altitudeMin != null || crop.altitudeMax != null) && (
                      <StatCell
                        icon={<TreePine className="size-4" />}
                        iconColor="text-emerald-500"
                        label="海拔"
                        value={`${crop.altitudeMin ?? 0}~${crop.altitudeMax ?? '?'}m`}
                      />
                    )}
                  </div>
                  {/* Tolerance bars */}
                  {(crop.windSensitivity || crop.droughtTolerance || crop.waterloggingTolerance) && (
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t mt-2">
                      {crop.windSensitivity && (
                        <div>
                          <div className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Wind className="size-2.5" /> 風敏感度
                          </div>
                          <LevelBar level={crop.windSensitivity} color="amber" />
                        </div>
                      )}
                      {crop.droughtTolerance && (
                        <div>
                          <div className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Zap className="size-2.5" /> 耐旱力
                          </div>
                          <LevelBar level={crop.droughtTolerance} color="green" />
                        </div>
                      )}
                      {crop.waterloggingTolerance && (
                        <div>
                          <div className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
                            <Droplets className="size-2.5" /> 耐澇力
                          </div>
                          <LevelBar level={crop.waterloggingTolerance} color="blue" />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {hasEnvironment && hasWater && <Separator className="my-3" />}
              {hasWater && (
                <>
                  <SectionHeader icon={<Droplets className="size-3.5" />} title="水分管理" />
                  <div className="grid grid-cols-2 gap-x-4">
                    {crop.water && (
                      <StatCell
                        icon={<Droplets className="size-4" />}
                        iconColor="text-blue-500"
                        label="需水量"
                        value={WATER_LEVEL_LABELS[crop.water as WaterLevel] ?? crop.water}
                      />
                    )}
                    {crop.waterFrequencyDays != null && (
                      <StatCell
                        icon={<Timer className="size-4" />}
                        iconColor="text-blue-400"
                        label="澆水頻率"
                        value={`每 ${crop.waterFrequencyDays} 天`}
                        sub={crop.waterAmountMl ? `約 ${crop.waterAmountMl}ml/次` : undefined}
                      />
                    )}
                  </div>
                  {crop.criticalDroughtStages && crop.criticalDroughtStages.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] text-muted-foreground">缺水敏感期：</span>
                      <span className="text-xs font-medium">
                        {crop.criticalDroughtStages.map(s => GROWTH_STAGE_LABELS[s] ?? s).join('、')}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* RIGHT: Soil + Spacing */}
          {(hasSoil || hasSpacing) && (
            <div className="rounded-xl border bg-card p-4 space-y-1">
              {hasSoil && (
                <>
                  <SectionHeader icon={<FlaskConical className="size-3.5" />} title="土壤與施肥" />
                  <div className="grid grid-cols-2 gap-x-4">
                    {crop.soilPhMin != null && (
                      <StatCell
                        icon={<FlaskConical className="size-4" />}
                        iconColor="text-violet-500"
                        label="pH 範圍"
                        value={`${crop.soilPhMin}~${crop.soilPhMax ?? '?'}`}
                      />
                    )}
                    {crop.soilType && (
                      <StatCell
                        icon={<Leaf className="size-4" />}
                        iconColor="text-amber-700"
                        label="土壤類型"
                        value={SOIL_TYPE_LABELS[crop.soilType] ?? crop.soilType}
                      />
                    )}
                    {crop.fertilityDemand && (
                      <StatCell
                        icon={<Zap className="size-4" />}
                        iconColor="text-emerald-600"
                        label="肥力需求"
                        value={FERTILITY_LABELS[crop.fertilityDemand] ?? crop.fertilityDemand}
                        sub={crop.fertilizerType ? `偏好 ${crop.fertilizerType}` : undefined}
                      />
                    )}
                    {crop.fertilizerFrequencyDays != null && (
                      <StatCell
                        icon={<Timer className="size-4" />}
                        iconColor="text-emerald-500"
                        label="施肥頻率"
                        value={`每 ${crop.fertilizerFrequencyDays} 天`}
                      />
                    )}
                  </div>
                  {crop.commonDeficiencies && crop.commonDeficiencies.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] text-muted-foreground">常見缺乏：</span>
                      {crop.commonDeficiencies.map((d) => (
                        <Badge key={d} variant="outline" className="text-[10px] ml-1 py-0 border-amber-200 text-amber-700">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
              {hasSoil && hasSpacing && <Separator className="my-3" />}
              {hasSpacing && (
                <>
                  <SectionHeader icon={<Ruler className="size-3.5" />} title="間距與結構" />
                  <div className="grid grid-cols-2 gap-x-4">
                    {crop.spacingPlantCm != null && (
                      <StatCell
                        icon={<Move className="size-4" />}
                        iconColor="text-muted-foreground"
                        label="株距"
                        value={`${crop.spacingPlantCm} cm`}
                        sub={crop.spacingRowCm ? `行距 ${crop.spacingRowCm} cm` : undefined}
                      />
                    )}
                    {crop.maxHeightCm != null && (
                      <StatCell
                        icon={<Ruler className="size-4" />}
                        iconColor="text-muted-foreground"
                        label="最大高度"
                        value={`${crop.maxHeightCm} cm`}
                        sub={crop.maxSpreadCm ? `展幅 ${crop.maxSpreadCm} cm` : undefined}
                      />
                    )}
                  </div>
                  {(crop.trellisRequired || crop.pruningRequired) && (
                    <div className="flex gap-2 pt-1">
                      {crop.trellisRequired && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          需搭架
                        </Badge>
                      )}
                      {crop.pruningRequired && (
                        <Badge variant="outline" className="text-[10px] py-0 gap-0.5">
                          <Scissors className="size-2.5" />
                          需修剪
                          {crop.pruningFrequencyDays ? ` (每${crop.pruningFrequencyDays}天)` : ''}
                        </Badge>
                      )}
                    </div>
                  )}
                  {crop.pruningMonths && crop.pruningMonths.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] text-muted-foreground">修剪月份：</span>
                      <span className="text-xs font-medium">
                        {crop.pruningMonths.map(m => `${m}月`).join('、')}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ===== COMPANION & ROTATION ===== */}
        {hasCompanion && (
          <div className="rounded-xl border bg-card p-4">
            <SectionHeader icon={<Leaf className="size-3.5" />} title="共植與輪作" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {crop.companionPlants && crop.companionPlants.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">良伴植物</div>
                  <div className="flex flex-wrap gap-1">
                    {crop.companionPlants.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {crop.antagonistPlants && crop.antagonistPlants.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">忌避植物</div>
                  <div className="flex flex-wrap gap-1">
                    {crop.antagonistPlants.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(crop.rotationFamily || crop.rotationYears) && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">輪作資訊</div>
                  <div className="text-sm">
                    {crop.rotationFamily && (
                      <span className="font-medium">{ROTATION_FAMILY_LABELS[crop.rotationFamily] ?? crop.rotationFamily}</span>
                    )}
                    {crop.rotationYears && (
                      <span className="text-muted-foreground"> / {crop.rotationYears}年輪作</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PEST & DISEASE ===== */}
        {hasPests && (
          <div className="rounded-xl border bg-card p-4">
            <SectionHeader icon={<Bug className="size-3.5" />} title="病蟲害" />
            <div className="space-y-4">
              {(crop.commonPests ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">常見害蟲</div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-24 text-xs">名稱</TableHead>
                        <TableHead className="text-xs">症狀</TableHead>
                        <TableHead className="text-xs">防治方法</TableHead>
                        <TableHead className="text-xs w-28">觸發條件</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(crop.commonPests ?? []).map((pest, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-xs">{pest.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{pest.symptoms}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{pest.organicTreatment}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{pest.triggerConditions ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {(crop.commonDiseases ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">常見病害</div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-24 text-xs">名稱</TableHead>
                        <TableHead className="text-xs">症狀</TableHead>
                        <TableHead className="text-xs">防治方法</TableHead>
                        <TableHead className="text-xs w-28">觸發條件</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(crop.commonDiseases ?? []).map((disease, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-xs">{disease.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{disease.symptoms}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{disease.organicTreatment}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{disease.triggerConditions ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TYPHOON ===== */}
        {hasTyphoon && (
          <div className="rounded-xl border bg-card p-4">
            <SectionHeader icon={<Wind className="size-3.5" />} title="颱風應對" />
            <div className="flex items-start gap-4">
              {crop.typhoonResistance && (
                <div className="flex-shrink-0">
                  <div className="text-xs text-muted-foreground mb-1">耐風力</div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      crop.typhoonResistance === 'high'
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : crop.typhoonResistance === 'medium'
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-red-300 bg-red-50 text-red-700'
                    )}
                  >
                    {RESISTANCE_LEVEL_LABELS[crop.typhoonResistance as ResistanceLevel] ?? crop.typhoonResistance}
                  </Badge>
                </div>
              )}
              {crop.typhoonPrep && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">防颱準備</div>
                  <p className="text-sm leading-relaxed">{crop.typhoonPrep}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== HARVEST ===== */}
        {hasHarvest && (
          <div className="rounded-xl border bg-card p-4">
            <SectionHeader icon={<Leaf className="size-3.5" />} title="採收與保存" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
              {crop.harvestMethod && (
                <StatCell
                  icon={<Scissors className="size-4" />}
                  iconColor="text-amber-600"
                  label="採收方式"
                  value={HARVEST_METHOD_LABELS[crop.harvestMethod] ?? crop.harvestMethod}
                />
              )}
              {crop.harvestCadence && (
                <StatCell
                  icon={<Timer className="size-4" />}
                  iconColor="text-muted-foreground"
                  label="採收頻率"
                  value={HARVEST_CADENCE_LABELS[crop.harvestCadence] ?? crop.harvestCadence}
                />
              )}
              {crop.yieldPerPlant && (
                <StatCell
                  icon={<Sprout className="size-4" />}
                  iconColor="text-green-600"
                  label="單株產量"
                  value={crop.yieldPerPlant}
                />
              )}
              {crop.shelfLifeDays != null && (
                <StatCell
                  icon={<Timer className="size-4" />}
                  iconColor="text-muted-foreground"
                  label="保鮮期"
                  value={`${crop.shelfLifeDays} 天`}
                />
              )}
            </div>
            {crop.harvestMaturitySigns && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-0.5">成熟辨識</div>
                <p className="text-sm leading-relaxed">{crop.harvestMaturitySigns}</p>
              </div>
            )}
            {crop.storageNotes && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-0.5">保存方式</div>
                <p className="text-sm leading-relaxed">{crop.storageNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* ===== GROWING GUIDE ===== */}
        {hasGuide && (
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <SectionHeader icon={<Sprout className="size-3.5" />} title="種植指南" />
            {[
              { key: 'howToPlant', title: '種植方法', icon: <Sprout className="size-3.5 text-green-600" /> },
              { key: 'howToCare', title: '日常照護', icon: <Droplets className="size-3.5 text-blue-500" /> },
              { key: 'warnings', title: '注意事項', icon: <ShieldAlert className="size-3.5 text-amber-500" /> },
              { key: 'localNotes', title: '花蓮在地建議', icon: <TreePine className="size-3.5 text-emerald-600" /> },
            ].map(({ key, title, icon }) => {
              const content = crop.growingGuide?.[key as keyof typeof crop.growingGuide]
              if (!content) return null
              return (
                <Collapsible key={key} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group/guide">
                    {icon}
                    <span className="text-sm font-medium">{title}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground ml-auto transition-transform group-data-[state=closed]/guide:rotate-[-90deg]" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 pl-6 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {content}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}

        {/* ===== AI ENRICHMENT META ===== */}
        {crop.lastAiEnriched && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
            <Sparkles className="size-3" />
            <span>
              AI 最後更新：{new Date(crop.lastAiEnriched).toLocaleDateString('zh-TW')}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
