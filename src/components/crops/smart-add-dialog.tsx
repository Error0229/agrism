'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useImportCropWithEvidence } from '@/hooks/use-crop-import'
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
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { CropCategory } from '@/lib/types/enums'
import { CROP_CATEGORY_LABELS } from '@/lib/types/labels'
import type { CropCategory as CropCategoryType } from '@/lib/types/enums'
import type { Id } from '../../../convex/_generated/dataModel'

interface SmartAddDialogProps {
  farmId: Id<"farms"> | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SmartAddDialog({ farmId, open, onOpenChange }: SmartAddDialogProps) {
  const importCrop = useImportCropWithEvidence()
  const router = useRouter()

  const [name, setName] = useState('')
  const [variety, setVariety] = useState('')
  const [category, setCategory] = useState<string>('')
  const [isPending, setIsPending] = useState(false)

  function resetForm() {
    setName('')
    setVariety('')
    setCategory('')
  }

  async function handleSubmit() {
    if (!farmId) {
      toast.error('無法取得農場資訊，請重新登入')
      return
    }
    if (!name || !category) return

    setIsPending(true)
    try {
      const result = await importCrop({
        farmId,
        name,
        category: category as CropCategoryType,
        ...(variety ? { variety } : {}),
      })

      if (!result?.cropId) {
        toast.error('建立作物失敗')
        return
      }

      toast.success('AI 資料匯入完成，請審核確認')
      resetForm()
      onOpenChange(false)
      router.push(`/crops/${result.cropId}?review=true`)
    } catch {
      toast.error('建立作物失敗')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) resetForm()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            智慧新增作物
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          輸入作物名稱與分類，AI 將自動研究並匯入完整的種植知識，匯入後可審核確認。
        </p>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">作物名稱 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：番茄、芥藍菜"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">品種</label>
            <Input
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="例：牛番茄、聖女小番茄（選填）"
            />
          </div>
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
          <Button
            onClick={handleSubmit}
            disabled={!name || !category || isPending}
            className="w-full gap-1.5 bg-violet-600 hover:bg-violet-700"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isPending ? 'AI 正在研究作物資料...' : '建立並自動研究知識'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
