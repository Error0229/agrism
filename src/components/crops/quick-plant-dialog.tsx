'use client'

import { Component, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

const ROTATION_FAMILY_LABELS: Record<string, string> = {
  brassica: '十字花科',
  solanaceae: '茄科',
  cucurbit: '瓜科',
  legume: '豆科',
  allium: '蔥蒜科',
  root: '根莖類',
}
import { useFarmId } from '@/hooks/use-farm-id'
import { useFieldsSummary, useCheckRotationViolation } from '@/hooks/use-fields'

// Error boundary — silently hides rotation check on failure (non-critical)
class RotationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sprout, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

// Extracted rotation warning — isolated so errors don't crash the dialog
function RotationWarning({
  fieldId,
  cropId,
}: {
  fieldId: Id<'fields'>
  cropId: Id<'crops'>
}) {
  const rotationCheck = useCheckRotationViolation(fieldId, cropId)

  if (!rotationCheck?.hasViolation || rotationCheck.violations.length === 0) {
    return null
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50/50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-950/20">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
        <p className="font-medium">輪作警告</p>
        {rotationCheck.violations.map((v, i) => (
          <p key={i}>
            此田區 {v.yearsAgo} 年前種過{v.cropName}（{ROTATION_FAMILY_LABELS[v.rotationFamily] ?? v.rotationFamily}），建議間隔 {v.requiredYears} 年
          </p>
        ))}
      </div>
    </div>
  )
}

interface QuickPlantDialogProps {
  cropId: Id<'crops'>
  cropName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedFieldId?: Id<'fields'>
  /** Optional suitability data to show badges on field options */
  fieldSuitabilities?: Array<{
    fieldId: string
    fieldName: string
    score: string
  }>
}

export function QuickPlantDialog({
  cropId,
  cropName,
  open,
  onOpenChange,
  preselectedFieldId,
  fieldSuitabilities,
}: QuickPlantDialogProps) {
  const farmId = useFarmId()
  const fieldsSummary = useFieldsSummary(farmId)
  const plantCrop = useMutation(api.fields.plantCrop)

  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    preselectedFieldId ?? ''
  )
  const [isPending, setIsPending] = useState(false)

  // Reset selection when dialog opens with a preselected field
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedFieldId(preselectedFieldId ?? '')
    }
    onOpenChange(nextOpen)
  }

  const selectedField = fieldsSummary?.find(
    (f) => f._id === selectedFieldId
  )

  // Build suitability lookup
  const suitabilityMap = new Map(
    (fieldSuitabilities ?? []).map((s) => [s.fieldId, s.score])
  )

  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  async function handleConfirm() {
    if (!selectedFieldId) return
    setIsPending(true)
    try {
      // Calculate placement: query existing planted crops in the field
      // and place at next available row
      const existingCount =
        selectedField?.plantedCrops.filter(
          (pc) => pc.status === 'growing'
        ).length ?? 0
      const yM = existingCount * 2.5
      const xM = 0

      await plantCrop({
        fieldId: selectedFieldId as Id<'fields'>,
        cropId,
        xM,
        yM,
        widthM: 2,
        heightM: 2,
      })

      const fieldName = selectedField?.name ?? '田區'
      toast.success(`已將 ${cropName} 種植到 ${fieldName}`)
      setSelectedFieldId('')
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '種植失敗，請稍後再試'
      )
    } finally {
      setIsPending(false)
    }
  }

  const SCORE_LABELS: Record<string, string> = {
    recommended: '推薦',
    marginal: '注意',
    risky: '風險',
  }

  const SCORE_BADGE_STYLES: Record<string, string> = {
    recommended:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    marginal:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    risky:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="size-5 text-emerald-600" />
            快速種植
          </DialogTitle>
          <DialogDescription>
            將 <span className="font-medium text-foreground">{cropName}</span>{' '}
            種植到田區
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Field selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">選擇田區</label>
            {fieldsSummary === undefined ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                載入田區中...
              </div>
            ) : fieldsSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                尚未建立田區，請先前往田區頁面建立
              </p>
            ) : (
              <Select
                value={selectedFieldId}
                onValueChange={setSelectedFieldId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇田區..." />
                </SelectTrigger>
                <SelectContent>
                  {fieldsSummary.map((field) => {
                    const score = suitabilityMap.get(field._id)
                    return (
                      <SelectItem key={field._id} value={field._id}>
                        <div className="flex items-center gap-2">
                          <span>{field.name}</span>
                          {score && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 border-0 ${SCORE_BADGE_STYLES[score] ?? ''}`}
                            >
                              {SCORE_LABELS[score] ?? score}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Confirmation summary */}
          {selectedField && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                種植確認
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">作物：</span>
                <span className="font-medium">{cropName}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">田區：</span>
                <span className="font-medium">{selectedField.name}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">日期：</span>
                <span className="font-medium">{today}</span>
              </div>
            </div>
          )}

          {/* Rotation violation warning (issue #117) — wrapped in error boundary */}
          {selectedFieldId && (
            <RotationErrorBoundary>
              <RotationWarning
                fieldId={selectedFieldId as Id<'fields'>}
                cropId={cropId}
              />
            </RotationErrorBoundary>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedFieldId ||
              isPending ||
              !fieldsSummary ||
              fieldsSummary.length === 0
            }
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {isPending ? '種植中...' : '確認種植'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
