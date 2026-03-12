"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Search, CalendarRange, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { useCrops } from "@/hooks/use-crops";
import { useCropFieldSuitability, useFieldCropSuitabilities } from "@/hooks/use-suitability";
import type { CellContext } from "./season-board";
import {
  useCreatePlannedPlanting,
  useUpdatePlannedPlanting,
  useDeletePlannedPlanting,
  useConfirmPlannedPlanting,
  useCancelPlannedPlanting,
  useCheckOverlap,
} from "@/hooks/use-planned-plantings";
import { AlertTriangle } from "lucide-react";
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
import { CropAvatar } from "@/components/crops/crop-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CROP_CATEGORY_LABELS } from "@/lib/types/labels";
import { cn } from "@/lib/utils";
import { resolveCropMedia } from "@/lib/crops/media";
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
    notes?: string;
    planningState: string;
  };
  /** Info about the current occupant, if any */
  currentOccupant?: {
    cropName?: string;
    cropEmoji?: string;
    estimatedEnd?: string;
    rotationFamily?: string;
  };
  /** Pre-fill start period from clicked cell in season board */
  initialCellContext?: CellContext;
  /** Link to predecessor planted crop for succession planning */
  predecessorPlantedCropId?: Id<"plantedCrops">;
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

/** Compute end month/jun by adding growthDays to a start month/jun */
function computeEndFromGrowthDays(
  sYear: string,
  sMonth: string,
  sJun: string,
  growthDays: number,
): { year: string; month: string; jun: string } {
  const dateStr = monthJunToDateStr(sYear, sMonth, sJun);
  const d = new Date(dateStr);
  d.setDate(d.getDate() + growthDays);
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = d.getDate();
  const jun = day <= 10 ? "early" : day <= 20 ? "mid" : "late";
  return { year, month, jun };
}

// --- Suitability helpers ---

const SUIT_LABELS: Record<string, string> = {
  recommended: "推薦",
  marginal: "注意",
  risky: "風險",
};

