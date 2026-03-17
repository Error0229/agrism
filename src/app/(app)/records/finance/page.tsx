'use client'

import { useState, useMemo } from 'react'
import { useFarmId } from '@/hooks/use-farm-id'
import type { Id } from '../../../../../convex/_generated/dataModel'
import {
  useFinanceRecords,
  useCreateFinanceRecord,
  useDeleteFinanceRecord,
  useFinanceSummary,
} from '@/hooks/use-finance'
import { FINANCE_TYPE_LABELS } from '@/lib/types/labels'
import type { FinanceType } from '@/lib/types/enums'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useCrops } from '@/hooks/use-crops'
import { useFields } from '@/hooks/use-fields'

function formatNT(amount: number) {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

export default function FinanceRecordsPage() {
  const farmId = useFarmId()
  const records = useFinanceRecords(farmId)
  const summary = useFinanceSummary(farmId)
  const createRecord = useCreateFinanceRecord()
  const deleteRecord = useDeleteFinanceRecord()
  const cropsData = useCrops(farmId)
  const fieldsData = useFields(farmId)
  const crops = useMemo(() => cropsData ?? [], [cropsData])
  const fields = useMemo(() => fieldsData ?? [], [fieldsData])
  const isLoading = records === undefined

  const cropMap = useMemo(() => new Map<string, string>(crops.map((c) => [c._id, c.name])), [crops])
  const fieldMap = useMemo(() => new Map<string, string>(fields.map((f) => [f._id, f.name])), [fields])

  // Check if any record has crop/field references to conditionally show columns
  const hasAnyCropRef = useMemo(() => (records ?? []).some((r) => r.relatedCropId), [records])
  const hasAnyFieldRef = useMemo(() => (records ?? []).some((r) => r.relatedFieldId), [records])

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    type: 'income' as string,
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    relatedCropId: '',
    relatedFieldId: '',
  })

  function resetForm() {
    setForm({
      type: 'income',
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      relatedCropId: '',
      relatedFieldId: '',
    })
  }

  async function handleSubmit() {
    if (!form.category || !form.amount || !form.description || !farmId) return
    setSubmitting(true)
    try {
      await createRecord({
        farmId: farmId as Id<"farms">,
        type: form.type as FinanceType,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        description: form.description,
        relatedCropId: form.relatedCropId ? (form.relatedCropId as Id<"crops">) : undefined,
        relatedFieldId: form.relatedFieldId ? (form.relatedFieldId as Id<"fields">) : undefined,
      })
      toast.success('財務紀錄已新增')
      setOpen(false)
      resetForm()
    } catch {
      toast.error('新增財務紀錄失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const net = summary?.net ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">財務管理</h1>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新增紀錄
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">總收入</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNT(summary?.totalIncome ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">總支出</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNT(summary?.totalExpense ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">淨利</CardTitle>
            <DollarSign className={`h-4 w-4 ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatNT(net)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {summary?.byCategory && summary.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">分類明細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {summary.byCategory.map((item) => (
                <div
                  key={`${item.type}-${item.category}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.type === 'income' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {FINANCE_TYPE_LABELS[item.type as FinanceType]}
                    </Badge>
                    <span>{item.category}</span>
                  </div>
                  <span className="font-medium">
                    {formatNT(Number(item.total ?? 0))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records table */}
      {isLoading ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>說明</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (records ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">尚無財務紀錄</p>
          <p className="mt-1 text-sm text-muted-foreground">點擊「新增紀錄」開始記錄收支</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>分類</TableHead>
                {hasAnyCropRef && <TableHead>作物</TableHead>}
                {hasAnyFieldRef && <TableHead>田區</TableHead>}
                <TableHead className="text-right">金額</TableHead>
                <TableHead>說明</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(records ?? []).map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                  <TableCell>
                    <Badge variant={r.type === 'income' ? 'default' : 'destructive'}>
                      {FINANCE_TYPE_LABELS[r.type as FinanceType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  {hasAnyCropRef && (
                    <TableCell>
                      {r.relatedCropId && cropMap.get(r.relatedCropId) ? (
                        <Link href={`/crops/${r.relatedCropId}`} className="text-primary hover:underline underline-offset-2">
                          {cropMap.get(r.relatedCropId)}
                        </Link>
                      ) : '—'}
                    </TableCell>
                  )}
                  {hasAnyFieldRef && (
                    <TableCell>
                      {r.relatedFieldId && fieldMap.get(r.relatedFieldId) ? (
                        <Link href={`/fields/${r.relatedFieldId}`} className="text-primary hover:underline underline-offset-2">
                          {fieldMap.get(r.relatedFieldId)}
                        </Link>
                      ) : '—'}
                    </TableCell>
                  )}
                  <TableCell className="text-right whitespace-nowrap font-medium">
                    {formatNT(r.amount)}
                  </TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteRecord({ financeRecordId: r._id })
                          toast.success('財務紀錄已刪除')
                        } catch {
                          toast.error('刪除財務紀錄失敗')
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
            <DialogTitle>新增財務紀錄</DialogTitle>
            <DialogDescription>記錄收入或支出明細</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>類型</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FINANCE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>分類</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="例如：肥料、種子、蔬菜銷售"
              />
            </div>
            <div className="grid gap-2">
              <Label>金額</Label>
              <Input
                type="number"
                min="0.01"
                step="1"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>關聯作物（選填）</Label>
              <Select value={form.relatedCropId} onValueChange={(v) => setForm((f) => ({ ...f, relatedCropId: v }))}>
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
              <Label>關聯田區（選填）</Label>
              <Select value={form.relatedFieldId} onValueChange={(v) => setForm((f) => ({ ...f, relatedFieldId: v }))}>
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
              <Label>說明</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="紀錄說明..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.category || !form.amount || !form.description || submitting}
            >
              {submitting ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
