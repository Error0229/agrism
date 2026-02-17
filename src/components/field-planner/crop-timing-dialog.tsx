"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { generateTasksForPlantedCrop } from "@/lib/utils/calendar-helpers";
import { useCropById } from "@/lib/data/crop-lookup";
import type { PlantedCrop } from "@/lib/types";
import { createPlannerEvent, detectSpatialConflictsAt } from "@/lib/planner/events";
import { addDays, format } from "date-fns";

interface CropTimingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantedCrop: PlantedCrop | null;
  fieldId: string;
  occurredAt?: string;
}

export function CropTimingDialog({ open, onOpenChange, plantedCrop, fieldId, occurredAt }: CropTimingDialogProps) {
  const { updatePlantedCrop, plannerEvents } = useFields();
  const { removeTasksByPlantedCrop, addTasks } = useTasks();
  const crop = useCropById(plantedCrop?.cropId ?? "");

  const [plantDate, setPlantDate] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [notes, setNotes] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && plantedCrop) {
      setPlantDate(plantedCrop.plantedDate.split("T")[0]);
      setCustomDays(plantedCrop.customGrowthDays?.toString() ?? "");
      setNotes(plantedCrop.notes ?? "");
    }
    onOpenChange(nextOpen);
  };

  if (!plantedCrop || !crop) return null;

  const growthDays = customDays ? parseInt(customDays) : crop.growthDays;
  const parsedDate = plantDate ? new Date(plantDate) : null;
  const expectedHarvest = parsedDate && !isNaN(parsedDate.getTime())
    ? addDays(parsedDate, isNaN(growthDays) ? crop.growthDays : growthDays)
    : null;

  const conflictPreviewCount = (() => {
    if (!plantedCrop || !parsedDate || isNaN(parsedDate.getTime())) return 0;
    const synthetic = createPlannerEvent({
      type: "crop_updated",
      occurredAt: occurredAt ?? new Date().toISOString(),
      fieldId,
      cropId: plantedCrop.id,
      payload: { plantedDate: parsedDate.toISOString() },
    });
    const replayAt = occurredAt ?? new Date().toISOString();
    const conflicts = detectSpatialConflictsAt([...plannerEvents, synthetic], replayAt).filter((conflict) => conflict.fieldId === fieldId);
    return conflicts.length;
  })();

  const handleSave = () => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return;
    const updates: Partial<PlantedCrop> = {
      plantedDate: parsedDate.toISOString(),
      notes: notes || undefined,
      customGrowthDays: customDays ? parseInt(customDays) : undefined,
    };
    updatePlantedCrop(fieldId, plantedCrop.id, updates, { occurredAt });

    // Regenerate tasks
    removeTasksByPlantedCrop(plantedCrop.id);
    const updatedPlanted = { ...plantedCrop, ...updates };
    const newTasks = generateTasksForPlantedCrop(crop, updatedPlanted);
    addTasks(newTasks);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{crop.emoji} {crop.name} — 調整播種時機</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">播種日期</label>
            <Input type="date" value={plantDate} onChange={(e) => setPlantDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">自訂生長天數（留空使用預設 {crop.growthDays} 天）</label>
            <Input
              type="number"
              min="1"
              placeholder={String(crop.growthDays)}
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
            />
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm">
              預計收成日：<span className="font-medium">{expectedHarvest ? format(expectedHarvest, "yyyy/MM/dd") : "—"}</span>
            </p>
            {conflictPreviewCount > 0 && (
              <p className="mt-1 text-xs text-red-600">警告：此播種時機可能造成 {conflictPreviewCount} 筆空間衝突。</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">備註</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="作物備註..." rows={2} />
          </div>
          <Button onClick={handleSave} className="w-full">
            儲存並重新排程
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
