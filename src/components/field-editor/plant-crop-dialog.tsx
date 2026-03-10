"use client";

import { useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";

import { useCrops } from "@/hooks/use-crops";
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

interface PlantCropDialogProps {
  farmId: string;
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
  }, []);

  const handleOnboardComplete = useCallback(
    (result: OnboardingResult) => {
      if (!selectedCrop) return;
      onSelect(selectedCrop.id, result);
      setSelectedCrop(null);
      setSearch("");
    },
    [selectedCrop, onSelect],
  );

  const handleBack = useCallback(() => {
    setSelectedCrop(null);
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
