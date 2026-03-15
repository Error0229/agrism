'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus,
  Droplets,
  Sprout,
  Bug,
  Scissors,
  CloudRain,
  Leaf,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Id } from '../../../convex/_generated/dataModel'

// ---------------------------------------------------------------------------
// Task type config
// ---------------------------------------------------------------------------

const TASK_TYPES = [
  { value: 'watering', label: '澆水', icon: Droplets, keywords: ['澆', '灌'] },
  { value: 'fertilizing', label: '施肥', icon: Sprout, keywords: ['肥', '施'] },
  { value: 'pest_control', label: '病蟲害', icon: Bug, keywords: ['蟲', '病', '噴'] },
  { value: 'pruning', label: '剪枝', icon: Scissors, keywords: ['剪', '修'] },
  { value: 'harvesting', label: '收成', icon: Package, keywords: ['收', '採'] },
  { value: 'typhoon_prep', label: '防颱', icon: CloudRain, keywords: ['颱', '風', '防'] },
  { value: 'seeding', label: '播種', icon: Leaf, keywords: ['種', '播', '苗'] },
] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldOption {
  id: Id<'fields'>
  name: string
}

interface CropOption {
  id: Id<'crops'>
  name: string
  emoji?: string
}

interface QuickAddFABProps {
  farmId: Id<'farms'>
  fields: FieldOption[]
  crops: CropOption[]
  onCreate: (args: {
    farmId: Id<'farms'>
    type: string
    title: string
    fieldId?: Id<'fields'>
    cropId?: Id<'crops'>
    dueDate?: string
    source: 'manual'
    status: 'pending'
    priority: 'normal'
  }) => Promise<unknown>
  /** Whether the panel should be open (controlled from parent) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Keyword-based type auto-detection
// ---------------------------------------------------------------------------

function detectTaskType(title: string): string {
  for (const t of TASK_TYPES) {
    for (const kw of t.keywords) {
      if (title.includes(kw)) return t.value
    }
  }
  return 'watering' // default
}

// ---------------------------------------------------------------------------
// Shared form content (used by both Dialog and Sheet)
// ---------------------------------------------------------------------------

function QuickAddForm({
  title,
  setTitle,
  selectedType,
  setSelectedType,
  selectedFieldId,
  setSelectedFieldId,
  selectedCropId,
  setSelectedCropId,
  fields,
  crops,
  saving,
  onSave,
  autoTitle,
}: {
  title: string
  setTitle: (v: string) => void
  selectedType: string
  setSelectedType: (v: string) => void
  selectedFieldId: Id<'fields'> | undefined
  setSelectedFieldId: (v: Id<'fields'> | undefined) => void
  selectedCropId: Id<'crops'> | undefined
  setSelectedCropId: (v: Id<'crops'> | undefined) => void
  fields: FieldOption[]
  crops: CropOption[]
  saving: boolean
  onSave: () => void
  autoTitle: string
}) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title" className="text-xs font-medium">
          標題（選填）
        </Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={autoTitle || '輸入農務內容...'}
          className="h-11"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave()
          }}
        />
        {!title.trim() && autoTitle && (
          <p className="text-[11px] text-muted-foreground">
            留空將自動使用「{autoTitle}」
          </p>
        )}
      </div>

      {/* Type pills */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">類型</Label>
        <div className="flex flex-wrap gap-1.5">
          {TASK_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedType(value)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors min-h-[36px]',
                selectedType === value
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium'
                  : 'hover:bg-accent',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Field selector pills */}
      {fields.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">田地（選填）</Label>
          <div className="flex flex-wrap gap-1.5">
            {fields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() =>
                  setSelectedFieldId(
                    selectedFieldId === field.id ? undefined : field.id,
                  )
                }
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition-colors min-h-[36px]',
                  selectedFieldId === field.id
                    ? 'bg-sky-100 border-sky-300 text-sky-800 font-medium'
                    : 'hover:bg-accent',
                )}
              >
                {field.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crop selector pills */}
      {crops.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">作物（選填）</Label>
          <div className="flex flex-wrap gap-1.5">
            {crops.slice(0, 12).map((crop) => (
              <button
                key={crop.id}
                type="button"
                onClick={() =>
                  setSelectedCropId(
                    selectedCropId === crop.id ? undefined : crop.id,
                  )
                }
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition-colors min-h-[36px]',
                  selectedCropId === crop.id
                    ? 'bg-amber-100 border-amber-300 text-amber-800 font-medium'
                    : 'hover:bg-accent',
                )}
              >
                {crop.emoji && <span className="mr-0.5">{crop.emoji}</span>}
                {crop.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <Button
        className="w-full h-12 text-base font-medium mt-2"
        onClick={onSave}
        disabled={saving}
      >
        {saving ? '儲存中...' : '儲存'}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickAddFAB({
  farmId,
  fields,
  crops,
  onCreate,
  open: controlledOpen,
  onOpenChange,
}: QuickAddFABProps) {
  const isMobile = useIsMobile()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState('watering')
  const [selectedFieldId, setSelectedFieldId] = useState<Id<'fields'> | undefined>()
  const [selectedCropId, setSelectedCropId] = useState<Id<'crops'> | undefined>()
  const [saving, setSaving] = useState(false)

  // Auto-detect type as user types
  useEffect(() => {
    if (title.length > 0) {
      const detected = detectTaskType(title)
      setSelectedType(detected)
    }
  }, [title])

  // Auto-generate title from type + crop selection
  const autoTitle = useMemo(() => {
    const typeLabel = TASK_TYPES.find((t) => t.value === selectedType)?.label ?? ''
    const cropName = crops.find((c) => c.id === selectedCropId)?.name ?? ''
    if (cropName && typeLabel) return `${cropName} ${typeLabel}`
    if (typeLabel) return typeLabel
    return ''
  }, [selectedType, selectedCropId, crops])

  const handleSave = useCallback(async () => {
    const trimmed = title.trim()
    // Use auto-generated title if user left it empty
    const finalTitle = trimmed || autoTitle
    if (!finalTitle) {
      toast.error('請選擇類型或輸入任務標題')
      return
    }
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]!
      await onCreate({
        farmId,
        type: selectedType,
        title: finalTitle,
        fieldId: selectedFieldId,
        cropId: selectedCropId,
        dueDate: today,
        source: 'manual',
        status: 'pending',
        priority: 'normal',
      })
      toast.success('已新增任務')
      // Reset form
      setTitle('')
      setSelectedType('watering')
      setSelectedFieldId(undefined)
      setSelectedCropId(undefined)
      setOpen(false)
    } catch {
      toast.error('新增失敗')
    } finally {
      setSaving(false)
    }
  }, [title, autoTitle, selectedType, selectedFieldId, selectedCropId, farmId, onCreate, setOpen])

  const formProps = {
    title,
    setTitle,
    selectedType,
    setSelectedType,
    selectedFieldId,
    setSelectedFieldId,
    selectedCropId,
    setSelectedCropId,
    fields,
    crops,
    saving,
    onSave: handleSave,
    autoTitle,
  }

  return (
    <>
      {/* FAB button — always visible, bottom-right */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-20 right-4 z-40',
          'flex size-12 items-center justify-center',
          'rounded-full bg-stone-800 text-white shadow-lg shadow-stone-800/20',
          'hover:bg-stone-900 active:scale-95',
          'transition-all duration-200',
          'md:bottom-6 md:right-6',
        )}
        aria-label="快速新增任務"
      >
        <Plus className="size-6" />
      </button>

      {/* Mobile: Bottom sheet */}
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]" showCloseButton={false}>
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <SheetHeader className="pb-2">
              <SheetTitle className="text-base">快速新增農務</SheetTitle>
              <SheetDescription className="text-xs">
                新增一項今日工作任務
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-4">
              <QuickAddForm {...formProps} />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Dialog modal */
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>快速新增農務</DialogTitle>
              <DialogDescription className="text-xs">
                新增一項今日工作任務
              </DialogDescription>
            </DialogHeader>
            <QuickAddForm {...formProps} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
