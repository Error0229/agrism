"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Search, CalendarRange, MessageSquare, Gauge } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useCrops } from "@/hooks/use-crops";
import {
  useCreatePlannedPlanting,
  useUpdatePlannedPlanting,
  useDeletePlannedPlanting,
  useConfirmPlannedPlanting,
  useCancelPlannedPlanting,
} from "@/hooks/use-planned-plantings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CROP_CATEGORY_LABELS } from "@/lib/types/labels";
import type { CropCategory } from "@/lib/types/enums";
import type { Id } from "../../../convex/_generated/dataModel";

// --- Types ---

export interface PlanCropDialogProps {
  farmId: Id<"farms">;
  fieldId: Id<"fields">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill for the region being planned */
  regionId?: string;
  /** If editing an existing planned planting */
  existingPlan?: {
    _id: Id<"plannedPlantings">;
    cropId?: Id<"crops">;
    cropName?: string;
    startWindowEarliest?: string;
    startWindowLatest?: string;
    endWindowEarliest?: string;
    endWindowLatest?: string;
    confidence: "high" | "medium" | "low";
    notes?: string;
    planningState: string;
  };
  /** Info about the current occupant, if any */
  currentOccupant?: {
    cropName?: string;
    estimatedEnd?: string;
  };
}

// --- Month/Jun picker helpers ---

const MONTHS = [
  { value: "01", label: "1月" },
  { value: "02", label: "2月" },
  { value: "03", label: "3月" },
  { value: "04", label: "4月" },
  { value: "05", label: "5月" },
  { value: "06", label: "6月" },
  { value: "07", label: "7月" },
  { value: "08", label: "8月" },
  { value: "09", label: "9月" },
  { value: "10", label: "10月" },
  { value: "11", label: "11月" },
  { value: "12", label: "12月" },
];

const JUN_OPTIONS = [
  { value: "early", label: "上旬", day: "05" },
  { value: "mid", label: "中旬", day: "15" },
  { value: "late", label: "下旬", day: "25" },
];

function parseWindowToMonthJun(dateStr?: string): { year: string; month: string; jun: string } | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = d.getDate();
    const jun = day <= 10 ? "early" : day <= 20 ? "mid" : "late";
    return { year, month, jun };
  } catch {
    return null;
  }
}

function monthJunToDateStr(year: string, month: string, jun: string): string {
  const junOpt = JUN_OPTIONS.find((j) => j.value === jun);
  const day = junOpt?.day ?? "15";
  return `${year}-${month}-${day}`;
}

// --- Component ---