const SUIT_STYLES: Record<string, string> = {
  recommended: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  marginal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  risky: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const ROTATION_FAMILY_LABELS: Record<string, string> = {
  brassica: "十字花科",
  solanaceae: "茄科",
  cucurbit: "瓜科",
  legume: "豆科",
  allium: "蔥蒜科",
  root: "根莖類",
};

/** Small suitability badge shown next to crop in the details step */
function DetailSuitabilityBadge({
  cropId,
  fieldId,
}: {
  cropId: Id<"crops">;
  fieldId: Id<"fields">;
}) {
  const result = useCropFieldSuitability(cropId, fieldId);
  if (!result) return null;
  return (
    <div>
      <Badge className={cn("text-[10px] px-1.5 py-0 border-0", SUIT_STYLES[result.score])}>
        {SUIT_LABELS[result.score] ?? result.score}
      </Badge>
      {result.score !== "recommended" && result.overallNotes && (
        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
          {result.overallNotes}
        </p>
      )}
    </div>
  );
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
  initialCellContext,
  predecessorPlantedCropId,
}: PlanCropDialogProps) {
  const crops = useCrops(farmId);
  const createPlanning = useCreatePlannedPlanting();
  const updatePlanning = useUpdatePlannedPlanting();
  const deletePlanning = useDeletePlannedPlanting();
  const confirmPlanning = useConfirmPlannedPlanting();
  const cancelPlanning = useCancelPlannedPlanting();

  const fieldSuitabilities = useFieldCropSuitabilities(fieldId, farmId);
  const suitabilityMap = useMemo((): Map<string, { score: string; overallNotes: string }> => {
    if (!fieldSuitabilities) return new Map();
    return new Map(fieldSuitabilities.map((s) => [s.cropId, { score: s.score, overallNotes: s.overallNotes }]));
  }, [fieldSuitabilities]);

  const isEditing = !!existingPlan;

  // --- Form state ---
  const currentYear = String(new Date().getFullYear());

  const [step, setStep] = useState<"crop" | "details">(isEditing ? "details" : "crop");
  const [search, setSearch] = useState("");
  const [selectedCropId, setSelectedCropId] = useState<string | undefined>(
    existingPlan?.cropId ?? undefined,
  );
  const [selectedCropName, setSelectedCropName] = useState<string>(
    existingPlan?.cropName ?? "",
  );

  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState("");
  const [startJun, setStartJun] = useState("");

  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState("");
  const [endJun, setEndJun] = useState("");

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form state when dialog opens with new context
  React.useEffect(() => {
    if (open) {
      setStep(existingPlan ? "details" : "crop");
      setSearch("");
      setSelectedCropId(existingPlan?.cropId ?? undefined);
      setSelectedCropName(existingPlan?.cropName ?? "");

      // Bug 4 fix: parse predecessor's estimatedEnd for start date auto-fill
      // Format can be "2026年5月下旬" or ISO date string
      let predecessorEndParsed: { year: string; month: string; jun: string } | null = null;
      if (currentOccupant?.estimatedEnd) {
        // Try parsing "YYYY年M月[上旬|中旬|下旬]" format
        const zhMatch = currentOccupant.estimatedEnd.match(/^(\d{4})年(\d{1,2})月(上旬|中旬|下旬)$/);
        if (zhMatch) {
          predecessorEndParsed = {
            year: zhMatch[1],
            month: String(parseInt(zhMatch[2])).padStart(2, "0"),
            jun: zhMatch[3] === "上旬" ? "early" : zhMatch[3] === "中旬" ? "mid" : "late",
          };
        } else {
          // Try ISO date format fallback
          predecessorEndParsed = parseWindowToMonthJun(currentOccupant.estimatedEnd);
        }
      }

      const parsedS = parseWindowToMonthJun(existingPlan?.startWindowEarliest);
      setStartYear(parsedS?.year ?? predecessorEndParsed?.year ?? initialCellContext?.year ?? currentYear);
      setStartMonth(parsedS?.month ?? predecessorEndParsed?.month ?? initialCellContext?.month ?? "");
      setStartJun(parsedS?.jun ?? predecessorEndParsed?.jun ?? initialCellContext?.jun ?? "");

      const parsedE = parseWindowToMonthJun(existingPlan?.endWindowEarliest);
      setEndYear(parsedE?.year ?? currentYear);
      setEndMonth(parsedE?.month ?? "");
      setEndJun(parsedE?.jun ?? "");

      setNotes(existingPlan?.notes ?? "");

      // Auto-calculate end date if we have a start from predecessor and a selected crop
      if (!existingPlan && predecessorEndParsed && existingPlan === undefined) {
        // End will be auto-calculated when crop is selected via handleCropSelect
        // But if a crop is already selected (e.g. editing), calculate now
        if (selectedCropId && crops) {
          const crop = crops.find((c) => c._id === selectedCropId);
          if (crop?.growthDays) {
            const end = computeEndFromGrowthDays(
              predecessorEndParsed.year,
              predecessorEndParsed.month,
              predecessorEndParsed.jun,
              crop.growthDays,
            );
            setEndYear(end.year);
            setEndMonth(end.month);
            setEndJun(end.jun);
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingPlan, initialCellContext?.month, initialCellContext?.jun, initialCellContext?.year, currentYear, currentOccupant?.estimatedEnd]);

  // Overlap detection
  const overlapStartTs = useMemo(() => {
    if (!startMonth || !startJun) return undefined;
    return new Date(monthJunToDateStr(startYear, startMonth, startJun)).getTime();
  }, [startYear, startMonth, startJun]);
  const overlapEndTs = useMemo(() => {
    if (!endMonth || !endJun) return undefined;
    return new Date(monthJunToDateStr(endYear, endMonth, endJun)).getTime();
  }, [endYear, endMonth, endJun]);
  const overlaps = useCheckOverlap(
    fieldId,
    overlapStartTs,
    overlapEndTs,
    existingPlan?._id,
    regionId,
  );

  // Rotation family warning — check if selected crop shares family with predecessor
  const rotationWarning = useMemo(() => {
    if (!currentOccupant?.rotationFamily || !selectedCropId || !crops) return null;
    const selectedCrop = crops.find((c) => c._id === selectedCropId);
    if (!selectedCrop?.rotationFamily) return null;
    if (selectedCrop.rotationFamily === currentOccupant.rotationFamily) {
      const familyLabel =
        ROTATION_FAMILY_LABELS[selectedCrop.rotationFamily] ?? selectedCrop.rotationFamily;
      return `同科作物（${familyLabel}），建議輪作`;
    }
    return null;
  }, [currentOccupant?.rotationFamily, selectedCropId, crops]);

  // Filtered crops list, sorted by suitability
  const filtered = useMemo(() => {
    if (!crops) return [];
    const scoreOrder: Record<string, number> = { recommended: 0, marginal: 1, risky: 2 };
    let list = crops;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = crops.filter(
        (c) =>
          c.name.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const sa = suitabilityMap.get(a._id)?.score ?? "marginal";
      const sb = suitabilityMap.get(b._id)?.score ?? "marginal";
      return (scoreOrder[sa] ?? 9) - (scoreOrder[sb] ?? 9);
    });
  }, [crops, search, suitabilityMap]);

  // Auto-recalculate end when start or crop changes
  const autoCalcEnd = useCallback(
    (sYear: string, sMonth: string, sJun: string, cropId?: string) => {
      if (!sMonth || !sJun || !crops) return;
      const crop = crops.find((c) => c._id === (cropId ?? selectedCropId));
      if (crop?.growthDays) {
        const end = computeEndFromGrowthDays(sYear, sMonth, sJun, crop.growthDays);
        setEndYear(end.year);
        setEndMonth(end.month);
        setEndJun(end.jun);
      }
    },
    [crops, selectedCropId],
  );

  const handleStartYearChange = useCallback(
    (val: string) => {
      setStartYear(val);
      autoCalcEnd(val, startMonth, startJun);
    },
    [startMonth, startJun, autoCalcEnd],
  );

  const handleStartMonthChange = useCallback(
    (val: string) => {
      setStartMonth(val);
      autoCalcEnd(startYear, val, startJun);
    },
    [startYear, startJun, autoCalcEnd],
  );

  const handleStartJunChange = useCallback(
    (val: string) => {
      setStartJun(val);
      autoCalcEnd(startYear, startMonth, val);
    },
    [startYear, startMonth, autoCalcEnd],
  );

  const handleCropSelect = useCallback(
    (cropId: string, cropName: string) => {
      setSelectedCropId(cropId);
      setSelectedCropName(cropName);
      // Auto-calculate end from growthDays if start is set
      if (startMonth && startJun && crops) {
        const crop = crops.find((c) => c._id === cropId);
        if (crop?.growthDays) {
          const end = computeEndFromGrowthDays(startYear, startMonth, startJun, crop.growthDays);
          setEndYear(end.year);
          setEndMonth(end.month);
          setEndJun(end.jun);
        }
      }
      setStep("details");
    },
    [crops, startYear, startMonth, startJun],
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
          predecessorPlantedCropId,
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
    notes,
    predecessorPlantedCropId,
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
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
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

        {/* Predecessor info banner */}
        {predecessorPlantedCropId && currentOccupant?.cropName && (
          <div className="flex items-start gap-2 rounded-md border border-sky-200/60 bg-sky-50/50 px-3 py-2.5 dark:border-sky-800/30 dark:bg-sky-950/20">
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-sky-100 text-sm dark:bg-sky-900/30">
              {currentOccupant.cropEmoji ?? "🌱"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
                接續 {currentOccupant.cropName} 之後
              </p>
              {currentOccupant.estimatedEnd && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  前作預估結束: {currentOccupant.estimatedEnd}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Current occupant info (when not in predecessor mode) */}
        {!predecessorPlantedCropId && currentOccupant?.cropName && (
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
              {filtered.map((crop) => {
                const suit = suitabilityMap.get(crop._id);
                const media = resolveCropMedia(crop);
                return (
                  <button
                    key={crop._id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                    onClick={() => handleCropSelect(crop._id, crop.name)}
                  >
                    <CropAvatar
                      name={crop.name}
                      emoji={media.emoji}
                      imageUrl={media.imageUrl}
                      thumbnailUrl={media.thumbnailUrl}
                      color={crop.color}
                      size="sm"
                    />
                    <span className="flex-1 truncate">{crop.name}</span>
                    {suit && (
                      <Badge className={cn("text-[10px] px-1.5 py-0 border-0", SUIT_STYLES[suit.score])}>
                        {SUIT_LABELS[suit.score] ?? suit.score}
                      </Badge>
                    )}
                    {crop.category && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {CROP_CATEGORY_LABELS[crop.category as CropCategory] ?? crop.category}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div className="space-y-4">
            {/* Selected crop */}
            <div className="space-y-1">
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
              {selectedCropId && (
                <DetailSuitabilityBadge
                  cropId={selectedCropId as Id<"crops">}
                  fieldId={fieldId}
                />
              )}
              {/* Rotation family warning */}
              {rotationWarning && (
                <div className="flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50/50 px-2.5 py-1.5 dark:border-amber-700/40 dark:bg-amber-950/20">
                  <AlertTriangle className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    {rotationWarning}
                  </span>
                </div>
              )}
            </div>

            {/* Start window */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                <CalendarRange className="size-3" />
                預計開始時段
              </Label>
              <div className="flex items-center gap-1.5">
                <Select value={startYear} onValueChange={handleStartYearChange}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startMonth} onValueChange={handleStartMonthChange}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue placeholder="月份" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startJun} onValueChange={handleStartJunChange}>
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
                預計結束時段 <span className="text-[10px]">(依生長天數自動計算)</span>
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

        {/* Overlap warning */}
        {overlaps && overlaps.length > 0 && step === "details" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50/50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-950/20">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs text-amber-700 dark:text-amber-400">
              <p className="font-medium">時段與以下種植重疊：</p>
              <ul className="mt-1 space-y-0.5">
                {overlaps.map((o) => (
                  <li key={o.sourceId}>
                    - {o.cropName ?? "未指定"} ({o.type === "current" ? "目前種植" : "計畫種植"})
                  </li>
                ))}
              </ul>
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
