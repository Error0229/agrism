'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'
import { useUpdateCrop } from '@/hooks/use-crops'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown,
  Droplets,
  FlaskConical,
  Leaf,
  Loader2,
  Move,
  Ruler,
  Scissors,
  ShieldAlert,
  Sprout,
  Sun,
  Thermometer,
  Timer,
  TreePine,
  Waves,
  Wind,
  X,
} from 'lucide-react'
import {
  CROP_CATEGORY_LABELS,
  WATER_LEVEL_LABELS,
  RESISTANCE_LEVEL_LABELS,
} from '@/lib/types/labels'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Id } from '../../../convex/_generated/dataModel'

// === Label maps (matching those in page.tsx) ===

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

const MONTH_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

// === Reusable sub-components ===

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-muted-foreground">{icon}</div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function MonthPicker({
  value,
  onChange,
}: {
  value: number[]
  onChange: (months: number[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const active = value.includes(month)
        return (
          <button
            key={month}
            type="button"
            onClick={() => {
              onChange(
                active ? value.filter((m) => m !== month) : [...value, month].sort((a, b) => a - b)
              )
            }}
            className={cn(
              'h-7 min-w-[3rem] rounded-md border text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
            )}
          >
            {MONTH_NAMES[month - 1]}月
          </button>
        )
      })}
    </div>
  )
}

function TagEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const addTag = useCallback(() => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }, [input, value, onChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={placeholder ?? '輸入後按 Enter 新增'}
        className="h-8 text-xs"
      />
    </div>
  )
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string | undefined
  onChange: (val: string) => void
  options: Record<string, string>
  placeholder?: string
}) {
  return (
    <Select value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs w-full">
        <SelectValue placeholder={placeholder ?? '選擇'} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([k, label]) => (
          <SelectItem key={k} value={k} className="text-xs">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NumberField({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number | undefined
  onChange: (val: number | undefined) => void
  placeholder?: string
  step?: string
}) {
  return (
    <Input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? undefined : Number(v))
      }}
      placeholder={placeholder}
      className="h-8 text-xs"
      step={step}
    />
  )
}

// === Types ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CropData = Record<string, any>

interface CropEditFormProps {
  crop: CropData
  onCancel: () => void
  onSaved: () => void
}

// === Main Component ===

