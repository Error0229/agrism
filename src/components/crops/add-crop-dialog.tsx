'use client'

import { useState } from 'react'
import { useCreateCrop } from '@/hooks/use-crops'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { CropCategory, WaterLevel, SunlightLevel } from '@/lib/types/enums'
import {
  CROP_CATEGORY_LABELS,
  WATER_LEVEL_LABELS,
  SUNLIGHT_LEVEL_LABELS,
} from '@/lib/types/labels'
import type {
  CropCategory as CropCategoryType,
  WaterLevel as WaterLevelType,
  SunlightLevel as SunlightLevelType,
} from '@/lib/types/enums'

interface AddCropDialogProps {
  farmId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCropDialog({ farmId, open, onOpenChange }: AddCropDialogProps) {
  const createCrop = useCreateCrop(farmId)

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🌱')
  const [category, setCategory] = useState<string>('')
  const [growthDays, setGrowthDays] = useState('')
  const [plantingMonths, setPlantingMonths] = useState<number[]>([])
  const [harvestMonths, setHarvestMonths] = useState<number[]>([])
  const [water, setWater] = useState<string>('')
  const [sunlight, setSunlight] = useState<string>('')

  function resetForm() {
    setName('')
    setEmoji('🌱')
    setCategory('')
    setGrowthDays('')
    setPlantingMonths([])
    setHarvestMonths([])
    setWater('')
    setSunlight('')
  }

  function toggleMonth(
    month: number,
    current: number[],
    setter: (v: number[]) => void
  ) {
    setter(
      current.includes(month)
        ? current.filter((m) => m !== month)
        : [...current, month]
    )
  }

  function handleSubmit() {
    if (!name || !category) return
    createCrop.mutate(
      {
        name,
        emoji: emoji || undefined,
        category: category as CropCategoryType,
        growthDays: growthDays ? parseInt(growthDays) : undefined,
        plantingMonths: plantingMonths.length > 0 ? plantingMonths : undefined,
        harvestMonths: harvestMonths.length > 0 ? harvestMonths : undefined,
        water: water ? (water as WaterLevelType) : undefined,
        sunlight: sunlight ? (sunlight as SunlightLevelType) : undefined,
      },
      {
        onSuccess: () => {
          resetForm()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) resetForm()
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>新增自訂作物</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Name + Emoji */}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">名稱 *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="作物名稱"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Emoji</label>
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-16 text-center"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium">分類 *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CropCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CROP_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Growth days */}
            <div className="space-y-1">
              <label className="text-xs font-medium">生長天數</label>
              <Input
                type="number"
                min="1"
                value={growthDays}
                onChange={(e) => setGrowthDays(e.target.value)}
                placeholder="如 90"
              />
            </div>

            {/* Planting months */}
            <div className="space-y-1">
              <label className="text-xs font-medium">播種月份</label>
              <MonthSelector
                selected={plantingMonths}
                onToggle={(m) =>
                  toggleMonth(m, plantingMonths, setPlantingMonths)
                }
              />
            </div>

            {/* Harvest months */}
            <div className="space-y-1">
              <label className="text-xs font-medium">收成月份</label>
              <MonthSelector
                selected={harvestMonths}
                onToggle={(m) =>
                  toggleMonth(m, harvestMonths, setHarvestMonths)
                }
              />
            </div>

            {/* Water + Sunlight */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">水分需求</label>
                <Select value={water} onValueChange={setWater}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(WaterLevel).map((w) => (
                      <SelectItem key={w} value={w}>
                        {WATER_LEVEL_LABELS[w]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">日照需求</label>
                <Select value={sunlight} onValueChange={setSunlight}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SunlightLevel).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SUNLIGHT_LEVEL_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!name || !category || createCrop.isPending}
              className="w-full"
            >
              {createCrop.isPending && (
                <Loader2 className="mr-1 size-4 animate-spin" />
              )}
              儲存自訂作物
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function MonthSelector({
  selected,
  onToggle,
}: {
  selected: number[]
  onToggle: (month: number) => void
}) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onToggle(m)}
          className={`rounded border px-1 py-1 text-xs transition-colors ${
            selected.includes(m)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border hover:bg-accent'
          }`}
        >
          {m}月
        </button>
      ))}
    </div>
  )
}