export function PlanCropDialog({
  farmId,
  fieldId,
  open,
  onOpenChange,
  regionId,
  existingPlan,
  currentOccupant,
}: PlanCropDialogProps) {
  const crops = useCrops(farmId);
  const createPlanning = useCreatePlannedPlanting();
  const updatePlanning = useUpdatePlannedPlanting();
  const deletePlanning = useDeletePlannedPlanting();
  const confirmPlanning = useConfirmPlannedPlanting();
  const cancelPlanning = useCancelPlannedPlanting();

  const isEditing = !!existingPlan;

  // --- Form state ---
  const [step, setStep] = useState<"crop" | "details">(isEditing ? "details" : "crop");
  const [search, setSearch] = useState("");
  const [selectedCropId, setSelectedCropId] = useState<string | undefined>(
    existingPlan?.cropId ?? undefined,
  );
  const [selectedCropName, setSelectedCropName] = useState<string>(
    existingPlan?.cropName ?? "",
  );

  const currentYear = String(new Date().getFullYear());
  const parsedStart = parseWindowToMonthJun(existingPlan?.startWindowEarliest);

  const [startYear, setStartYear] = useState(parsedStart?.year ?? currentYear);
  const [startMonth, setStartMonth] = useState(parsedStart?.month ?? "");
  const [startJun, setStartJun] = useState(parsedStart?.jun ?? "");

  const parsedEnd = parseWindowToMonthJun(existingPlan?.endWindowEarliest);
  const [endYear, setEndYear] = useState(parsedEnd?.year ?? currentYear);
  const [endMonth, setEndMonth] = useState(parsedEnd?.month ?? "");
  const [endJun, setEndJun] = useState(parsedEnd?.jun ?? "");

  const [confidence, setConfidence] = useState<"high" | "medium" | "low">(
    existingPlan?.confidence ?? "medium",
  );
  const [notes, setNotes] = useState(existingPlan?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Filtered crops list
  const filtered = useMemo(() => {
    if (!crops) return [];
    if (!search.trim()) return crops;
    const q = search.trim().toLowerCase();
    return crops.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.emoji && c.emoji.includes(q)),
    );
  }, [crops, search]);

  const handleCropSelect = useCallback(
    (cropId: string, cropName: string) => {
      setSelectedCropId(cropId);
      setSelectedCropName(cropName);
      setStep("details");
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const startWindowEarliest =
        startMonth && startJun ? monthJunToDateStr(startYear, startMonth, startJun) : undefined;
      const startWindowLatest = startWindowEarliest; // Same for rough window
      const endWindowEarliest =
        endMonth && endJun ? monthJunToDateStr(endYear, endMonth, endJun) : undefined;
      const endWindowLatest = endWindowEarliest;

      if (isEditing && existingPlan) {
        await updatePlanning({
          plannedPlantingId: existingPlan._id,
          cropId: selectedCropId ? (selectedCropId as Id<"crops">) : undefined,
          cropName: selectedCropName || undefined,
          startWindowEarliest,
          startWindowLatest,
          endWindowEarliest,
          endWindowLatest,
          confidence,
          notes: notes || undefined,
        });
        toast.success("已更新種植計畫");
      } else {
        await createPlanning({
          farmId,
          fieldId,
          regionId,
          cropId: selectedCropId ? (selectedCropId as Id<"crops">) : undefined,
          cropName: selectedCropName || undefined,
          startWindowEarliest,
          startWindowLatest,
          endWindowEarliest,
          endWindowLatest,
          confidence,
          notes: notes || undefined,
        });
        toast.success("已建立種植計畫");
      }
      onOpenChange(false);
    } catch {
      toast.error("儲存失敗");
    } finally {
      setSaving(false);
    }
  }, [
    isEditing,
    existingPlan,
    farmId,
    fieldId,
    regionId,
    selectedCropId,
    selectedCropName,
    startYear,
    startMonth,
    startJun,
    endYear,
    endMonth,
    endJun,
    confidence,
    notes,
    createPlanning,
    updatePlanning,
    onOpenChange,
  ]);

  const handleDelete = useCallback(async () => {
    if (!existingPlan) return;
    setSaving(true);
    try {
      await deletePlanning({ plannedPlantingId: existingPlan._id });
      toast.success("已刪除種植計畫");
      onOpenChange(false);
    } catch {
      toast.error("刪除失敗");
    } finally {
      setSaving(false);
    }
  }, [existingPlan, deletePlanning, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    if (!existingPlan) return;
    setSaving(true);
    try {
      await confirmPlanning({ plannedPlantingId: existingPlan._id });
      toast.success("已確認種植計畫");
      onOpenChange(false);
    } catch {
      toast.error("確認失敗");
    } finally {
      setSaving(false);
    }
  }, [existingPlan, confirmPlanning, onOpenChange]);

  const handleCancel = useCallback(async () => {
    if (!existingPlan) return;
    setSaving(true);
    try {
      await cancelPlanning({ plannedPlantingId: existingPlan._id });
      toast.success("已取消種植計畫");
      onOpenChange(false);
    } catch {
      toast.error("取消失敗");
    } finally {
      setSaving(false);
    }
  }, [existingPlan, cancelPlanning, onOpenChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Reset state
        setStep(isEditing ? "details" : "crop");
        setSearch("");
        if (!isEditing) {
          setSelectedCropId(undefined);
          setSelectedCropName("");
          setStartMonth("");
          setStartJun("");
          setEndMonth("");
          setEndJun("");
          setConfidence("medium");
          setNotes("");
        }
      }
      onOpenChange(open);
    },
    [isEditing, onOpenChange],
  );

  // Year options
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [String(y), String(y + 1), String(y + 2)];
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "編輯種植計畫" : "規劃下一季作物"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "修改種植計畫的時程與細節"
              : "選擇作物並設定大約的種植時間"}
          </DialogDescription>
        </DialogHeader>

        {/* Current occupant info */}
        {currentOccupant?.cropName && (
          <div className="rounded-md border border-amber-200/60 bg-amber-50/50 px-3 py-2 dark:border-amber-800/30 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              目前種植: <span className="font-medium">{currentOccupant.cropName}</span>
              {currentOccupant.estimatedEnd && (
                <span className="ml-1 text-muted-foreground">
                  (預估結束: {currentOccupant.estimatedEnd})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Step 1: Crop selection */}
        {step === "crop" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜尋作物..."
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-[280px] space-y-0.5 overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {crops === undefined ? "載入中..." : "找不到作物"}
                </p>
              )}
              {filtered.map((crop) => (
                <button
                  key={crop._id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                  onClick={() => handleCropSelect(crop._id, crop.name)}
                >
                  {crop.emoji && <span className="text-base">{crop.emoji}</span>}
                  <span className="flex-1 truncate">{crop.name}</span>
                  {crop.category && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {CROP_CATEGORY_LABELS[crop.category as CropCategory] ?? crop.category}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div className="space-y-4">
            {/* Selected crop */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">作物</Label>
                <Badge variant="outline" className="text-xs">
                  {selectedCropName || "未選擇"}
                </Badge>
              </div>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setStep("crop")}
                >
                  更換
                </Button>
              )}
            </div>

            {/* Start window */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                <CalendarRange className="size-3" />
                預計開始時段
              </Label>
              <div className="flex items-center gap-1.5">
                <Select value={startYear} onValueChange={setStartYear}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue placeholder="月份" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startJun} onValueChange={setStartJun}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue placeholder="旬" />
                  </SelectTrigger>
                  <SelectContent>
                    {JUN_OPTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End window (optional) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarRange className="size-3" />
                預計結束時段 <span className="text-[10px]">(選填)</span>
              </Label>
              <div className="flex items-center gap-1.5">
                <Select value={endYear} onValueChange={setEndYear}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endMonth} onValueChange={setEndMonth}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue placeholder="月份" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endJun} onValueChange={setEndJun}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue placeholder="旬" />
                  </SelectTrigger>
                  <SelectContent>
                    {JUN_OPTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Confidence */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                <Gauge className="size-3" />
                確定性
              </Label>
              <div className="flex gap-1.5">
                {(["high", "medium", "low"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-all",
                      confidence === level
                        ? level === "high"
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : level === "medium"
                            ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                            : "border-red-300 bg-red-50 text-red-600 dark:border-red-600 dark:bg-red-950/30 dark:text-red-400"
                        : "border-border text-muted-foreground hover:bg-muted/50",
                    )}
                    onClick={() => setConfidence(level)}
                  >
                    {level === "high" ? "高" : level === "medium" ? "中" : "低"}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="size-3" />
                備註 <span className="text-[10px]">(選填)</span>
              </Label>
              <Textarea
                className="min-h-[60px] resize-none text-xs"
                placeholder="例如：等玉米採收後接種..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {/* Edit mode actions */}
          {isEditing && existingPlan?.planningState === "draft" && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
              >
                刪除
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                取消計畫
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleConfirm}
                disabled={saving}
              >
                確認計畫
              </Button>
            </>
          )}
          {isEditing && existingPlan?.planningState === "confirmed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              取消計畫
            </Button>
          )}

          {step === "details" && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !selectedCropName}
            >
              {saving ? "儲存中..." : isEditing ? "更新" : "建立計畫"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