export function CropEditForm({ crop, onCancel, onSaved }: CropEditFormProps) {
  const updateCrop = useUpdateCrop()
  const [saving, setSaving] = useState(false)

  // Form state — initialized from crop data
  const [form, setForm] = useState<CropData>(() => ({
    name: crop.name ?? '',
    variety: crop.variety ?? '',
    aliases: crop.aliases ?? [],
    imageUrl: crop.imageUrl ?? '',
    thumbnailUrl: crop.thumbnailUrl ?? '',
    imageSourceUrl: crop.imageSourceUrl ?? '',
    imageAuthor: crop.imageAuthor ?? '',
    imageLicense: crop.imageLicense ?? '',
    category: crop.category ?? '',
    lifecycleType: crop.lifecycleType ?? '',
    propagationMethod: crop.propagationMethod ?? '',

    plantingMonths: crop.plantingMonths ?? [],
    harvestMonths: crop.harvestMonths ?? [],
    growthDays: crop.growthDays,
    daysToGermination: crop.daysToGermination,
    daysToTransplant: crop.daysToTransplant,
    daysToFlowering: crop.daysToFlowering,
    harvestWindowDays: crop.harvestWindowDays,

    tempMin: crop.tempMin,
    tempMax: crop.tempMax,
    tempOptimalMin: crop.tempOptimalMin,
    tempOptimalMax: crop.tempOptimalMax,
    humidityMin: crop.humidityMin,
    humidityMax: crop.humidityMax,
    sunlight: crop.sunlight ?? '',
    sunlightHoursMin: crop.sunlightHoursMin,
    sunlightHoursMax: crop.sunlightHoursMax,
    windSensitivity: crop.windSensitivity ?? '',
    droughtTolerance: crop.droughtTolerance ?? '',
    waterloggingTolerance: crop.waterloggingTolerance ?? '',

    soilPhMin: crop.soilPhMin,
    soilPhMax: crop.soilPhMax,
    soilType: crop.soilType ?? '',
    organicMatterPreference: crop.organicMatterPreference ?? '',
    fertilityDemand: crop.fertilityDemand ?? '',
    fertilizerType: crop.fertilizerType ?? '',
    fertilizerFrequencyDays: crop.fertilizerFrequencyDays,

    spacingPlantCm: crop.spacingPlantCm,
    spacingRowCm: crop.spacingRowCm,
    maxHeightCm: crop.maxHeightCm,
    maxSpreadCm: crop.maxSpreadCm,
    trellisRequired: crop.trellisRequired ?? false,
    pruningRequired: crop.pruningRequired ?? false,
    pruningFrequencyDays: crop.pruningFrequencyDays,
    pruningMonths: crop.pruningMonths ?? [],

    water: crop.water ?? '',
    waterFrequencyDays: crop.waterFrequencyDays,
    waterAmountMl: crop.waterAmountMl,

    companionPlants: crop.companionPlants ?? [],
    antagonistPlants: crop.antagonistPlants ?? [],
    rotationFamily: crop.rotationFamily ?? '',
    rotationYears: crop.rotationYears,

    harvestMaturitySigns: crop.harvestMaturitySigns ?? '',
    harvestMethod: crop.harvestMethod ?? '',
    harvestCadence: crop.harvestCadence ?? '',
    yieldPerPlant: crop.yieldPerPlant ?? '',
    storageNotes: crop.storageNotes ?? '',
    shelfLifeDays: crop.shelfLifeDays,

    howToPlant: crop.growingGuide?.howToPlant ?? '',
    howToCare: crop.growingGuide?.howToCare ?? '',
    warnings: crop.growingGuide?.warnings ?? '',
    localNotes: crop.growingGuide?.localNotes ?? '',

    typhoonResistance: crop.typhoonResistance ?? '',
    typhoonPrep: crop.typhoonPrep ?? '',
  }))

  const set = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  async function handleSave() {
    if (!form.name?.trim()) {
      toast.error('作物名稱不可為空')
      return
    }

    setSaving(true)
    try {
      // Build only changed fields
      const updates: CropData = {}

      // Simple string/number fields
      const stringFields = [
        'name', 'variety', 'category', 'lifecycleType', 'propagationMethod',
        'imageUrl', 'thumbnailUrl', 'imageSourceUrl', 'imageAuthor', 'imageLicense',
        'sunlight', 'windSensitivity', 'droughtTolerance', 'waterloggingTolerance',
        'soilType', 'organicMatterPreference', 'fertilityDemand', 'fertilizerType',
        'water', 'rotationFamily',
        'harvestMaturitySigns', 'harvestMethod', 'harvestCadence', 'yieldPerPlant',
        'storageNotes', 'typhoonResistance', 'typhoonPrep',
      ]

      for (const key of stringFields) {
        const newVal = form[key] || undefined
        const oldVal = crop[key] || undefined
        if (newVal !== oldVal) {
          updates[key] = newVal
        }
      }

      // Number fields
      const numberFields = [
        'growthDays', 'daysToGermination', 'daysToTransplant', 'daysToFlowering',
        'harvestWindowDays', 'tempMin', 'tempMax', 'tempOptimalMin', 'tempOptimalMax',
        'humidityMin', 'humidityMax', 'sunlightHoursMin', 'sunlightHoursMax',
        'soilPhMin', 'soilPhMax', 'fertilizerFrequencyDays',
        'spacingPlantCm', 'spacingRowCm', 'maxHeightCm', 'maxSpreadCm',
        'pruningFrequencyDays', 'waterFrequencyDays', 'waterAmountMl',
        'rotationYears', 'shelfLifeDays',
      ]

      for (const key of numberFields) {
        if (form[key] !== crop[key]) {
          updates[key] = form[key]
        }
      }

      // Boolean fields
      if (form.trellisRequired !== (crop.trellisRequired ?? false)) {
        updates.trellisRequired = form.trellisRequired
      }
      if (form.pruningRequired !== (crop.pruningRequired ?? false)) {
        updates.pruningRequired = form.pruningRequired
      }

      // Array fields
      const arrayFields = [
        'aliases', 'plantingMonths', 'harvestMonths', 'pruningMonths',
        'companionPlants', 'antagonistPlants',
      ]
      for (const key of arrayFields) {
        const newArr = form[key] ?? []
        const oldArr = crop[key] ?? []
        if (JSON.stringify(newArr) !== JSON.stringify(oldArr)) {
          updates[key] = newArr
        }
      }

      // Growing guide — nest back into object
      const guideFields = ['howToPlant', 'howToCare', 'warnings', 'localNotes'] as const
      const oldGuide = crop.growingGuide ?? {}
      const newGuide: Record<string, string | undefined> = {}
      let guideChanged = false
      for (const gk of guideFields) {
        const newVal = form[gk] || undefined
        const oldVal = oldGuide[gk] || undefined
        newGuide[gk] = newVal
        if (newVal !== oldVal) guideChanged = true
      }
      if (guideChanged) {
        updates.growingGuide = newGuide
      }

      if (Object.keys(updates).length === 0) {
        toast.info('沒有變更')
        onSaved()
        return
      }

      await updateCrop({
        cropId: crop._id as Id<'crops'>,
        ...updates,
      })

      toast.success('作物資料已更新')
      onSaved()
    } catch (err) {
      toast.error('儲存失敗：' + (err instanceof Error ? err.message : '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticky save/cancel bar */}
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 rounded-lg border bg-card/95 backdrop-blur px-4 py-2">
        <span className="text-sm text-muted-foreground mr-auto">編輯模式</span>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          取消
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-3.5 animate-spin mr-1" />}
          儲存
        </Button>
      </div>

      {/* === IDENTITY === */}
      <EditSection icon={<Sprout className="size-3.5" />} title="基本資料" defaultOpen>
        <div className="space-y-2.5">
          <FieldRow label="名稱">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="h-8 text-sm" />
          </FieldRow>
          <FieldRow label="品種">
            <Input value={form.variety} onChange={(e) => set('variety', e.target.value)} className="h-8 text-xs" />
          </FieldRow>
          <FieldRow label="別名">
            <TagEditor value={form.aliases} onChange={(v) => set('aliases', v)} placeholder="輸入別名後按 Enter" />
          </FieldRow>
          <FieldRow label="圖片網址">
            <Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} className="h-8 text-xs" placeholder="https://..." />
          </FieldRow>
          <FieldRow label="縮圖網址">
            <Input value={form.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} className="h-8 text-xs" placeholder="https://..." />
          </FieldRow>
          <FieldRow label="來源頁面">
            <Input value={form.imageSourceUrl} onChange={(e) => set('imageSourceUrl', e.target.value)} className="h-8 text-xs" placeholder="https://commons.wikimedia.org/..." />
          </FieldRow>
          <FieldRow label="圖片作者">
            <Input value={form.imageAuthor} onChange={(e) => set('imageAuthor', e.target.value)} className="h-8 text-xs" />
          </FieldRow>
          <FieldRow label="授權">
            <Input value={form.imageLicense} onChange={(e) => set('imageLicense', e.target.value)} className="h-8 text-xs" placeholder="CC BY-SA 4.0" />
          </FieldRow>
          <FieldRow label="分類">
            <SelectField
              value={form.category}
              onChange={(v) => set('category', v)}
              options={CROP_CATEGORY_LABELS}
            />
          </FieldRow>
          <FieldRow label="生命週期">
            <SelectField
              value={form.lifecycleType}
              onChange={(v) => set('lifecycleType', v)}
              options={LIFECYCLE_LABELS}
            />
          </FieldRow>
          <FieldRow label="繁殖方式">
            <SelectField
              value={form.propagationMethod}
              onChange={(v) => set('propagationMethod', v)}
              options={PROPAGATION_LABELS}
            />
          </FieldRow>
        </div>
      </EditSection>

      {/* === TIMING === */}
      <EditSection icon={<Timer className="size-3.5" />} title="種植時程">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">播種月份</Label>
            <MonthPicker value={form.plantingMonths} onChange={(v) => set('plantingMonths', v)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">收成月份</Label>
            <MonthPicker value={form.harvestMonths} onChange={(v) => set('harvestMonths', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="生長天數">
              <NumberField value={form.growthDays} onChange={(v) => set('growthDays', v)} placeholder="天" />
            </FieldRow>
            <FieldRow label="發芽天數">
              <NumberField value={form.daysToGermination} onChange={(v) => set('daysToGermination', v)} placeholder="天" />
            </FieldRow>
            <FieldRow label="移植天數">
              <NumberField value={form.daysToTransplant} onChange={(v) => set('daysToTransplant', v)} placeholder="天" />
            </FieldRow>
            <FieldRow label="開花天數">
              <NumberField value={form.daysToFlowering} onChange={(v) => set('daysToFlowering', v)} placeholder="天" />
            </FieldRow>
            <FieldRow label="採收期天數">
              <NumberField value={form.harvestWindowDays} onChange={(v) => set('harvestWindowDays', v)} placeholder="天" />
            </FieldRow>
          </div>
        </div>
      </EditSection>

      {/* === ENVIRONMENT === */}
      <EditSection icon={<Thermometer className="size-3.5" />} title="環境需求">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="最低溫">
              <NumberField value={form.tempMin} onChange={(v) => set('tempMin', v)} placeholder="°C" />
            </FieldRow>
            <FieldRow label="最高溫">
              <NumberField value={form.tempMax} onChange={(v) => set('tempMax', v)} placeholder="°C" />
            </FieldRow>
            <FieldRow label="最適低溫">
              <NumberField value={form.tempOptimalMin} onChange={(v) => set('tempOptimalMin', v)} placeholder="°C" />
            </FieldRow>
            <FieldRow label="最適高溫">
              <NumberField value={form.tempOptimalMax} onChange={(v) => set('tempOptimalMax', v)} placeholder="°C" />
            </FieldRow>
            <FieldRow label="濕度下限">
              <NumberField value={form.humidityMin} onChange={(v) => set('humidityMin', v)} placeholder="%" />
            </FieldRow>
            <FieldRow label="濕度上限">
              <NumberField value={form.humidityMax} onChange={(v) => set('humidityMax', v)} placeholder="%" />
            </FieldRow>
          </div>
          <FieldRow label="日照類型">
            <SelectField
              value={form.sunlight}
              onChange={(v) => set('sunlight', v)}
              options={SUNLIGHT_TYPE_LABELS}
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="日照下限">
              <NumberField value={form.sunlightHoursMin} onChange={(v) => set('sunlightHoursMin', v)} placeholder="小時/天" />
            </FieldRow>
            <FieldRow label="日照上限">
              <NumberField value={form.sunlightHoursMax} onChange={(v) => set('sunlightHoursMax', v)} placeholder="小時/天" />
            </FieldRow>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Wind className="size-2.5" /> 風敏感度
              </Label>
              <SelectField value={form.windSensitivity} onChange={(v) => set('windSensitivity', v)} options={LEVEL_LABELS} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Sun className="size-2.5" /> 耐旱力
              </Label>
              <SelectField value={form.droughtTolerance} onChange={(v) => set('droughtTolerance', v)} options={LEVEL_LABELS} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Droplets className="size-2.5" /> 耐澇力
              </Label>
              <SelectField value={form.waterloggingTolerance} onChange={(v) => set('waterloggingTolerance', v)} options={LEVEL_LABELS} />
            </div>
          </div>
        </div>
      </EditSection>

      {/* === SOIL === */}
      <EditSection icon={<FlaskConical className="size-3.5" />} title="土壤與施肥">
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="pH 下限">
              <NumberField value={form.soilPhMin} onChange={(v) => set('soilPhMin', v)} placeholder="pH" step="0.1" />
            </FieldRow>
            <FieldRow label="pH 上限">
              <NumberField value={form.soilPhMax} onChange={(v) => set('soilPhMax', v)} placeholder="pH" step="0.1" />
            </FieldRow>
          </div>
          <FieldRow label="土壤類型">
            <SelectField value={form.soilType} onChange={(v) => set('soilType', v)} options={SOIL_TYPE_LABELS} />
          </FieldRow>
          <FieldRow label="有機質偏好">
            <SelectField value={form.organicMatterPreference} onChange={(v) => set('organicMatterPreference', v)} options={LEVEL_LABELS} />
          </FieldRow>
          <FieldRow label="肥力需求">
            <SelectField value={form.fertilityDemand} onChange={(v) => set('fertilityDemand', v)} options={FERTILITY_LABELS} />
          </FieldRow>
          <FieldRow label="肥料類型">
            <Input value={form.fertilizerType} onChange={(e) => set('fertilizerType', e.target.value)} className="h-8 text-xs" placeholder="例：有機堆肥" />
          </FieldRow>
          <FieldRow label="施肥頻率">
            <NumberField value={form.fertilizerFrequencyDays} onChange={(v) => set('fertilizerFrequencyDays', v)} placeholder="天" />
          </FieldRow>
        </div>
      </EditSection>

      {/* === SPACING === */}
      <EditSection icon={<Ruler className="size-3.5" />} title="間距與結構">
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="株距">
              <NumberField value={form.spacingPlantCm} onChange={(v) => set('spacingPlantCm', v)} placeholder="cm" />
            </FieldRow>
            <FieldRow label="行距">
              <NumberField value={form.spacingRowCm} onChange={(v) => set('spacingRowCm', v)} placeholder="cm" />
            </FieldRow>
            <FieldRow label="最大高度">
              <NumberField value={form.maxHeightCm} onChange={(v) => set('maxHeightCm', v)} placeholder="cm" />
            </FieldRow>
            <FieldRow label="最大展幅">
              <NumberField value={form.maxSpreadCm} onChange={(v) => set('maxSpreadCm', v)} placeholder="cm" />
            </FieldRow>
          </div>
          <div className="flex items-center gap-6 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={form.trellisRequired} onCheckedChange={(v) => set('trellisRequired', v)} />
              <Label className="text-xs">需搭架</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.pruningRequired} onCheckedChange={(v) => set('pruningRequired', v)} />
              <Label className="text-xs">需修剪</Label>
            </div>
          </div>
          {form.pruningRequired && (
            <>
              <FieldRow label="修剪頻率">
                <NumberField value={form.pruningFrequencyDays} onChange={(v) => set('pruningFrequencyDays', v)} placeholder="天" />
              </FieldRow>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">修剪月份</Label>
                <MonthPicker value={form.pruningMonths} onChange={(v) => set('pruningMonths', v)} />
              </div>
            </>
          )}
        </div>
      </EditSection>

      {/* === WATER === */}
      <EditSection icon={<Droplets className="size-3.5" />} title="水分管理">
        <div className="space-y-2.5">
          <FieldRow label="需水量">
            <SelectField value={form.water} onChange={(v) => set('water', v)} options={WATER_LEVEL_LABELS} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="澆水頻率">
              <NumberField value={form.waterFrequencyDays} onChange={(v) => set('waterFrequencyDays', v)} placeholder="天" />
            </FieldRow>
            <FieldRow label="每次水量">
              <NumberField value={form.waterAmountMl} onChange={(v) => set('waterAmountMl', v)} placeholder="ml" />
            </FieldRow>
          </div>
        </div>
      </EditSection>

      {/* === COMPANION === */}
      <EditSection icon={<Leaf className="size-3.5" />} title="共植與輪作">
        <div className="space-y-2.5">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">良伴植物</Label>
            <TagEditor value={form.companionPlants} onChange={(v) => set('companionPlants', v)} placeholder="輸入植物名稱" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">忌避植物</Label>
            <TagEditor value={form.antagonistPlants} onChange={(v) => set('antagonistPlants', v)} placeholder="輸入植物名稱" />
          </div>
          <FieldRow label="輪作科別">
            <SelectField value={form.rotationFamily} onChange={(v) => set('rotationFamily', v)} options={ROTATION_FAMILY_LABELS} />
          </FieldRow>
          <FieldRow label="輪作年限">
            <NumberField value={form.rotationYears} onChange={(v) => set('rotationYears', v)} placeholder="年" />
          </FieldRow>
        </div>
      </EditSection>

      {/* === HARVEST === */}
      <EditSection icon={<Scissors className="size-3.5" />} title="採收與保存">
        <div className="space-y-2.5">
          <FieldRow label="採收方式">
            <SelectField value={form.harvestMethod} onChange={(v) => set('harvestMethod', v)} options={HARVEST_METHOD_LABELS} />
          </FieldRow>
          <FieldRow label="採收頻率">
            <SelectField value={form.harvestCadence} onChange={(v) => set('harvestCadence', v)} options={HARVEST_CADENCE_LABELS} />
          </FieldRow>
          <FieldRow label="單株產量">
            <Input value={form.yieldPerPlant} onChange={(e) => set('yieldPerPlant', e.target.value)} className="h-8 text-xs" placeholder="例：500g" />
          </FieldRow>
          <FieldRow label="保鮮天數">
            <NumberField value={form.shelfLifeDays} onChange={(v) => set('shelfLifeDays', v)} placeholder="天" />
          </FieldRow>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">成熟辨識</Label>
            <Textarea
              value={form.harvestMaturitySigns}
              onChange={(e) => set('harvestMaturitySigns', e.target.value)}
              className="text-xs min-h-[60px]"
              placeholder="描述如何判斷作物已成熟"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">保存方式</Label>
            <Textarea
              value={form.storageNotes}
              onChange={(e) => set('storageNotes', e.target.value)}
              className="text-xs min-h-[60px]"
              placeholder="描述保存方式與注意事項"
            />
          </div>
        </div>
      </EditSection>

      {/* === GROWING GUIDE === */}
      <EditSection icon={<Sprout className="size-3.5" />} title="種植指南">
        <div className="space-y-3">
          {[
            { key: 'howToPlant', title: '種植方法', icon: <Sprout className="size-3 text-green-600" />, ph: '描述種植步驟' },
            { key: 'howToCare', title: '日常照護', icon: <Droplets className="size-3 text-blue-500" />, ph: '描述照護方式' },
            { key: 'warnings', title: '注意事項', icon: <ShieldAlert className="size-3 text-amber-500" />, ph: '需要注意的事項' },
            { key: 'localNotes', title: '花蓮在地建議', icon: <TreePine className="size-3 text-emerald-600" />, ph: '針對花蓮地區的在地建議' },
          ].map(({ key, title, icon, ph }) => (
            <div key={key}>
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                {icon} {title}
              </Label>
              <Textarea
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="text-xs min-h-[80px]"
                placeholder={ph}
              />
            </div>
          ))}
        </div>
      </EditSection>

      {/* === TYPHOON === */}
      <EditSection icon={<Wind className="size-3.5" />} title="颱風應對">
        <div className="space-y-2.5">
          <FieldRow label="耐風力">
            <SelectField value={form.typhoonResistance} onChange={(v) => set('typhoonResistance', v)} options={RESISTANCE_LEVEL_LABELS} />
          </FieldRow>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">防颱準備</Label>
            <Textarea
              value={form.typhoonPrep}
              onChange={(e) => set('typhoonPrep', e.target.value)}
              className="text-xs min-h-[60px]"
              placeholder="描述防颱措施"
            />
          </div>
        </div>
      </EditSection>

      {/* Bottom save/cancel */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          取消
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-3.5 animate-spin mr-1" />}
          儲存
        </Button>
      </div>
    </div>
  )
}

// === Collapsible edit section ===

function EditSection({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className="rounded-xl border bg-card p-4">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group/section">
          <div className="text-muted-foreground">{icon}</div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
          <ChevronDown className="size-3.5 text-muted-foreground ml-auto transition-transform group-data-[state=closed]/section:rotate-[-90deg]" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator className="my-3" />
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
