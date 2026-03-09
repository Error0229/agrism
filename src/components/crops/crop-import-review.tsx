'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApproveImport, useRejectImport } from '@/hooks/use-crop-import'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Bug,
  Check,
  Droplets,
  FlaskConical,
  Leaf,
  Loader2,
  Move,
  Pencil,
  Ruler,
  Scissors,
  Sprout,
  Sun,
  Thermometer,
  Timer,
  TreePine,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CropCategory } from '@/lib/types/enums'
import { CROP_CATEGORY_LABELS } from '@/lib/types/labels'
import type { Id } from '../../../convex/_generated/dataModel'
import type { Crop } from '@/lib/types/domain'
import { CropAvatar } from '@/components/crops/crop-avatar'
import { CropImageAttribution } from '@/components/crops/crop-image-attribution'
import { resolveCropMedia } from '@/lib/crops/media'

// ========== Label maps ==========

const LIFECYCLE_LABELS: Record<string, string> = {
  annual: '一年生',
  biennial: '二年生',
  perennial: '多年生',
  orchard: '果園作物',
}

const SUNLIGHT_TYPE_LABELS: Record<string, string> = {
  full_sun: '全日照',
  partial_shade: '半日照',
  shade: '耐陰',
  shade_tolerant: '耐陰',
}

const SOIL_TYPE_LABELS: Record<string, string> = {
  sandy: '砂質土',
  loamy: '壤土',
  clay: '黏土',
  'well-drained': '排水良好',
}

const HARVEST_METHOD_LABELS: Record<string, string> = {
  cut: '剪採',
  pull: '拔取',
  pick: '摘取',
  dig: '挖掘',
}

const LEVEL_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

const WATER_LABELS: Record<string, string> = {
  low: '少量',
  moderate: '適量',
  high: '大量',
  minimal: '少量',
  abundant: '大量',
}

const MONTH_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

// ========== Types ==========

type FieldMeta = Record<string, {
  confidence?: 'high' | 'medium' | 'low'
  origin?: 'imported' | 'user' | 'seeded' | 'ai_enriched'
  lastVerified?: number
}>

type CropWithMeta = Crop & {
  importStatus?: 'pending_review' | 'approved'
  fieldMeta?: FieldMeta
}

// ========== Confidence Badge ==========

