"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PlantedCrop } from "@/lib/types";

interface CropHarvestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantedCrop: PlantedCrop | null;
  cropName?: string;
  onConfirm: (harvestedDate: string) => void;
}

export function CropHarvestDialog({
  open,
  onOpenChange,
  plantedCrop,
  cropName,
  onConfirm,
}: CropHarvestDialogProps) {
  const [harvestDate, setHarvestDate] = useState("");

  if (!plantedCrop) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const baseline = plantedCrop.harvestedDate ?? new Date().toISOString().split("T")[0];
      setHarvestDate(baseline.split("T")[0]);
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (!harvestDate) return;
    onConfirm(new Date(`${harvestDate}T00:00:00.000Z`).toISOString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>標記收成 {cropName ? `- ${cropName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">收成日期</label>
            <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleConfirm}>
            確認收成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
