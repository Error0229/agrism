'use client'

import { useState } from 'react'
import { Plus, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

import { useFarmId } from '@/hooks/use-farm-id'
import { useCreateTask } from '@/hooks/use-tasks'
import { useCrops } from '@/hooks/use-crops'
import { useFields } from '@/hooks/use-fields'
import { TaskType, TaskDifficulty } from '@/lib/types/enums'
import { TASK_TYPE_LABELS, TASK_DIFFICULTY_LABELS } from '@/lib/types/labels'
import { cn } from '@/lib/utils'

const TASK_TYPE_VALUES = Object.values(TaskType) as TaskType[]
const TASK_DIFFICULTY_VALUES = Object.values(TaskDifficulty) as TaskDifficulty[]

export function AddTaskDialog() {
  const farmId = useFarmId()
  const createTask = useCreateTask(farmId ?? '')
  const { data: crops } = useCrops(farmId)
  const { data: fields } = useFields(farmId)

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<string>('')
  const [title, setTitle] = useState('')
  const [cropId, setCropId] = useState<string>('')
  const [fieldId, setFieldId] = useState<string>('')
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date())
  const [effortMinutes, setEffortMinutes] = useState('')
  const [difficulty, setDifficulty] = useState<string>('')
  const [toolsInput, setToolsInput] = useState('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  function resetForm() {
    setType('')
    setTitle('')
    setCropId('')
    setFieldId('')
    setDueDate(new Date())
    setEffortMinutes('')
    setDifficulty('')
    setToolsInput('')
  }

  function handleSubmit() {
    if (!type || !title || !dueDate || !farmId) return

    const tools = toolsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    createTask.mutate(
      {
        type: type as TaskType,
        title,
        cropId: cropId || null,
        fieldId: fieldId || null,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        effortMinutes: effortMinutes ? parseInt(effortMinutes, 10) : null,
        difficulty: (difficulty as TaskDifficulty) || null,
        requiredTools: tools.length > 0 ? tools : null,
      },
      {
        onSuccess: () => {
          setOpen(false)
          resetForm()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          新增任務
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增任務</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>任務類型 *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇任務類型" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPE_VALUES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TASK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>任務名稱 *</Label>
            <Input
              placeholder="例如：小白菜 - 播種"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>相關作物（選填）</Label>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇作物" />
              </SelectTrigger>
              <SelectContent>
                {crops?.map((crop) => (
                  <SelectItem key={crop.id} value={crop.id}>
                    {crop.emoji} {crop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>相關田區（選填）</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇田區" />
              </SelectTrigger>
              <SelectContent>
                {fields?.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>預定日期 *</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="size-4" />
                  {dueDate ? format(dueDate, 'yyyy年M月d日', { locale: zhTW }) : '選擇日期'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date)
                    setDatePickerOpen(false)
                  }}
                  locale={zhTW}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>預估工時（分鐘）</Label>
              <Input
                type="number"
                min="5"
                max="480"
                placeholder="45"
                value={effortMinutes}
                onChange={(e) => setEffortMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>難度</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇難度" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_DIFFICULTY_VALUES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {TASK_DIFFICULTY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>工具需求（逗號分隔）</Label>
            <Input
              placeholder="例如：手鏟, 水管"
              value={toolsInput}
              onChange={(e) => setToolsInput(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!type || !title || !dueDate || createTask.isPending}
            className="w-full"
          >
            {createTask.isPending ? '新增中...' : '新增'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
