'use client'

import { useState } from 'react'
import { useCreateField } from '@/hooks/use-fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  PlotType,
  SunHours,
  Drainage,
  Slope,
  WindExposure,
} from '@/lib/types/enums'
import type {
  PlotType as PlotTypeType,
  SunHours as SunHoursType,
  Drainage as DrainageType,
  Slope as SlopeType,
  WindExposure as WindExposureType,
} from '@/lib/types/enums'
import {
  PLOT_TYPE_LABELS,
  SUN_HOURS_LABELS,
  DRAINAGE_LABELS,
  SLOPE_LABELS,
  WIND_EXPOSURE_LABELS,
} from '@/lib/types/labels'
import type { Id } from '../../../convex/_generated/dataModel'

interface CreateFieldDialogProps {
  farmId: Id<"farms"> | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateFieldDialog({
  farmId,
  open,
  onOpenChange,
}: CreateFieldDialogProps) {
  const createField = useCreateField()

  const [name, setName] = useState('')
  const [widthM, setWidthM] = useState('')
  const [heightM, setHeightM] = useState('')
  const [contextOpen, setContextOpen] = useState(false)
  const [plotType, setPlotType] = useState<string>('')
  const [sunHours, setSunHours] = useState<string>('')
  const [drainage, setDrainage] = useState<string>('')
  const [slope, setSlope] = useState<string>('')
  const [windExposure, setWindExposure] = useState<string>('')
  const [isPending, setIsPending] = useState(false)

  function resetForm() {
    setName('')
    setWidthM('')
    setHeightM('')
    setContextOpen(false)
    setPlotType('')
    setSunHours('')
    setDrainage('')
    setSlope('')
    setWindExposure('')
  }

  async function handleSubmit() {
    if (!farmId) {
      toast.error('無法取得農場資訊，請重新登入')
      return
    }
    const w = parseFloat(widthM)
    const h = parseFloat(heightM)
    if (!name.trim()) {
      toast.error('請輸入田地名稱')
      return
    }
    if (isNaN(w) || w < 0.1 || isNaN(h) || h < 0.1) {
      toast.error('寬度與長度需至少 0.1 公尺')
      return
    }

    setIsPending(true)
    try {
      await createField({
        farmId,
        name,
        widthM: w,
        heightM: h,
        plotType: plotType ? (plotType as PlotTypeType) : undefined,
        sunHours: sunHours ? (sunHours as SunHoursType) : undefined,
        drainage: drainage ? (drainage as DrainageType) : undefined,
        slope: slope ? (slope as SlopeType) : undefined,
        windExposure: windExposure ? (windExposure as WindExposureType) : undefined,
      })
      toast.success('田地已建立')
      resetForm()
      onOpenChange(false)
    } catch {
      toast.error('建立田地失敗')
    } finally {
      setIsPending(false)
    }
  }

  const isValid =
    name.trim().length > 0 &&
    !isNaN(parseFloat(widthM)) &&
    parseFloat(widthM) >= 0.1 &&
    !isNaN(parseFloat(heightM)) &&
    parseFloat(heightM) >= 0.1

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) resetForm()
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>新增田地</DialogTitle>
          <DialogDescription>輸入田地名稱、尺寸及環境條件以建立新田地。</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium">田地名稱 *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：前院菜圃"
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">寬度 (公尺) *</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={widthM}
                  onChange={(e) => setWidthM(e.target.value)}
                  placeholder="例如：10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">長度 (公尺) *</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={heightM}
                  onChange={(e) => setHeightM(e.target.value)}
                  placeholder="例如：20"
                />
              </div>
            </div>

            {/* Collapsible context section */}
            <div className="rounded-md border">
              <button
                type="button"
                onClick={() => setContextOpen(!contextOpen)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {contextOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                環境條件（選填）
              </button>
              {contextOpen && (
                <div className="space-y-3 border-t px-3 py-3">
                  {/* Plot type */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">田地類型</label>
                    <Select value={plotType} onValueChange={setPlotType}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇類型" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(PlotType).map((v) => (
                          <SelectItem key={v} value={v}>
                            {PLOT_TYPE_LABELS[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sun hours */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">日照時數</label>
                    <Select value={sunHours} onValueChange={setSunHours}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇日照" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SunHours).map((v) => (
                          <SelectItem key={v} value={v}>
                            {SUN_HOURS_LABELS[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Drainage */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">排水性</label>
                    <Select value={drainage} onValueChange={setDrainage}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇排水性" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Drainage).map((v) => (
                          <SelectItem key={v} value={v}>
                            {DRAINAGE_LABELS[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Slope */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">坡度</label>
                    <Select value={slope} onValueChange={setSlope}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇坡度" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Slope).map((v) => (
                          <SelectItem key={v} value={v}>
                            {SLOPE_LABELS[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wind exposure */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">風力暴露</label>
                    <Select
                      value={windExposure}
                      onValueChange={setWindExposure}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇風力" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(WindExposure).map((v) => (
                          <SelectItem key={v} value={v}>
                            {WIND_EXPOSURE_LABELS[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isPending}
              className="w-full"
            >
              {isPending && (
                <Loader2 className="mr-1 size-4 animate-spin" />
              )}
              建立田地
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
