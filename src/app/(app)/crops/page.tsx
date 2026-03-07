'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useFarmIdWithStatus } from '@/hooks/use-farm-id'
import { useCrops } from '@/hooks/use-crops'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Droplets,
  Search,
  Plus,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Timer,
  Wind,
} from 'lucide-react'
import { CropCategory } from '@/lib/types/enums'
import {
  CROP_CATEGORY_LABELS,
  WATER_LEVEL_LABELS,
  SUNLIGHT_LEVEL_LABELS,
  RESISTANCE_LEVEL_LABELS,
} from '@/lib/types/labels'
import type {
  CropCategory as CropCategoryType,
  WaterLevel,
  SunlightLevel,
  ResistanceLevel,
} from '@/lib/types/enums'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AddCropDialog } from '@/components/crops/add-crop-dialog'

const ALL_CATEGORIES = Object.values(CropCategory) as string[]

const LIFECYCLE_LABELS: Record<string, string> = {
  annual: '一年生',
  biennial: '二年生',
  perennial: '多年生',
  orchard: '果園',
}

export default function CropsPage() {
  const { farmId, isLoading: farmLoading } = useFarmIdWithStatus()
  const crops = useCrops(farmId)
  const isLoading = farmLoading || crops === undefined
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!crops) return []
    return crops.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.scientificName && c.scientificName.toLowerCase().includes(search.toLowerCase())) ||
        (c.aliases && c.aliases.some(a => a.toLowerCase().includes(search.toLowerCase())))
      const matchesCategory = category === 'all' || c.category === category
      return matchesSearch && matchesCategory
    })
  }, [crops, search, category])

  // Group count per category
  const categoryCounts = useMemo(() => {
    if (!crops) return {}
    const counts: Record<string, number> = {}
    for (const c of crops) {
      counts[c.category] = (counts[c.category] ?? 0) + 1
    }
    return counts
  }, [crops])

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">作物資料庫</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {crops ? `${crops.length} 種作物` : '載入中...'}
              {' · '}花蓮地區適合種植的作物資訊
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast('功能開發中')}
              disabled={!farmId}
              className="gap-1.5 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Sparkles className="size-3.5" />
              智慧新增
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!farmId}>
              <Plus className="mr-1 size-3.5" />
              新增作物
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜尋作物名稱、學名、別名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category tabs */}
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">
              全部{crops ? ` (${crops.length})` : ''}
            </TabsTrigger>
            {ALL_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat]
              if (!count) return null
              return (
                <TabsTrigger key={cat} value={cat}>
                  {CROP_CATEGORY_LABELS[cat as CropCategoryType]}
                  {' '}({count})
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Sprout className="size-10" />
            <p className="text-lg font-medium">找不到符合條件的作物</p>
            <p className="text-sm">試著調整搜尋條件或分類篩選</p>
          </div>
        )}

        {/* Crop grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((crop) => (
              <CropCard key={crop._id} crop={crop} />
            ))}
          </div>
        )}

        {/* Add crop dialog */}
        <AddCropDialog
          farmId={farmId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </TooltipProvider>
  )
}

// === Crop Card ===

interface CropCardData {
  _id: string
  name: string
  scientificName?: string | null
  emoji?: string | null
  color?: string | null
  category: string
  isDefault?: boolean
  lifecycleType?: string | null
  growthDays?: number | null
  plantingMonths?: number[] | null
  harvestMonths?: number[] | null
  water?: string | null
  sunlight?: string | null
  tempMin?: number | null
  tempMax?: number | null
  typhoonResistance?: string | null
  lastAiEnriched?: number | null
}

