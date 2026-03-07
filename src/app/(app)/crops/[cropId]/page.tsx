'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCropById, useDeleteCrop } from '@/hooks/use-crops'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Bug,
  Droplets,
  FlaskConical,
  Ruler,
  Sun,
  Thermometer,
  Trash2,
  Wind,
} from 'lucide-react'
import {
  CROP_CATEGORY_LABELS,
  WATER_LEVEL_LABELS,
  SUNLIGHT_LEVEL_LABELS,
  RESISTANCE_LEVEL_LABELS,
} from '@/lib/types/labels'
import type { WaterLevel, SunlightLevel, ResistanceLevel } from '@/lib/types/enums'

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

  const plantingMonths = crop.plantingMonths ?? []
  const harvestMonths = crop.harvestMonths ?? []

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
            {crop.scientificName && (
              <p className="text-sm italic text-muted-foreground">{crop.scientificName}</p>
            )}
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
              {crop.lifecycleType && (
                <Badge variant="outline">{crop.lifecycleType}</Badge>
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

      {/* Planting calendar */}
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

      {/* Growing conditions */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {crop.water && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Droplets className="mx-auto mb-2 size-5 text-blue-500" />
              <p className="text-sm font-medium">水分需求</p>
              <p className="text-xs text-muted-foreground">
                {WATER_LEVEL_LABELS[crop.water as WaterLevel] ?? crop.water}
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
                {SUNLIGHT_LEVEL_LABELS[crop.sunlight as SunlightLevel] ?? crop.sunlight}
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

      {/* Typhoon resistance */}
      {crop.typhoonResistance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wind className="size-4" />
              颱風耐受度
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              {RESISTANCE_LEVEL_LABELS[crop.typhoonResistance as ResistanceLevel] ?? crop.typhoonResistance}
            </Badge>
            {crop.typhoonPrep && (
              <p className="mt-2 text-sm text-muted-foreground">{crop.typhoonPrep}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pest & Disease summary */}
      {((crop.commonPests ?? []).length > 0 || (crop.commonDiseases ?? []).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bug className="size-4" />
              病蟲害
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(crop.commonPests ?? []).length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">常見害蟲</p>
                <ul className="space-y-1">
                  {(crop.commonPests ?? []).map((pest, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{pest.name}</span>
                      {' — '}{pest.symptoms}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(crop.commonDiseases ?? []).length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">常見病害</p>
                <ul className="space-y-1">
                  {(crop.commonDiseases ?? []).map((disease, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{disease.name}</span>
                      {' — '}{disease.symptoms}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
