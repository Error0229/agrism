"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTasks } from "@/lib/store/tasks-context";
import { TaskType } from "@/lib/types";
import { cropsDatabase } from "@/lib/data/crops-database";
import { Plus } from "lucide-react";

export function AddTaskDialog() {
  const { addTask } = useTasks();
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<string>("");
  const [cropId, setCropId] = useState<string>("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    if (!taskType || !cropId || !dueDate) return;
    const crop = cropsDatabase.find((c) => c.id === cropId);
    const finalTitle = title || `${crop?.emoji} ${crop?.name} - ${taskType}`;
    addTask({
      type: taskType as TaskType,
      title: finalTitle,
      cropId,
      dueDate: new Date(dueDate).toISOString(),
    });
    setOpen(false);
    setTitle("");
    setTaskType("");
    setCropId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-1" />
          新增任務
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增任務</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">任務類型</label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger>
                <SelectValue placeholder="選擇任務類型" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskType).map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">相關作物</label>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger>
                <SelectValue placeholder="選擇作物" />
              </SelectTrigger>
              <SelectContent>
                {cropsDatabase.map((crop) => (
                  <SelectItem key={crop.id} value={crop.id}>
                    {crop.emoji} {crop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">預定日期</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">自訂名稱（選填）</label>
            <Input
              placeholder="留空將自動產生"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={!taskType || !cropId} className="w-full">
            新增
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