function ConfidenceBadge({ confidence }: { confidence?: 'high' | 'medium' | 'low' }) {
  if (!confidence) return null

  const config = {
    high: { label: '高', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
    medium: { label: '中', className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
    low: { label: '低', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  }

  const c = config[confidence]
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-medium', c.className)}>
      {c.label}
    </Badge>
  )
}

// ========== Field Row ==========

interface ReviewFieldProps {
  fieldKey: string
  label: string
  value: string | undefined | null
  confidence?: 'high' | 'medium' | 'low'
  required?: boolean
  editType?: 'text' | 'textarea' | 'select' | 'months' | 'number'
  selectOptions?: Record<string, string>
  onEdit: (key: string, value: string | number | number[]) => void
}

function ReviewField({
  fieldKey,
  label,
  value,
  confidence,
  required,
  editType = 'text',
  selectOptions,
  onEdit,
}: ReviewFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value ?? '')

  const isEmpty = value === undefined || value === null || value === ''
  const isMissing = required && isEmpty

  function handleSave() {
    if (editType === 'number') {
      const num = parseFloat(editValue)
      if (!isNaN(num)) {
        onEdit(fieldKey, num)
      }
    } else {
      onEdit(fieldKey, editValue)
    }
    setIsEditing(false)
  }

  function handleCancel() {
    setEditValue(value ?? '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={cn(
        'flex flex-col gap-2 rounded-lg border p-3',
        isMissing ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : 'border-border'
      )}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancel}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={handleSave}>
              <Check className="size-3.5" />
            </Button>
          </div>
        </div>
        {editType === 'select' && selectOptions ? (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(selectOptions).map(([val, lbl]) => (
                <SelectItem key={val} value={val}>{lbl}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : editType === 'textarea' ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="text-sm min-h-[60px]"
            autoFocus
          />
        ) : (
          <Input
            type={editType === 'number' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted/30',
        isMissing
          ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
          : 'border-transparent'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground shrink-0 w-24">{label}</span>
        {isEmpty ? (
          <span className="text-sm text-muted-foreground/50 italic">未填寫</span>
        ) : (
          <span className="text-sm font-medium truncate">{value}</span>
        )}
        {isMissing && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 shrink-0">
            必填
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ConfidenceBadge confidence={confidence} />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {
            setEditValue(value ?? '')
            setIsEditing(true)
          }}
        >
          <Pencil className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ========== Month Selector Field ==========

interface MonthFieldProps {
  fieldKey: string
  label: string
  months: number[] | undefined
  confidence?: 'high' | 'medium' | 'low'
  required?: boolean
  onEdit: (key: string, value: number[]) => void
}

function MonthField({ fieldKey, label, months, confidence, required, onEdit }: MonthFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editMonths, setEditMonths] = useState<number[]>(months ?? [])

  const isEmpty = !months || months.length === 0
  const isMissing = required && isEmpty

  function toggleMonth(m: number) {
    setEditMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b)
    )
  }

  function handleSave() {
    onEdit(fieldKey, editMonths)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={cn(
        'flex flex-col gap-2 rounded-lg border p-3',
        isMissing ? 'border-red-300 bg-red-50/50' : 'border-border'
      )}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditMonths(months ?? []); setIsEditing(false) }}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={handleSave}>
              <Check className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMonth(m)}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                editMonths.includes(m)
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {m}月
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted/30',
        isMissing ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : 'border-transparent'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground shrink-0 w-24">{label}</span>
        {isEmpty ? (
          <span className="text-sm text-muted-foreground/50 italic">未填寫</span>
        ) : (
          <span className="text-sm font-medium">
            {months!.map(m => `${MONTH_NAMES[m - 1]}月`).join('、')}
          </span>
        )}
        {isMissing && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 shrink-0">
            必填
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ConfidenceBadge confidence={confidence} />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { setEditMonths(months ?? []); setIsEditing(true) }}
        >
          <Pencil className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ========== Array Field (string array display) ==========

interface ArrayFieldProps {
  fieldKey: string
  label: string
  items: string[] | undefined
  confidence?: 'high' | 'medium' | 'low'
  onEdit: (key: string, value: string[]) => void
}

function ArrayField({ fieldKey, label, items, confidence, onEdit }: ArrayFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState((items ?? []).join('、'))

  const isEmpty = !items || items.length === 0

  function handleSave() {
    const parsed = editValue
      .split(/[,、，\n]/)
      .map(s => s.trim())
      .filter(Boolean)
    onEdit(fieldKey, parsed)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditValue((items ?? []).join('、')); setIsEditing(false) }}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={handleSave}>
              <Check className="size-3.5" />
            </Button>
          </div>
        </div>
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="用逗號或頓號分隔"
          className="text-sm min-h-[40px]"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className="group flex items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground shrink-0 w-24">{label}</span>
        {isEmpty ? (
          <span className="text-sm text-muted-foreground/50 italic">未填寫</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {items!.map(item => (
              <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ConfidenceBadge confidence={confidence} />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { setEditValue((items ?? []).join('、')); setIsEditing(true) }}
        >
          <Pencil className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ========== Section Header ==========

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="text-muted-foreground">{icon}</div>
      <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{title}</h3>
    </div>
  )
}

// ========== Pest/Disease Table Display ==========

interface PestDiseaseItem {
  name: string
  symptoms: string
  organicTreatment: string
  triggerConditions?: string
}

function PestDiseaseField({
  fieldKey,
  label,
  items,
  confidence,
}: {
  fieldKey: string
  label: string
  items: PestDiseaseItem[] | undefined
  confidence?: 'high' | 'medium' | 'low'
}) {
  const isEmpty = !items || items.length === 0

  return (
    <div className="rounded-lg border border-transparent px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <ConfidenceBadge confidence={confidence} />
      </div>
      {isEmpty ? (
        <span className="text-sm text-muted-foreground/50 italic">未填寫</span>
      ) : (
        <div className="space-y-2">
          {items!.map((item, idx) => (
            <div key={idx} className="rounded-md bg-muted/30 p-2 text-xs space-y-0.5">
              <div className="font-medium">{item.name}</div>
              <div className="text-muted-foreground">症狀：{item.symptoms}</div>
              <div className="text-muted-foreground">防治：{item.organicTreatment}</div>
              {item.triggerConditions && (
                <div className="text-muted-foreground">觸發：{item.triggerConditions}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== Main Component ==========

interface CropImportReviewProps {
  crop: CropWithMeta
}

export function CropImportReview({ crop }: CropImportReviewProps) {
  const router = useRouter()
  const approveImport = useApproveImport()
  const rejectImport = useRejectImport()
  const [overrides, setOverrides] = useState<Record<string, unknown>>({})
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const media = resolveCropMedia(crop)

  const fieldMeta: FieldMeta = crop.fieldMeta ?? {}

  function getConfidence(key: string): 'high' | 'medium' | 'low' | undefined {
    return fieldMeta[key]?.confidence
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getDisplayValue(key: string): any {
    if (key in overrides) return overrides[key]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (crop as any)[key]
  }

  const handleFieldEdit = useCallback((key: string, value: string | number | number[] | string[]) => {
    setOverrides(prev => ({ ...prev, [key]: value }))
  }, [])

  // Format display value with label maps
  function formatValue(key: string, labelMap?: Record<string, string>): string | undefined {
    const val = getDisplayValue(key)
    if (val === undefined || val === null || val === '') return undefined
    if (labelMap && typeof val === 'string') return labelMap[val] ?? val
    if (typeof val === 'number') return String(val)
    return String(val)
  }

  // Check required fields
  const requiredFields = useMemo(() => {
    const name = getDisplayValue('name')
    const category = getDisplayValue('category')
    const lifecycleType = getDisplayValue('lifecycleType')
    const plantingMonths = getDisplayValue('plantingMonths')
    const harvestMonths = getDisplayValue('harvestMonths')
    const waterNeeds = getDisplayValue('water')
    const sunlight = getDisplayValue('sunlight')

    const hasName = !!name
    const hasCategory = !!category
    const hasLifecycle = !!lifecycleType
    const hasTiming = (plantingMonths && plantingMonths.length > 0) || (harvestMonths && harvestMonths.length > 0)
    const hasEnvironment = !!waterNeeds || !!sunlight

    return {
      name: hasName,
      category: hasCategory,
      lifecycleType: hasLifecycle,
      timing: hasTiming,
      environment: hasEnvironment,
      allMet: hasName && hasCategory && hasLifecycle && hasTiming && hasEnvironment,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop, overrides])

  const filledRequired = [
    requiredFields.name,
    requiredFields.category,
    requiredFields.lifecycleType,
    requiredFields.timing,
    requiredFields.environment,
  ].filter(Boolean).length
  const totalRequired = 5

  async function handleApprove() {
    if (!requiredFields.allMet) return
    setIsApproving(true)
    try {
      await approveImport({
        cropId: crop._id,
        ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
      })
      toast.success('作物已成功匯入')
      router.push(`/crops/${crop._id}`)
    } catch {
      toast.error('匯入失敗，請稍後再試')
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    setIsRejecting(true)
    try {
      await rejectImport({ cropId: crop._id })
      toast.success('已取消匯入')
      router.push('/crops')
    } catch {
      toast.error('取消匯入失敗')
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Navigation */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push('/crops')}
      >
        <ArrowLeft className="size-3.5" />
        作物列表
      </Button>

      {/* ===== HEADER ===== */}
      <div className="rounded-2xl border bg-gradient-to-br from-violet-50 via-card to-card p-5 dark:from-violet-950/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <CropAvatar
              name={crop.name}
              emoji={media.emoji}
              imageUrl={media.imageUrl}
              thumbnailUrl={media.thumbnailUrl}
              size="xl"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{crop.name}</h1>
                <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                  匯入審核
                </Badge>
              </div>
              {crop.scientificName && (
                <p className="text-sm italic text-muted-foreground mt-0.5">{crop.scientificName}</p>
              )}
              {crop.variety && (
                <p className="text-xs text-muted-foreground">品種：{crop.variety}</p>
              )}
              <div className="mt-2">
                <CropImageAttribution
                  sourceUrl={media.imageSourceUrl}
                  author={media.imageAuthor}
                  license={media.imageLicense}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">必填欄位完成度</span>
            <span className={cn(
              'text-xs font-semibold',
              requiredFields.allMet ? 'text-green-600' : 'text-amber-600'
            )}>
              {filledRequired}/{totalRequired}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                requiredFields.allMet ? 'bg-green-500' : 'bg-amber-500'
              )}
              style={{ width: `${(filledRequired / totalRequired) * 100}%` }}
            />
          </div>
          {!requiredFields.allMet && (
            <p className="text-xs text-amber-600 mt-1.5">
              請補充缺少的必填欄位後才能確認匯入
            </p>
          )}
        </div>
      </div>

      {/* ===== SECTION: Basic Identity ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<Sprout className="size-3.5" />} title="基本資料" />
        <div className="space-y-0.5">
          <ReviewField
            fieldKey="name"
            label="作物名稱"
            value={formatValue('name')}
            confidence={getConfidence('name')}
            required
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="scientificName"
            label="學名"
            value={formatValue('scientificName')}
            confidence={getConfidence('scientificName')}
            onEdit={handleFieldEdit}
          />
          <ArrayField
            fieldKey="aliases"
            label="別名"
            items={getDisplayValue('aliases')}
            confidence={getConfidence('aliases')}
            onEdit={(k, v) => handleFieldEdit(k, v)}
          />
          <ReviewField
            fieldKey="category"
            label="分類"
            value={formatValue('category', CROP_CATEGORY_LABELS)}
            confidence={getConfidence('category')}
            required
            editType="select"
            selectOptions={CROP_CATEGORY_LABELS}
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="lifecycleType"
            label="生長型態"
            value={formatValue('lifecycleType', LIFECYCLE_LABELS)}
            confidence={getConfidence('lifecycleType')}
            required
            editType="select"
            selectOptions={LIFECYCLE_LABELS}
            onEdit={handleFieldEdit}
          />
        </div>
      </div>

      {/* ===== SECTION: Timing ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<Timer className="size-3.5" />} title="種植時間" />
        <div className="space-y-0.5">
          <MonthField
            fieldKey="plantingMonths"
            label="播種月份"
            months={getDisplayValue('plantingMonths')}
            confidence={getConfidence('plantingMonths')}
            required={!getDisplayValue('harvestMonths')?.length}
            onEdit={(k, v) => handleFieldEdit(k, v)}
          />
          <MonthField
            fieldKey="harvestMonths"
            label="收成月份"
            months={getDisplayValue('harvestMonths')}
            confidence={getConfidence('harvestMonths')}
            required={!getDisplayValue('plantingMonths')?.length}
            onEdit={(k, v) => handleFieldEdit(k, v)}
          />
          <ReviewField
            fieldKey="growthDays"
            label="生長天數"
            value={getDisplayValue('growthDays') != null ? `${getDisplayValue('growthDays')}` : undefined}
            confidence={getConfidence('growthDays')}
            editType="number"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="daysToGermination"
            label="發芽天數"
            value={getDisplayValue('daysToGermination') != null ? `${getDisplayValue('daysToGermination')}` : undefined}
            confidence={getConfidence('daysToGermination')}
            editType="number"
            onEdit={handleFieldEdit}
          />
        </div>
      </div>

      {/* ===== SECTION: Environment ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<Thermometer className="size-3.5" />} title="環境需求" />
        <div className="space-y-0.5">
          <ReviewField
            fieldKey="tempMin"
            label="最低溫度"
            value={getDisplayValue('tempMin') != null ? `${getDisplayValue('tempMin')}°C` : undefined}
            confidence={getConfidence('tempMin')}
            editType="number"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="tempMax"
            label="最高溫度"
            value={getDisplayValue('tempMax') != null ? `${getDisplayValue('tempMax')}°C` : undefined}
            confidence={getConfidence('tempMax')}
            editType="number"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="sunlight"
            label="日照需求"
            value={formatValue('sunlight', SUNLIGHT_TYPE_LABELS)}
            confidence={getConfidence('sunlight')}
            required={!getDisplayValue('water')}
            editType="select"
            selectOptions={SUNLIGHT_TYPE_LABELS}
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="water"
            label="需水量"
            value={formatValue('water', WATER_LABELS)}
            confidence={getConfidence('water')}
            required={!getDisplayValue('sunlight')}
            editType="select"
            selectOptions={WATER_LABELS}
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="windSensitivity"
            label="風敏感度"
            value={formatValue('windSensitivity', LEVEL_LABELS)}
            confidence={getConfidence('windSensitivity')}
            editType="select"
            selectOptions={LEVEL_LABELS}
            onEdit={handleFieldEdit}
          />
        </div>
      </div>

      {/* ===== SECTION: Soil ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<FlaskConical className="size-3.5" />} title="土壤" />
        <div className="space-y-0.5">
          <ReviewField
            fieldKey="soilPhMin"
            label="土壤 pH 最低"
            value={getDisplayValue('soilPhMin') != null ? `${getDisplayValue('soilPhMin')}` : undefined}
            confidence={getConfidence('soilPhMin')}
            editType="number"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="soilPhMax"
            label="土壤 pH 最高"
            value={getDisplayValue('soilPhMax') != null ? `${getDisplayValue('soilPhMax')}` : undefined}
            confidence={getConfidence('soilPhMax')}
            editType="number"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="soilType"
            label="土壤類型"
            value={formatValue('soilType', SOIL_TYPE_LABELS)}
            confidence={getConfidence('soilType')}
            editType="select"
            selectOptions={SOIL_TYPE_LABELS}
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="fertilizerType"
            label="肥料類型"
            value={formatValue('fertilizerType')}
            confidence={getConfidence('fertilizerType')}
            onEdit={handleFieldEdit}
          />
        </div>
      </div>

      {/* ===== SECTION: Spacing ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<Ruler className="size-3.5" />} title="間距" />
        <div className="space-y-0.5">
          <ReviewField
            fieldKey="spacingPlantCm"
            label="株距 (cm)"
            value={getDisplayValue('spacingPlantCm') != null ? `${getDisplayValue('spacingPlantCm')}` : undefined}
            confidence={getConfidence('spacingPlantCm')}
            editType="number"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="spacingRowCm"
            label="行距 (cm)"
            value={getDisplayValue('spacingRowCm') != null ? `${getDisplayValue('spacingRowCm')}` : undefined}
            confidence={getConfidence('spacingRowCm')}
            editType="number"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="maxHeightCm"
            label="最大高度 (cm)"
            value={getDisplayValue('maxHeightCm') != null ? `${getDisplayValue('maxHeightCm')}` : undefined}
            confidence={getConfidence('maxHeightCm')}
            editType="number"
            onEdit={handleFieldEdit}
          />
        </div>
      </div>

      {/* ===== SECTION: Pest & Disease ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<Bug className="size-3.5" />} title="病蟲害" />
        <div className="space-y-0.5">
          <PestDiseaseField
            fieldKey="commonPests"
            label="常見害蟲"
            items={getDisplayValue('commonPests')}
            confidence={getConfidence('commonPests')}
          />
          <PestDiseaseField
            fieldKey="commonDiseases"
            label="常見病害"
            items={getDisplayValue('commonDiseases')}
            confidence={getConfidence('commonDiseases')}
          />
        </div>
      </div>

      {/* ===== SECTION: Harvest ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<Scissors className="size-3.5" />} title="收穫" />
        <div className="space-y-0.5">
          <ReviewField
            fieldKey="harvestMaturitySigns"
            label="成熟辨識"
            value={formatValue('harvestMaturitySigns')}
            confidence={getConfidence('harvestMaturitySigns')}
            editType="textarea"
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="harvestMethod"
            label="採收方式"
            value={formatValue('harvestMethod', HARVEST_METHOD_LABELS)}
            confidence={getConfidence('harvestMethod')}
            editType="select"
            selectOptions={HARVEST_METHOD_LABELS}
            onEdit={handleFieldEdit}
          />
          <ReviewField
            fieldKey="yieldPerPlant"
            label="單株產量"
            value={formatValue('yieldPerPlant')}
            confidence={getConfidence('yieldPerPlant')}
            onEdit={handleFieldEdit}
          />
        </div>
      </div>

      {/* ===== SECTION: Companion ===== */}
      <div className="rounded-xl border bg-card p-4">
        <SectionHeader icon={<Leaf className="size-3.5" />} title="共伴植物" />
        <div className="space-y-0.5">
          <ArrayField
            fieldKey="companionPlants"
            label="良伴植物"
            items={getDisplayValue('companionPlants')}
            confidence={getConfidence('companionPlants')}
            onEdit={(k, v) => handleFieldEdit(k, v)}
          />
          <ArrayField
            fieldKey="antagonistPlants"
            label="忌避植物"
            items={getDisplayValue('antagonistPlants')}
            confidence={getConfidence('antagonistPlants')}
            onEdit={(k, v) => handleFieldEdit(k, v)}
          />
          <ReviewField
            fieldKey="rotationFamily"
            label="輪作科別"
            value={formatValue('rotationFamily')}
            confidence={getConfidence('rotationFamily')}
            onEdit={handleFieldEdit}
          />
        </div>
      </div>

      {/* ===== ACTION BUTTONS ===== */}
      <Separator />

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push('/crops')}
        >
          返回列表
        </Button>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <X className="size-4 mr-1.5" />
                )}
                放棄匯入
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確定要放棄此匯入？</AlertDialogTitle>
                <AlertDialogDescription>
                  所有資料將被刪除，此操作無法復原。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleReject}
                >
                  確定放棄
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            disabled={!requiredFields.allMet || isApproving}
            onClick={handleApprove}
          >
            {isApproving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {isApproving ? '匯入中...' : '確認匯入'}
          </Button>
        </div>
      </div>
    </div>
  )
}
