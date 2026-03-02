'use client'

import { useState } from 'react'
import { useFarmId } from '@/hooks/use-farm-id'
import { useFields } from '@/hooks/use-fields'
import {
  useSoilProfile,
  useUpsertSoilProfile,
  useSoilAmendments,
  useCreateSoilAmendment,
  useDeleteSoilAmendment,
  useSoilNotes,
  useCreateSoilNote,
  useDeleteSoilNote,
} from '@/hooks/use-soil'
import { SOIL_TEXTURE_LABELS } from '@/lib/types/labels'
import type { SoilTexture } from '@/lib/types/enums'
import { Button } from '@/components/ui/button'
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
import { Plus, Trash2, Pencil, Layers, FlaskConical, StickyNote } from 'lucide-react'

function PhIndicator({ value }: { value: number }) {
  // Map pH 0-14 to hue: red(0) -> yellow(60) -> green(120) -> blue(240)
  const pct = value / 14
  const hue = pct * 240
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
      />
      <span className="font-medium">{value.toFixed(1)}</span>
    </div>
  )
}

export default function SoilRecordsPage() {
  const farmId = useFarmId()
  const { data: fields = [] } = useFields(farmId)
  const [selectedFieldId, setSelectedFieldId] = useState<string>('')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">土壤管理</h1>
        <p className="mt-1 text-muted-foreground">記錄土壤狀態與施肥資訊</p>
      </div>

      <div className="grid gap-2">
        <Label>選擇田區</Label>
        <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="選擇田區" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedFieldId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">請先選擇田區以查看土壤資料</p>
        </div>
      ) : (
        <FieldSoilContent fieldId={selectedFieldId} />
      )}
    </div>
  )
}

function FieldSoilContent({ fieldId }: { fieldId: string }) {
  return (
    <div className="space-y-6">
      <SoilProfileSection fieldId={fieldId} />
      <SoilAmendmentsSection fieldId={fieldId} />
      <SoilNotesSection fieldId={fieldId} />
    </div>
  )
}

// --- Soil Profile Section ---

