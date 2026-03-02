"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";

import { useCrops } from "@/hooks/use-crops";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CROP_CATEGORY_LABELS } from "@/lib/types/labels";
import type { CropCategory } from "@/lib/types/enums";

interface PlantCropDialogProps {
  farmId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (cropId: string) => void;
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
  const { data: crops } = useCrops(farmId);
  const [search, setSearch] = useState("");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>選擇作物</DialogTitle>
          {rectInfo && (
            <p className="text-sm text-muted-foreground">
              區域: {rectInfo.widthM.toFixed(1)} × {rectInfo.heightM.toFixed(1)} m
            </p>
          )}
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
          {filtered.map((crop) => (
            <button
              key={crop.id}
              type="button"
              onClick={() => onSelect(crop.id)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <span className="text-lg">{crop.emoji}</span>
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
          ))}

          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              找不到符合條件的作物
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
