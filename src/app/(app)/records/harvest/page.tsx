'use client'

import { useState } from 'react'
import { useFarmId } from '@/hooks/use-farm-id'
import { useHarvestLogs, useCreateHarvestLog, useDeleteHarvestLog } from '@/hooks/use-harvest'
import { useCrops } from '@/hooks/use-crops'
import { useFields } from '@/hooks/use-fields'
import { QUALITY_GRADE_LABELS, PEST_INCIDENT_LABELS, WEATHER_IMPACT_LABELS } from '@/lib/types/labels'
import type { QualityGrade, PestIncident, WeatherImpact } from '@/lib/types/enums'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Wheat } from 'lucide-react'
import { toast } from 'sonner'

export default function HarvestRecordsPage() {
  const farmId = useFarmId()
  const logs = useHarvestLogs(farmId)
  const crops = useCrops(farmId) ?? []
  const fields = useFields(farmId) ?? []
  const createLog = useCreateHarvestLog()
  const deleteLog = useDeleteHarvestLog()
  const isLoading = logs === undefined

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    cropId: '',
    fieldId: '',
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    unit: 'kg',
    qualityGrade: '' as string,
    pestIncidentLevel: '' as string,
    weatherImpact: '' as string,
    notes: '',
  })

  const cropMap = new Map<string, string>(crops.map((c: any) => [c._id, c.name]))
  const fieldMap = new Map<string, string>(fields.map((f: any) => [f._id, f.name]))

  function resetForm() {
    setForm({
      cropId: '',
      fieldId: '',
      date: new Date().toISOString().split('T')[0],
      quantity: '',
      unit: 'kg',
      qualityGrade: '',
      pestIncidentLevel: '',
      weatherImpact: '',
      notes: '',
    })
  }

  async function handleSubmit() {
    if (!form.cropId || !form.fieldId || !form.quantity || !farmId) return
    setSubmitting(true)
    try {
      await createLog({
        farmId: farmId as any,
        cropId: form.cropId as any,
        fieldId: form.fieldId as any,
        date: form.date,
        quantity: Number(form.quantity),
        unit: form.unit,
        qualityGrade: form.qualityGrade ? (form.qualityGrade as QualityGrade) : undefined,
        pestIncidentLevel: form.pestIncidentLevel ? (form.pestIncidentLevel as PestIncident) : undefined,
        weatherImpact: form.weatherImpact ? (form.weatherImpact as WeatherImpact) : undefined,
        notes: form.notes || undefined,
      })
      toast.success('收成紀錄已新增')
      setOpen(false)
      resetForm()
    } catch {
      toast.error('新增收成紀錄失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">收成紀錄</h1>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新增收成
        </Button>
      </div>

      {isLoading ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>作物</TableHead>
                <TableHead>田區</TableHead>
                <TableHead className="text-right">數量</TableHead>
                <TableHead>品質</TableHead>
                <TableHead>蟲害</TableHead>
                <TableHead>天氣</TableHead>
                <TableHead>備註</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (logs ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wheat className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">尚無收成紀錄</p>
          <p className="mt-1 text-sm text-muted-foreground">點擊「新增收成」開始記錄</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>作物</TableHead>
                <TableHead>田區</TableHead>
                <TableHead className="text-right">數量</TableHead>
                <TableHead>品質</TableHead>
                <TableHead>蟲害</TableHead>
                <TableHead>天氣</TableHead>
                <TableHead>備註</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="whitespace-nowrap">{log.date}</TableCell>
                  <TableCell>{cropMap.get(log.cropId) ?? '—'}</TableCell>
                  <TableCell>{fieldMap.get(log.fieldId) ?? '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {log.quantity} {log.unit}
                  </TableCell>
                  <TableCell>
                    {log.qualityGrade && (
                      <Badge variant="secondary">
                        {QUALITY_GRADE_LABELS[log.qualityGrade as QualityGrade]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.pestIncidentLevel && log.pestIncidentLevel !== 'none' && (
                      <Badge variant="destructive">
                        {PEST_INCIDENT_LABELS[log.pestIncidentLevel as PestIncident]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.weatherImpact && log.weatherImpact !== 'none' && (
                      <Badge variant="outline">
                        {WEATHER_IMPACT_LABELS[log.weatherImpact as WeatherImpact]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={log.notes ?? ''}>
                    {log.notes ?? ''}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteLog({ id: log._id as any })
                          toast.success('收成紀錄已刪除')
                        } catch {
                          toast.error('刪除收成紀錄失敗')
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增收成紀錄</DialogTitle>
            <DialogDescription>記錄本次收成的詳細資訊</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>作物</Label>
              <Select value={form.cropId} onValueChange={(v) => setForm((f) => ({ ...f, cropId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇作物" />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>田區</Label>
              <Select value={form.fieldId} onValueChange={(v) => setForm((f) => ({ ...f, fieldId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇田區" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>數量</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label>單位</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="kg"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>品質等級</Label>
              <Select value={form.qualityGrade} onValueChange={(v) => setForm((f) => ({ ...f, qualityGrade: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇等級（選填）" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUALITY_GRADE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>蟲害狀況</Label>
              <Select value={form.pestIncidentLevel} onValueChange={(v) => setForm((f) => ({ ...f, pestIncidentLevel: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇蟲害程度（選填）" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PEST_INCIDENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>天氣影響</Label>
              <Select value={form.weatherImpact} onValueChange={(v) => setForm((f) => ({ ...f, weatherImpact: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇天氣影響（選填）" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WEATHER_IMPACT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>備註</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="收成備註..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.cropId || !form.fieldId || !form.quantity || submitting}
            >
              {submitting ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