function SoilProfileSection({ fieldId }: { fieldId: string }) {
  const { data: profile, isLoading } = useSoilProfile(fieldId)
  const upsert = useUpsertSoilProfile(fieldId)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    texture: '' as string,
    ph: '',
    ec: '',
    organicMatterPct: '',
  })

  function startEdit() {
    setForm({
      texture: profile?.texture ?? '',
      ph: profile?.ph != null ? String(profile.ph) : '',
      ec: profile?.ec != null ? String(profile.ec) : '',
      organicMatterPct: profile?.organicMatterPct != null ? String(profile.organicMatterPct) : '',
    })
    setEditing(true)
  }

  async function handleSave() {
    await upsert.mutateAsync({
      texture: form.texture ? (form.texture as SoilTexture) : undefined,
      ph: form.ph ? Number(form.ph) : undefined,
      ec: form.ec ? Number(form.ec) : undefined,
      organicMatterPct: form.organicMatterPct ? Number(form.organicMatterPct) : undefined,
    })
    setEditing(false)
  }

  if (isLoading) return <p className="text-muted-foreground">載入中...</p>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          土壤概況
        </CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={startEdit} className="gap-1">
            <Pencil className="h-3.5 w-3.5" />
            編輯
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>質地</Label>
              <Select value={form.texture} onValueChange={(v) => setForm((f) => ({ ...f, texture: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇質地" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOIL_TEXTURE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>pH 值</Label>
                <Input
                  type="number"
                  min="0"
                  max="14"
                  step="0.1"
                  value={form.ph}
                  onChange={(e) => setForm((f) => ({ ...f, ph: e.target.value }))}
                  placeholder="7.0"
                />
              </div>
              <div className="grid gap-2">
                <Label>EC (dS/m)</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={form.ec}
                  onChange={(e) => setForm((f) => ({ ...f, ec: e.target.value }))}
                  placeholder="0.0"
                />
              </div>
              <div className="grid gap-2">
                <Label>有機質 (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.organicMatterPct}
                  onChange={(e) => setForm((f) => ({ ...f, organicMatterPct: e.target.value }))}
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? '儲存中...' : '儲存'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>取消</Button>
            </div>
          </div>
        ) : profile ? (
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">質地</p>
              <p className="font-medium">
                {profile.texture ? SOIL_TEXTURE_LABELS[profile.texture as SoilTexture] : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">pH 值</p>
              {profile.ph != null ? <PhIndicator value={profile.ph} /> : <p>—</p>}
            </div>
            <div>
              <p className="text-muted-foreground">EC (dS/m)</p>
              <p className="font-medium">{profile.ec != null ? profile.ec.toFixed(1) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">有機質 (%)</p>
              <p className="font-medium">
                {profile.organicMatterPct != null ? `${profile.organicMatterPct.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">尚未建立土壤概況</p>
            <Button variant="outline" size="sm" onClick={startEdit} className="mt-2">
              建立概況
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Soil Amendments Section ---

function SoilAmendmentsSection({ fieldId }: { fieldId: string }) {
  const { data: amendments = [] } = useSoilAmendments(fieldId)
  const createAmendment = useCreateSoilAmendment(fieldId)
  const deleteAmendment = useDeleteSoilAmendment(fieldId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amendmentType: '',
    quantity: '',
    unit: 'kg',
    notes: '',
  })

  function resetForm() {
    setForm({
      date: new Date().toISOString().split('T')[0],
      amendmentType: '',
      quantity: '',
      unit: 'kg',
      notes: '',
    })
  }

  async function handleSubmit() {
    if (!form.amendmentType || !form.quantity) return
    await createAmendment.mutateAsync({
      date: form.date,
      amendmentType: form.amendmentType,
      quantity: Number(form.quantity),
      unit: form.unit,
      notes: form.notes || undefined,
    })
    setOpen(false)
    resetForm()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" />
          土壤改良紀錄
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          新增
        </Button>
      </CardHeader>
      <CardContent>
        {amendments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">尚無改良紀錄</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead className="text-right">用量</TableHead>
                  <TableHead>備註</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {amendments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">{a.date}</TableCell>
                    <TableCell>{a.amendmentType}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {a.quantity} {a.unit}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{a.notes ?? ''}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAmendment.mutate(a.id)}
                        disabled={deleteAmendment.isPending}
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
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增土壤改良紀錄</DialogTitle>
            <DialogDescription>記錄施肥或土壤改良資訊</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>改良類型</Label>
              <Input
                value={form.amendmentType}
                onChange={(e) => setForm((f) => ({ ...f, amendmentType: e.target.value }))}
                placeholder="例如：有機肥、石灰、堆肥"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>用量</Label>
                <Input
                  type="number"
                  min="0"
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
              <Label>備註</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="備註..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.amendmentType || !form.quantity || createAmendment.isPending}
            >
              {createAmendment.isPending ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// --- Soil Notes Section ---

function SoilNotesSection({ fieldId }: { fieldId: string }) {
  const { data: notes = [] } = useSoilNotes(fieldId)
  const createNote = useCreateSoilNote(fieldId)
  const deleteNote = useDeleteSoilNote(fieldId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ph: '',
    content: '',
  })

  function resetForm() {
    setForm({
      date: new Date().toISOString().split('T')[0],
      ph: '',
      content: '',
    })
  }

  async function handleSubmit() {
    if (!form.content) return
    await createNote.mutateAsync({
      date: form.date,
      ph: form.ph ? Number(form.ph) : undefined,
      content: form.content,
    })
    setOpen(false)
    resetForm()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4" />
          土壤觀察筆記
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          新增
        </Button>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">尚無觀察筆記</p>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="flex items-start justify-between rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{n.date}</span>
                    {n.ph != null && <PhIndicator value={n.ph} />}
                  </div>
                  <p className="mt-1 text-sm">{n.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNote.mutate(n.id)}
                  disabled={deleteNote.isPending}
                  className="ml-2 shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增觀察筆記</DialogTitle>
            <DialogDescription>記錄土壤觀察或 pH 量測結果</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>pH 值（選填）</Label>
              <Input
                type="number"
                min="0"
                max="14"
                step="0.1"
                value={form.ph}
                onChange={(e) => setForm((f) => ({ ...f, ph: e.target.value }))}
                placeholder="7.0"
              />
            </div>
            <div className="grid gap-2">
              <Label>內容</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="土壤觀察筆記..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.content || createNote.isPending}
            >
              {createNote.isPending ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
