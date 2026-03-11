'use client'

import { useState } from 'react'
import { useFarmId } from '@/hooks/use-farm-id'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { useCrops } from '@/hooks/use-crops'
import { useFields } from '@/hooks/use-fields'
import {
  usePestObservations,
  useCreatePestObservation,
  useResolvePestObservation,
  useTriageObservation,
} from '@/hooks/use-pest-observations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Plus,
  Bug,
  Eye,
  Cross,
  ChevronDown,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

const SEVERITY_LABELS: Record<string, string> = {
  mild: '輕微',
  moderate: '中度',
  severe: '嚴重',
}

const SEVERITY_VARIANTS: Record<string, 'secondary' | 'default' | 'destructive'> = {
  mild: 'secondary',
  moderate: 'default',
  severe: 'destructive',
}

const TRIAGE_STATUS_LABELS: Record<string, string> = {
  pending: '待分析',
  triaged: '已分析',
  resolved: '已解決',
}

const TRIAGE_STATUS_VARIANTS: Record<string, 'secondary' | 'default' | 'outline'> = {
  pending: 'secondary',
  triaged: 'default',
  resolved: 'outline',
}

const LIKELIHOOD_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const LIKELIHOOD_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}

const AFFECTED_PARTS_OPTIONS = [
  { value: 'leaves', label: '葉片' },
  { value: 'stems', label: '莖部' },
  { value: 'roots', label: '根部' },
  { value: 'fruits', label: '果實' },
  { value: 'flowers', label: '花朵' },
]

const SPREAD_RATE_OPTIONS = [
  { value: 'slow', label: '緩慢' },
  { value: 'fast', label: '快速' },
  { value: 'contained', label: '已控制' },
]

