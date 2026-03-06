'use client'

import { use, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCropById, useDeleteCrop } from '@/hooks/use-crops'
import { useResolvedCropFacts, useCropProfiles, useUpdateCropFact, useTriggerCropMigration } from '@/hooks/use-crop-profiles'
import { useFarmId } from '@/hooks/use-farm-id'
import type { ResolvedFact, CropProfile } from '@/lib/crop-facts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ArrowLeft,
  Bug,
  Calendar,
  Droplets,
  FlaskConical,
  Layers,
  MapPin,
  Pencil,
  RefreshCw,
  Ruler,
  Scissors,
  Sun,
  Thermometer,
  Trash2,
  Wind,
  X,
  Check,
  AlertTriangle,
  Database,
  Download,
  User,
  Sparkles,
} from 'lucide-react'
import {
  CROP_CATEGORY_LABELS,
  WATER_LEVEL_LABELS,
  SUNLIGHT_LEVEL_LABELS,
  PEST_LEVEL_LABELS,
  RESISTANCE_LEVEL_LABELS,
} from '@/lib/types/labels'
import type { WaterLevel, SunlightLevel, PestLevel, ResistanceLevel } from '@/lib/types/enums'
import { cn } from '@/lib/utils'

// --- Fact key metadata ---

interface FactMeta {
  label: string
  category: string
  render?: (value: string) => string
}

const FACT_CATEGORIES = [
  { key: 'timing', label: '種植時間與生長週期', icon: Calendar },
  { key: 'site', label: '環境適性', icon: Sun },
  { key: 'soil', label: '土壤與肥力', icon: FlaskConical },
  { key: 'water', label: '水分與結構', icon: Droplets },
  { key: 'pest', label: '病蟲害', icon: Bug },
  { key: 'harvest', label: '採收與規劃', icon: Scissors },
  { key: 'local', label: '在地建議', icon: MapPin },
] as const

const FACT_META: Record<string, FactMeta> = {
  // Timing
  plantingMonths: { label: '播種月份', category: 'timing', render: renderMonths },
  harvestMonths: { label: '收成月份', category: 'timing', render: renderMonths },
  growthDays: { label: '生長天數', category: 'timing', render: (v) => `${parseVal(v)} 天` },
  // Site
  tempMin: { label: '最低適溫', category: 'site', render: (v) => `${parseVal(v)}°C` },
  tempMax: { label: '最高適溫', category: 'site', render: (v) => `${parseVal(v)}°C` },
  sunlight: {
    label: '日照需求', category: 'site',
    render: (v) => SUNLIGHT_LEVEL_LABELS[parseVal(v) as SunlightLevel] ?? parseVal(v),
  },
  // Soil
  soilPhMin: { label: 'pH 下限', category: 'soil', render: (v) => String(parseVal(v)) },
  soilPhMax: { label: 'pH 上限', category: 'soil', render: (v) => String(parseVal(v)) },
  // Water / structure
  water: {
    label: '水分需求', category: 'water',
    render: (v) => WATER_LEVEL_LABELS[parseVal(v) as WaterLevel] ?? parseVal(v),
  },
  spacingRowCm: { label: '行距', category: 'water', render: (v) => `${parseVal(v)} cm` },
  spacingPlantCm: { label: '株距', category: 'water', render: (v) => `${parseVal(v)} cm` },
  // Pest
  commonPests: { label: '常見害蟲', category: 'pest', render: renderPestDiseaseList },
  commonDiseases: { label: '常見病害', category: 'pest', render: renderPestDiseaseList },
  preventionActions: { label: '防治方法', category: 'pest', render: renderStringList },
  typhoonResistance: {
    label: '颱風耐受度', category: 'pest',
    render: (v) => RESISTANCE_LEVEL_LABELS[parseVal(v) as ResistanceLevel] ?? parseVal(v),
  },
  // Harvest
  companionPlants: { label: '共榮作物', category: 'harvest', render: renderStringList },
  incompatiblePlants: { label: '忌諱作物', category: 'harvest', render: renderStringList },
  // Local
  localNotes: { label: '在地種植注意事項', category: 'local', render: (v) => parseVal(v) as string },
  localGrowingTips: { label: '在地種植技巧', category: 'local', render: (v) => parseVal(v) as string },
}

function parseVal(v: string): unknown {
  try { return JSON.parse(v) } catch { return v }
}

function renderMonths(v: string): string {
  const arr = parseVal(v)
  if (!Array.isArray(arr)) return String(arr)
  return arr.map((m: number) => `${m}月`).join('、')
}

