"use client";

import { useState, useMemo, useCallback } from "react";
import { AlertTriangle, Search } from "lucide-react";

import { useCrops } from "@/hooks/use-crops";
import { useCheckRotationViolation } from "@/hooks/use-fields";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CROP_CATEGORY_LABELS } from "@/lib/types/labels";
import type { CropCategory } from "@/lib/types/enums";
import { CropAvatar } from "@/components/crops/crop-avatar";
import { resolveCropMedia } from "@/lib/crops/media";
import {
  ExistingPlantingOnboard,
  type OnboardingResult,
} from "./existing-planting-onboard";

export interface CropSelectResult {
  cropId: string;
  onboarding?: OnboardingResult;
}

const ROTATION_FAMILY_LABELS: Record<string, string> = {
  brassica: "十字花科",
  solanaceae: "茄科",
  cucurbit: "瓜科",
  legume: "豆科",
  allium: "蔥蒜科",
  root: "根莖類",
};

interface PlantCropDialogProps {
  farmId: string;
  fieldId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (cropId: string, onboarding?: OnboardingResult) => void;
  rectInfo: {
    xM: number;
    yM: number;
    widthM: number;
    heightM: number;
  } | null;
}

export function PlantCropDialog({
  farmId,
  fieldId,
  open,
  onOpenChange,
  onSelect,
  rectInfo,
}: PlantCropDialogProps) {
  const crops = useCrops(farmId as Id<"farms">);
  const [search, setSearch] = useState("");
  const [selectedCrop, setSelectedCrop] = useState<{
    id: string;
    name: string;
    emoji?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
  } | null>(null);

  // Rotation check — only active when a crop is selected in the list (before onboarding step)
  const [pendingCropId, setPendingCropId] = useState<string | null>(null);
  const rotationCheck = useCheckRotationViolation(
    fieldId && pendingCropId ? (fieldId as Id<"fields">) : undefined,
    pendingCropId ? (pendingCropId as Id<"crops">) : undefined,
  );

  const filtered = useMemo(() => {
    if (!crops) return [];
    if (!search.trim()) return crops;
    const q = search.trim().toLowerCase();
    return crops.filter((c) => c.name.toLowerCase().includes(q));
  }, [crops, search]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelectedCrop(null);
        setPendingCropId(null);
        setSearch("");
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  const handleCropClick = useCallback((crop: { _id: string; name: string; emoji?: string; imageUrl?: string; thumbnailUrl?: string; scientificName?: string }) => {
    const media = resolveCropMedia(crop);
    setSelectedCrop({
      id: crop._id,
      name: crop.name,
      emoji: media.emoji,
      imageUrl: media.imageUrl,
      thumbnailUrl: media.thumbnailUrl,
    });
    setPendingCropId(crop._id);
  }, []);

  const handleOnboardComplete = useCallback(
    (result: OnboardingResult) => {
      if (!selectedCrop) return;
      onSelect(selectedCrop.id, result);
      setSelectedCrop(null);
      setPendingCropId(null);
      setSearch("");
    },
    [selectedCrop, onSelect],
  );

  const handleBack = useCallback(() => {
    setSelectedCrop(null);
    setPendingCropId(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-md">
        {selectedCrop ? (
          <>
            <DialogHeader>
              <DialogTitle>種植狀態</DialogTitle>
              <DialogDescription>
                設定這塊區域的作物種植資訊
              </DialogDescription>
            </DialogHeader>
            {/* Rotation warning — advisory, not blocking */}
            {rotationCheck?.hasViolation && rotationCheck.violations.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50/50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-950/20">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    輪作提醒
                  </p>
                  {rotationCheck.violations.map((v, i) => (
                    <p key={i} className="text-xs leading-snug text-amber-700 dark:text-amber-400">
                      此區域 {v.yearsAgo} 年前曾種植同科作物「{v.cropName}」（{ROTATION_FAMILY_LABELS[v.rotationFamily] ?? v.rotationFamily}），建議間隔 {v.requiredYears} 年
                    </p>
                  ))}
                </div>
              </div>
            )}
            <ExistingPlantingOnboard
              cropName={selectedCrop.name}
              cropEmoji={selectedCrop.emoji}
              cropImageUrl={selectedCrop.imageUrl}
              cropThumbnailUrl={selectedCrop.thumbnailUrl}
              onComplete={handleOnboardComplete}
              onBack={handleBack}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>選擇作物</DialogTitle>
              <DialogDescription>
                {rectInfo
                  ? `為區域 (${rectInfo.widthM.toFixed(1)} × ${rectInfo.heightM.toFixed(1)} m) 指定作物`
                  : "選擇要指定的作物品種"}
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="搜尋作物..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {filtered.map((crop) => {
                const media = resolveCropMedia(crop);
                return (
                <button
                  key={crop._id}
                  type="button"
                  onClick={() => handleCropClick(crop)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <CropAvatar
                    name={crop.name}
                    emoji={media.emoji}
                    imageUrl={media.imageUrl}
                    thumbnailUrl={media.thumbnailUrl}
                    color={crop.color}
                    size="sm"
                  />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-medium">{crop.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {CROP_CATEGORY_LABELS[crop.category as CropCategory]}
                      </Badge>
                      {crop.growthDays && (
                        <span className="text-xs text-muted-foreground">
                          {crop.growthDays} 天
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                );
              })}

              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  找不到符合條件的作物
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
