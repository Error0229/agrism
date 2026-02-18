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
import { TaskType, type TaskDifficulty } from "@/lib/types";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { getTaskEffortPreset, parseToolList } from "@/lib/utils/task-effort";
import { Plus } from "lucide-react";

export function AddTaskDialog() {
  const { addTask } = useTasks();
  const allCrops = useAllCrops();
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<string>("");
  const [cropId, setCropId] = useState<string>("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");
  const [effortMinutes, setEffortMinutes] = useState("");
  const [difficulty, setDifficulty] = useState<TaskDifficulty>("medium");
  const [toolsInput, setToolsInput] = useState("");

  const handleTaskTypeChange = (value: string) => {
    setTaskType(value);
    if (!value) return;
    const preset = getTaskEffortPreset(value as TaskType);
    setEffortMinutes(String(preset.effortMinutes));
    setDifficulty(preset.difficulty);
    setToolsInput(preset.requiredTools.join(", "));
  };

  const handleSubmit = () => {
    if (!taskType || !cropId || !dueDate) return;
    const crop = allCrops.find((c) => c.id === cropId);
    const finalTitle = title || `${crop?.emoji} ${crop?.name} - ${taskType}`;
    addTask({
      type: taskType as TaskType,
      title: finalTitle,
      cropId,
      dueDate: new Date(dueDate).toISOString(),
      effortMinutes: effortMinutes ? parseInt(effortMinutes, 10) : undefined,
      difficulty,
      requiredTools: parseToolList(toolsInput),
    });
    setOpen(false);
    setTitle("");
    setTaskType("");
    setCropId("");
    setEffortMinutes("");
    setDifficulty("medium");
    setToolsInput("");
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
            <Select value={taskType} onValueChange={handleTaskTypeChange}>
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
                {allCrops.map((crop) => (
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">預估工時（分鐘）</label>
              <Input
                type="number"
                min="5"
                max="480"
                value={effortMinutes}
                onChange={(e) => setEffortMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">難度</label>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as TaskDifficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">工具需求（逗號分隔）</label>
            <Input
              placeholder="例如：手鏟, 水管"
              value={toolsInput}
              onChange={(e) => setToolsInput(e.target.value)}
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
