'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useFarmId } from '@/hooks/use-farm-id'
import { useCrops } from '@/hooks/use-crops'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Sprout } from 'lucide-react'
import { CropCategory } from '@/lib/types/enums'
import { CROP_CATEGORY_LABELS } from '@/lib/types/labels'
import type { Crop } from '@/lib/types/domain'
import { AddCropDialog } from '@/components/crops/add-crop-dialog'

const ALL_CATEGORIES = Object.values(CropCategory) as string[]

export default function CropsPage() {
  const farmId = useFarmId()
  const { data: crops, isLoading } = useCrops(farmId)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!crops) return []
    return crops.filter((c) => {
      const matchesSearch =
        !search || c.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === 'all' || c.category === category
      return matchesSearch && matchesCategory
    })
  }, [crops, search, category])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">作物資料庫</h1>
          <p className="mt-1 text-muted-foreground">
            瀏覽花蓮地區適合種植的作物資訊
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!farmId}>
          <Plus className="mr-1 size-4" />
          新增自訂作物
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜尋作物名稱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="all">全部</TabsTrigger>
          {ALL_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {CROP_CATEGORY_LABELS[cat as CropCategory]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="mx-auto mb-3 size-12 rounded-full" />
                <Skeleton className="mx-auto mb-2 h-5 w-24" />
                <Skeleton className="mx-auto h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <Sprout className="size-10" />
          <p className="text-lg font-medium">找不到符合條件的作物</p>
          <p className="text-sm">試著調整搜尋條件或分類篩選</p>
        </div>
      )}

      {/* Crop grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((crop) => (
            <CropCard key={crop.id} crop={crop} />
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
  )
}

function CropCard({ crop }: { crop: Crop }) {
  const plantingMonths = crop.plantingMonths ?? []

  return (
    <Link href={`/crops/${crop.id}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="pt-6">
          <div className="mb-3 text-center">
            <span className="text-4xl">{crop.emoji ?? '🌱'}</span>
          </div>
          <h3 className="mb-2 text-center font-semibold">{crop.name}</h3>
          <div className="mb-2 flex flex-wrap justify-center gap-1">
            <Badge variant="secondary" className="text-xs">
              {CROP_CATEGORY_LABELS[crop.category]}
            </Badge>
            {crop.isDefault ? (
              <Badge variant="outline" className="text-xs">
                預設
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-xs text-amber-700"
              >
                自訂
              </Badge>
            )}
          </div>
          {crop.growthDays && (
            <p className="mb-2 text-center text-xs text-muted-foreground">
              生長天數：{crop.growthDays} 天
            </p>
          )}
          {/* Month indicators */}
          {plantingMonths.length > 0 && (
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <div
                  key={m}
                  className={`size-5 rounded text-center text-[10px] leading-5 ${
                    plantingMonths.includes(m)
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {m}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