export default function PestObservationsPage() {
  const farmId = useFarmId()
  const observations = usePestObservations(farmId)
  const crops = useCrops(farmId) ?? []
  const fields = useFields(farmId) ?? []
  const createObs = useCreatePestObservation()
  const resolveObs = useResolvePestObservation()
  const triageObs = useTriageObservation()
  const isLoading = observations === undefined

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [triaging, setTriaging] = useState<string | null>(null)
  const [resolveDialogId, setResolveDialogId] = useState<string | null>(null)
  const [resolution, setResolution] = useState('')
  const [form, setForm] = useState({
    cropId: '',
    fieldId: '',
    symptoms: '',
    affectedParts: [] as string[],
    severity: 'mild' as 'mild' | 'moderate' | 'severe',
    spreadRate: '',
    environmentNotes: '',
    notes: '',
  })

  const cropMap = new Map<string, string>(crops.map((c) => [c._id, c.name]))

  function resetForm() {
    setForm({
      cropId: '',
      fieldId: '',
      symptoms: '',
      affectedParts: [],
      severity: 'mild',
      spreadRate: '',
      environmentNotes: '',
      notes: '',
    })
  }

  function togglePart(part: string) {
    setForm((f) => ({
      ...f,
      affectedParts: f.affectedParts.includes(part)
        ? f.affectedParts.filter((p) => p !== part)
        : [...f.affectedParts, part],
    }))
  }

  async function handleSubmit() {
    if (!form.symptoms || !farmId) return
    setSubmitting(true)
    try {
      const id = await createObs({
        farmId: farmId as Id<"farms">,
        cropId: form.cropId ? (form.cropId as Id<"crops">) : undefined,
        fieldId: form.fieldId ? (form.fieldId as Id<"fields">) : undefined,
        symptoms: form.symptoms,
        affectedParts: form.affectedParts.length > 0 ? form.affectedParts : undefined,
        severity: form.severity,
        spreadRate: form.spreadRate || undefined,
        environmentNotes: form.environmentNotes || undefined,
        notes: form.notes || undefined,
      })
      toast.success('觀察紀錄已新增')
      setOpen(false)
      resetForm()
      // Auto-trigger triage
      try {
        setTriaging(id)
        await triageObs({ observationId: id })
        toast.success('AI 分析完成')
      } catch {
        toast.error('AI 分析失敗，可稍後重試')
      } finally {
        setTriaging(null)
      }
    } catch {
      toast.error('新增觀察紀錄失敗')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResolve() {
    if (!resolveDialogId || !resolution) return
    try {
      await resolveObs({
        observationId: resolveDialogId as Id<"pestObservations">,
        resolution,
      })
      toast.success('已標記為解決')
      setResolveDialogId(null)
      setResolution('')
    } catch {
      toast.error('操作失敗')
    }
  }

  async function handleRetryTriage(obsId: string) {
    setTriaging(obsId)
    try {
      await triageObs({ observationId: obsId as Id<"pestObservations"> })
      toast.success('AI 分析完成')
    } catch {
      toast.error('AI 分析失敗')
    } finally {
      setTriaging(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">病蟲害觀察紀錄</h1>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新增觀察
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (observations ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bug className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">尚無病蟲害觀察紀錄</p>
          <p className="mt-1 text-sm text-muted-foreground">
            發現異常時，點擊「新增觀察」記錄症狀
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(observations ?? []).map((obs) => (
            <Card key={obs._id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <span>{new Date(obs.observedAt).toLocaleDateString('zh-TW')}</span>
                    {obs.cropId && (
                      <span className="text-muted-foreground">
                        - {cropMap.get(obs.cropId) ?? '未知作物'}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={SEVERITY_VARIANTS[obs.severity] ?? 'secondary'}>
                      {SEVERITY_LABELS[obs.severity] ?? obs.severity}
                    </Badge>
                    <Badge variant={TRIAGE_STATUS_VARIANTS[obs.triageStatus ?? 'pending'] ?? 'secondary'}>
                      {triaging === obs._id ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          分析中...
                        </span>
                      ) : (
                        TRIAGE_STATUS_LABELS[obs.triageStatus ?? 'pending'] ?? '待分析'
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{obs.symptoms}</p>

                {obs.affectedParts && obs.affectedParts.length > 0 && (
                  <div className="flex gap-1">
                    {obs.affectedParts.map((part) => (
                      <Badge key={part} variant="outline" className="text-xs">
                        {AFFECTED_PARTS_OPTIONS.find((o) => o.value === part)?.label ?? part}
                      </Badge>
                    ))}
                  </div>
                )}

                {obs.triageStatus === 'pending' && triaging !== obs._id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetryTriage(obs._id)}
                  >
                    重新分析
                  </Button>
                )}

                {obs.triageResults && obs.triageResults.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 px-0">
                        <ChevronDown className="h-4 w-4" />
                        查看分析結果 ({obs.triageResults.length})
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-3">
                      {obs.triageResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.possibleCause}</span>
                            <Badge variant={LIKELIHOOD_VARIANTS[result.likelihood] ?? 'secondary'}>
                              可能性：{LIKELIHOOD_LABELS[result.likelihood] ?? result.likelihood}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.reasoning}
                          </p>
                          <div className="flex items-start gap-2 text-sm">
                            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                            <span>{result.nextChecks}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <Cross className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <span>{result.treatment}</span>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {obs.resolution && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3 text-sm">
                    <span className="font-medium">解決方式：</span>
                    {obs.resolution}
                  </div>
                )}

                {obs.triageStatus !== 'resolved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setResolveDialogId(obs._id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    標記已解決
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Observation Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增病蟲害觀察</DialogTitle>
            <DialogDescription>記錄觀察到的異常症狀，AI 將自動分析可能原因</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>作物（選填）</Label>
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
              <Label>田區（選填）</Label>
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
              <Label>症狀描述 *</Label>
              <Textarea
                value={form.symptoms}
                onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))}
                placeholder="描述觀察到的異常情況..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>受影響部位</Label>
              <div className="flex flex-wrap gap-2">
                {AFFECTED_PARTS_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={form.affectedParts.includes(opt.value) ? 'default' : 'outline'}
                    onClick={() => togglePart(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>嚴重程度</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm((f) => ({ ...f, severity: v as 'mild' | 'moderate' | 'severe' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">輕微</SelectItem>
                  <SelectItem value="moderate">中度</SelectItem>
                  <SelectItem value="severe">嚴重</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>擴散速度（選填）</Label>
              <Select value={form.spreadRate} onValueChange={(v) => setForm((f) => ({ ...f, spreadRate: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇擴散速度" />
                </SelectTrigger>
                <SelectContent>
                  {SPREAD_RATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>環境備註（選填）</Label>
              <Textarea
                value={form.environmentNotes}
                onChange={(e) => setForm((f) => ({ ...f, environmentNotes: e.target.value }))}
                placeholder="當時的天氣、溫度、濕度等..."
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>其他備註（選填）</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="其他觀察..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.symptoms || submitting}
            >
              {submitting ? '新增中...' : '新增並分析'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialogId} onOpenChange={(o) => { if (!o) { setResolveDialogId(null); setResolution(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>標記為已解決</DialogTitle>
            <DialogDescription>記錄實際的處理方式與結果</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>解決方式</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="描述如何處理這個問題..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResolveDialogId(null); setResolution(''); }}>取消</Button>
            <Button onClick={handleResolve} disabled={!resolution}>
              確認解決
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