function renderStringList(v: string): string {
  const arr = parseVal(v)
  if (!Array.isArray(arr)) return String(arr)
  if (arr.length === 0) return '—'
  if (typeof arr[0] === 'string') return arr.join('、')
  return arr.map((item: { name: string }) => item.name).join('、')
}

function renderPestDiseaseList(v: string): string {
  const arr = parseVal(v)
  if (!Array.isArray(arr)) return String(arr)
  if (arr.length === 0) return '—'
  return arr.map((item: { name: string }) => item.name).join('、')
}

// --- Scope badge ---

interface ScopeInfo {
  label: string
  className: string
}

function getScopeInfo(scope: string, scopeKey?: string): ScopeInfo {
  if (scope === 'base') {
    return { label: '一般建議', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }
  }
  if (scope === 'farm') {
    return { label: '本農地調整', className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/30' }
  }
  if (scope === 'location') {
    // Determine granularity from scopeKey
    if (scopeKey) {
      const parts = scopeKey.split('-')
      if (parts.length >= 3) {
        // District level — e.g. TW-HUA-吉安
        return { label: `${parts[2]}鄉建議`, className: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800/30' }
      }
      if (parts.length === 2) {
        // County level
        const countyNames: Record<string, string> = {
          'TW-HUA': '花蓮縣', 'TW-TPE': '臺北市', 'TW-NWT': '新北市',
          'TW-TAO': '桃園市', 'TW-TXG': '臺中市', 'TW-TNN': '臺南市',
          'TW-KHH': '高雄市', 'TW-ILA': '宜蘭縣', 'TW-TTT': '臺東縣',
          'TW-PIF': '屏東縣',
        }
        const countyName = countyNames[scopeKey] ?? scopeKey
        return { label: `${countyName}建議`, className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/30' }
      }
    }
    // Fallback for legacy or unknown scopeKeys
    return { label: '地區建議', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/30' }
  }
  return { label: scope, className: 'bg-muted text-muted-foreground' }
}

function ScopeBadge({ scope, scopeKey }: { scope: string; scopeKey?: string }) {
  const info = getScopeInfo(scope, scopeKey)
  return (
    <span className={cn('inline-flex items-center rounded-full border border-transparent px-1.5 py-0.5 text-[9px] font-medium leading-tight', info.className)}>
      {info.label}
    </span>
  )
}

// --- Confidence dot ---

function ConfidenceDot({ confidence }: { confidence?: string }) {
  const color = confidence === 'high'
    ? 'bg-green-500'
    : confidence === 'low'
      ? 'bg-red-400'
      : 'bg-amber-400'
  const label = confidence === 'high' ? '高可信度' : confidence === 'low' ? '低可信度' : '中等可信度'
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-block size-1.5 rounded-full shrink-0', color)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// --- Origin indicator ---

const ORIGIN_CONFIG: Record<string, { label: string; Icon: typeof Database }> = {
  seeded: { label: '系統內建', Icon: Database },
  imported: { label: 'AI 匯入', Icon: Download },
  user: { label: '使用者調整', Icon: User },
  derived: { label: '推算產生', Icon: Sparkles },
}

function OriginIndicator({ origin }: { origin?: string }) {
  if (!origin) return null
  const config = ORIGIN_CONFIG[origin]
  if (!config) return null
  const { label, Icon } = config

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className="size-2.5 shrink-0 text-muted-foreground/60" />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// --- Provenance popover ---

function ProvenancePopover({
  factKey,
  meta,
  profiles,
}: {
  factKey: string
  meta: FactMeta
  profiles: CropProfile[]
}) {
  // Collect this fact's value from each profile layer
  const layers = useMemo(() => {
    const result: Array<{
      scope: string
      scopeKey?: string
      value: string
      confidence?: string
      origin?: string
    }> = []

    for (const profile of profiles) {
      const fact = profile.facts.find((f) => f.key === factKey)
      if (fact) {
        result.push({
          scope: profile.scope,
          scopeKey: profile.scopeKey,
          value: fact.value,
          confidence: fact.confidence,
          origin: fact.origin,
        })
      }
    }

    return result
  }, [factKey, profiles])

  if (layers.length <= 1) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
        >
          <Layers className="size-2.5" />
          <span>{layers.length} 層</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-medium text-foreground">{meta.label} — 各層來源</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            較具體的範圍會覆蓋較廣泛的建議
          </p>
        </div>
        <div className="divide-y">
          {layers.map((layer, i) => {
            const displayValue = meta.render ? meta.render(layer.value) : String(parseVal(layer.value))
            const isWinner = i === layers.length - 1
            return (
              <div
                key={`${layer.scope}-${layer.scopeKey ?? 'default'}`}
                className={cn(
                  'flex items-start gap-2 px-3 py-2',
                  isWinner && 'bg-accent/50',
                )}
              >
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <ScopeBadge scope={layer.scope} scopeKey={layer.scopeKey} />
                    {isWinner && (
                      <span className="rounded bg-primary/10 px-1 py-0.5 text-[8px] font-medium text-primary">
                        目前使用
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-xs whitespace-pre-wrap',
                    isWinner ? 'text-foreground font-medium' : 'text-muted-foreground line-through decoration-muted-foreground/30',
                  )}>
                    {displayValue}
                  </p>
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  <ConfidenceDot confidence={layer.confidence} />
                  <OriginIndicator origin={layer.origin} />
                </div>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// --- Editable fact row ---

function FactRow({
  fact,
  meta,
  profiles,
  onEdit,
}: {
  fact: ResolvedFact
  meta: FactMeta
  profiles: CropProfile[]
  onEdit: (factKey: string, currentValue: string, profileId: string) => void
}) {
  const displayValue = meta.render ? meta.render(fact.value) : String(parseVal(fact.value))

  // Check if this fact has values at multiple layers
  const hasMultipleLayers = profiles.filter((p) =>
    p.facts.some((f) => f.key === fact.key)
  ).length > 1

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50">
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-foreground/80">{meta.label}</span>
          <ConfidenceDot confidence={fact.confidence} />
          <ScopeBadge scope={fact.resolvedFrom} scopeKey={fact.scopeKey} />
          <OriginIndicator origin={fact.origin} />
          {hasMultipleLayers && (
            <ProvenancePopover factKey={fact.key} meta={meta} profiles={profiles} />
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{displayValue}</p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(fact.key, fact.value, fact.profileId)}
        className="mt-1 shrink-0 rounded p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
        title="新增農地覆寫"
      >
        <Pencil className="size-3" />
      </button>
    </div>
  )
}

// --- Edit inline ---

function FactEditor({
  factKey,
  currentValue,
  profileId,
  onSave,
  onCancel,
}: {
  factKey: string
  currentValue: string
  profileId: string
  onSave: (profileId: string, key: string, value: string) => Promise<void>
  onCancel: () => void
}) {
  const parsed = parseVal(currentValue)
  const isSimple = typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean'
  const [value, setValue] = useState(isSimple ? String(parsed) : currentValue)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Re-encode as JSON for storage
      const encoded = isSimple ? JSON.stringify(isNaN(Number(value)) ? value : Number(value)) : value
      await onSave(profileId, factKey, encoded)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50/30 px-2 py-1.5 dark:border-orange-800/30 dark:bg-orange-950/20">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[9px] font-medium text-orange-600 dark:text-orange-400">
          新增本農地覆寫
        </span>
        <Input
          className="h-7 flex-1 text-xs"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
          disabled={saving}
        />
      </div>
      <Button size="icon" variant="ghost" className="size-6" onClick={handleSave} disabled={saving}>
        <Check className="size-3" />
      </Button>
      <Button size="icon" variant="ghost" className="size-6" onClick={onCancel} disabled={saving}>
        <X className="size-3" />
      </Button>
    </div>
  )
}

// --- Migration banner ---

function MigrationBanner({
  cropId,
  onMigrated,
}: {
  cropId: string
  onMigrated: () => void
}) {
  const triggerMigration = useTriggerCropMigration()
  const [migrating, setMigrating] = useState(false)

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await triggerMigration({ cropId: cropId as any })
      toast.success('已升級至新版資料格式')
      onMigrated()
    } catch {
      toast.error('升級失敗')
    } finally {
      setMigrating(false)
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-950/20">
      <CardContent className="flex items-center gap-3 py-4">
        <AlertTriangle className="size-5 shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            此作物尚未升級至新版資料格式
          </p>
          <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/60">
            升級後可查看分層知識來源和可信度指標
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
          onClick={handleMigrate}
          disabled={migrating}
        >
          {migrating ? <RefreshCw className="mr-1 size-3 animate-spin" /> : <RefreshCw className="mr-1 size-3" />}
          升級資料
        </Button>
      </CardContent>
    </Card>
  )
}

// --- Profile layer summary ---

function ProfileLayerSummary({ profiles }: { profiles: CropProfile[] }) {
  if (!profiles || profiles.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="size-4" />
          知識來源層級
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => {
            const info = getScopeInfo(profile.scope, profile.scopeKey)
            const factCount = profile.facts.length
            return (
              <div
                key={profile._id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                  info.className,
                )}
              >
                <span className="font-medium">{info.label}</span>
                <span className="rounded-full bg-black/5 px-1.5 py-0 text-[10px] dark:bg-white/10">
                  {factCount} 項
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
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
  const farmId = useFarmId()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedFacts = useResolvedCropFacts(cropId as any, farmId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = useCropProfiles(cropId as any)
  const updateFact = useUpdateCropFact()
  const deleteCrop = useDeleteCrop()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [editingFact, setEditingFact] = useState<{ key: string; value: string; profileId: string } | null>(null)
  const [, setMigrationTick] = useState(0)

  const handleEdit = useCallback((factKey: string, currentValue: string, profileId: string) => {
    setEditingFact({ key: factKey, value: currentValue, profileId })
  }, [])

  const handleSaveFact = useCallback(async (profileId: string, key: string, value: string) => {
    // Find the farm-scope profile to save into, or use the source profile
    const farmProfile = profiles?.find((p) => p.scope === 'farm')
    const targetProfileId = farmProfile?._id ?? profileId

    await updateFact({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profileId: targetProfileId as any,
      factKey: key,
      value,
      origin: 'user',
      confidence: 'high',
    })
    setEditingFact(null)
    toast.success('已儲存農地覆寫')
  }, [profiles, updateFact])

  // Cast profiles for component use
  const typedProfiles = useMemo(() => {
    if (!profiles) return []
    return profiles as unknown as CropProfile[]
  }, [profiles])

  if (crop === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
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

  const hasProfiles = profiles && profiles.length > 0
  const plantingMonths = crop.plantingMonths ?? []
  const harvestMonths = crop.harvestMonths ?? []

  // Group resolved facts by category
  const factsByCategory = new Map<string, ResolvedFact[]>()
  if (resolvedFacts) {
    for (const fact of resolvedFacts) {
      const meta = FACT_META[fact.key]
      const category = meta?.category ?? 'local'
      const list = factsByCategory.get(category) ?? []
      list.push(fact as ResolvedFact)
      factsByCategory.set(category, list)
    }
  }

  async function handleDelete() {
    if (!confirm('確定要刪除此自訂作物嗎？')) return
    setDeleting(true)
    try {
      await deleteCrop({ cropId: crop!._id as any })
      router.push('/crops')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/crops">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 size-4" />
          返回作物列表
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{crop.emoji ?? '🌱'}</span>
          <div>
            <h1 className="text-2xl font-bold">{crop.name}</h1>
            <div className="mt-1 flex gap-2">
              <Badge variant="secondary">
                {CROP_CATEGORY_LABELS[crop.category]}
              </Badge>
              {crop.isDefault ? (
                <Badge variant="outline">預設</Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700"
                >
                  自訂
                </Badge>
              )}
              {crop.growthDays && (
                <Badge variant="outline">
                  {crop.growthDays} 天生長期
                </Badge>
              )}
            </div>
          </div>
        </div>
        {!crop.isDefault && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-1 size-4" />
            刪除
          </Button>
        )}
      </div>

      {/* Migration banner if no profiles */}
      {profiles !== undefined && !hasProfiles && (
        <MigrationBanner
          cropId={cropId}
          onMigrated={() => setMigrationTick((t) => t + 1)}
        />
      )}

      {/* Planting calendar — always shown from flat crop data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">種植月曆</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const isPlanting = plantingMonths.includes(month)
              const isHarvest = harvestMonths.includes(month)
              return (
                <div key={month} className="text-center">
                  <div className="mb-1 text-xs text-muted-foreground">
                    {month}月
                  </div>
                  <div
                    className={`flex h-6 items-center justify-center rounded text-xs font-medium ${
                      isPlanting && isHarvest
                        ? 'bg-gradient-to-b from-green-400 to-amber-400 text-white'
                        : isPlanting
                          ? 'bg-green-500 text-white'
                          : isHarvest
                            ? 'bg-amber-500 text-white'
                            : 'bg-muted'
                    }`}
                  >
                    {isPlanting && isHarvest
                      ? '播/收'
                      : isPlanting
                        ? '播'
                        : isHarvest
                          ? '收'
                          : ''}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="size-3 rounded bg-green-500" /> 播種期
            </div>
            <div className="flex items-center gap-1">
              <div className="size-3 rounded bg-amber-500" /> 收成期
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile layer summary */}
      {hasProfiles && typedProfiles.length > 1 && (
        <ProfileLayerSummary profiles={typedProfiles} />
      )}

      {/* Profiled facts by category */}
      {hasProfiles && resolvedFacts && resolvedFacts.length > 0 && (
        <>
          {FACT_CATEGORIES.map(({ key: catKey, label, icon: Icon }) => {
            const facts = factsByCategory.get(catKey)
            if (!facts || facts.length === 0) return null
            return (
              <Card key={catKey}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4" />
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {facts.map((fact) => {
                    const meta = FACT_META[fact.key]
                    if (!meta) return null

                    if (editingFact?.key === fact.key) {
                      return (
                        <FactEditor
                          key={fact.key}
                          factKey={fact.key}
                          currentValue={fact.value}
                          profileId={fact.profileId}
                          onSave={handleSaveFact}
                          onCancel={() => setEditingFact(null)}
                        />
                      )
                    }

                    return (
                      <FactRow
                        key={fact.key}
                        fact={fact}
                        meta={meta}
                        profiles={typedProfiles}
                        onEdit={handleEdit}
                      />
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </>
      )}

      {/* Fallback: legacy display when no profiles exist */}
      {(!hasProfiles || !resolvedFacts || resolvedFacts.length === 0) && (
        <>
          {/* Growing conditions */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {crop.water && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Droplets className="mx-auto mb-2 size-5 text-blue-500" />
                  <p className="text-sm font-medium">水分需求</p>
                  <p className="text-xs text-muted-foreground">
                    {WATER_LEVEL_LABELS[crop.water as WaterLevel]}
                  </p>
                </CardContent>
              </Card>
            )}
            {crop.sunlight && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Sun className="mx-auto mb-2 size-5 text-amber-500" />
                  <p className="text-sm font-medium">日照需求</p>
                  <p className="text-xs text-muted-foreground">
                    {SUNLIGHT_LEVEL_LABELS[crop.sunlight as SunlightLevel]}
                  </p>
                </CardContent>
              </Card>
            )}
            {crop.tempMin != null && crop.tempMax != null && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Thermometer className="mx-auto mb-2 size-5 text-red-500" />
                  <p className="text-sm font-medium">適溫範圍</p>
                  <p className="text-xs text-muted-foreground">
                    {crop.tempMin}°C ~ {crop.tempMax}°C
                  </p>
                </CardContent>
              </Card>
            )}
            {crop.soilPhMin != null && crop.soilPhMax != null && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <FlaskConical className="mx-auto mb-2 size-5 text-violet-500" />
                  <p className="text-sm font-medium">土壤 pH</p>
                  <p className="text-xs text-muted-foreground">
                    {crop.soilPhMin} - {crop.soilPhMax}
                  </p>
                </CardContent>
              </Card>
            )}
            {(crop.spacingRowCm != null || crop.spacingPlantCm != null) && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Ruler className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">間距</p>
                  {crop.spacingPlantCm != null && (
                    <p className="text-xs text-muted-foreground">
                      株距 {crop.spacingPlantCm}cm
                    </p>
                  )}
                  {crop.spacingRowCm != null && (
                    <p className="text-xs text-muted-foreground">
                      行距 {crop.spacingRowCm}cm
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pest info */}
          {(crop.pestSusceptibility || crop.typhoonResistance || (crop.pestControl ?? []).length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bug className="size-4" />
                  病蟲害與防災
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-4">
                  {crop.pestSusceptibility && (
                    <div>
                      <span className="text-sm font-medium">病蟲害敏感度：</span>
                      <Badge variant="outline">
                        {PEST_LEVEL_LABELS[crop.pestSusceptibility as PestLevel]}
                      </Badge>
                    </div>
                  )}
                  {crop.typhoonResistance && (
                    <div>
                      <span className="text-sm font-medium">颱風耐受度：</span>
                      <Badge
                        variant="outline"
                        className={
                          crop.typhoonResistance === 'high'
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : crop.typhoonResistance === 'medium'
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-red-300 bg-red-50 text-red-700'
                        }
                      >
                        {RESISTANCE_LEVEL_LABELS[crop.typhoonResistance as ResistanceLevel]}
                      </Badge>
                    </div>
                  )}
                </div>
                {(crop.pestControl ?? []).length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium">防治方法：</p>
                    <ul className="space-y-1">
                      {(crop.pestControl ?? []).map((method, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-0.5">-</span>
                          <span>{method}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hualien notes */}
          {crop.hualienNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wind className="size-4" />
                  花蓮種植注意事項
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{crop.hualienNotes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