function CropCard({ crop }: { crop: CropCardData }) {
  const plantingMonths = crop.plantingMonths ?? []
  const harvestMonths = crop.harvestMonths ?? []
  const hasCalendar = plantingMonths.length > 0 || harvestMonths.length > 0

  // Determine current month for "plantable now" indicator
  const currentMonth = new Date().getMonth() + 1
  const canPlantNow = plantingMonths.includes(currentMonth)
  const canHarvestNow = harvestMonths.includes(currentMonth)

  return (
    <Link href={`/crops/${crop._id}`}>
      <div className="group relative rounded-xl border bg-card transition-all hover:shadow-md hover:border-foreground/15 cursor-pointer h-full">
        <div className="p-4">
          {/* Top row: emoji + name + badges */}
          <div className="flex items-start gap-3">
            <div
              className="flex size-11 flex-shrink-0 items-center justify-center rounded-lg text-2xl transition-transform group-hover:scale-105"
              style={{
                backgroundColor: crop.color ? `${crop.color}15` : undefined,
              }}
            >
              {crop.emoji ?? '🌱'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold truncate">{crop.name}</h3>
                {/* Live status dot */}
                {canPlantNow && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>現在可播種</TooltipContent>
                  </Tooltip>
                )}
                {!canPlantNow && canHarvestNow && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>現在可採收</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {crop.scientificName && (
                <p className="text-[11px] italic text-muted-foreground truncate">{crop.scientificName}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px] py-0 h-4">
                  {CROP_CATEGORY_LABELS[crop.category as CropCategoryType] ?? crop.category}
                </Badge>
                {crop.lifecycleType && (
                  <Badge variant="outline" className="text-[10px] py-0 h-4">
                    {LIFECYCLE_LABELS[crop.lifecycleType] ?? crop.lifecycleType}
                  </Badge>
                )}
                {crop.growthDays && (
                  <Badge variant="outline" className="text-[10px] py-0 h-4 font-mono">
                    {crop.growthDays}天
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Mini calendar bar */}
          {hasCalendar && (
            <div className="mt-3 flex gap-[2px]">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isPlanting = plantingMonths.includes(m)
                const isHarvest = harvestMonths.includes(m)
                const isCurrent = m === currentMonth
                return (
                  <Tooltip key={m}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'h-[6px] flex-1 rounded-[2px] transition-colors',
                          isPlanting && isHarvest
                            ? 'bg-gradient-to-b from-green-500 to-amber-500'
                            : isPlanting
                              ? 'bg-green-500'
                              : isHarvest
                                ? 'bg-amber-500'
                                : 'bg-muted',
                          isCurrent && 'ring-1 ring-foreground/30 ring-offset-1'
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {m}月
                      {isPlanting && ' 播種'}
                      {isHarvest && ' 收成'}
                      {isCurrent && ' (本月)'}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )}

          {/* Quick fact pills */}
          {(crop.water || crop.sunlight || (crop.tempMin != null && crop.tempMax != null) || crop.typhoonResistance) && (
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {crop.water && (
                <span className="flex items-center gap-0.5">
                  <Droplets className="size-3 text-blue-400" />
                  {WATER_LEVEL_LABELS[crop.water as WaterLevel] ?? crop.water}
                </span>
              )}
              {crop.sunlight && (
                <span className="flex items-center gap-0.5">
                  <Sun className="size-3 text-amber-400" />
                  {SUNLIGHT_LEVEL_LABELS[crop.sunlight as SunlightLevel] ?? crop.sunlight}
                </span>
              )}
              {crop.tempMin != null && crop.tempMax != null && (
                <span className="flex items-center gap-0.5">
                  <Thermometer className="size-3 text-red-400" />
                  {crop.tempMin}~{crop.tempMax}°C
                </span>
              )}
              {crop.typhoonResistance && (
                <span className={cn(
                  'flex items-center gap-0.5',
                  crop.typhoonResistance === 'high' ? 'text-green-600' :
                  crop.typhoonResistance === 'medium' ? 'text-amber-600' : 'text-red-500'
                )}>
                  <Wind className="size-3" />
                  颱風{RESISTANCE_LEVEL_LABELS[crop.typhoonResistance as ResistanceLevel] ?? crop.typhoonResistance}
                </span>
              )}
            </div>
          )}
        </div>

        {/* AI enriched indicator */}
        {crop.lastAiEnriched && (
          <div className="absolute top-3 right-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Sparkles className="size-3 text-violet-400" />
              </TooltipTrigger>
              <TooltipContent>AI 已補充知識</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </Link>
  )
}
