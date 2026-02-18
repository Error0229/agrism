"use client";

import { useMemo, useState } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { useFields } from "@/lib/store/fields-context";
import type { Field } from "@/lib/types";
import { detectZonesFromImage, type ZoneCandidate } from "@/lib/utils/map-zone-detection";
import { Upload } from "lucide-react";

interface MapImportDialogProps {
  field: Field;
  occurredAt?: string;
}


export function MapImportDialog({ field, occurredAt }: MapImportDialogProps) {
  const { addPlantedCrop } = useFields();
  const allCrops = useAllCrops();
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneCandidate[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const defaultCropId = allCrops[0]?.id ?? "";

  const canApply = useMemo(
    () => zones.length > 0 && zones.every((zone) => Boolean(zone.cropId)),
    [zones]
  );

  const handleFileSelect = async (file: File | null) => {
    if (!file || !defaultCropId) return;
    setProcessing(true);
    setStatus(null);

    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      const image = new window.Image();
      image.src = url;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("image-load-failed"));
      });

      const maxSize = 480;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas-context");

      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const detected = detectZonesFromImage(imageData, field, defaultCropId);
      setZones(detected);
      setStatus(detected.length > 0 ? `已偵測 ${detected.length} 個候選區域。` : "未偵測到可用分區，請換一張對比更高的圖。");
    } catch {
      setStatus("圖片分析失敗，請更換檔案後再試。");
      setZones([]);
    } finally {
      setProcessing(false);
    }
  };

  const handleApply = () => {
    if (!canApply) return;
    const plantedDate = occurredAt ?? new Date().toISOString();
    zones.forEach((zone) => {
      addPlantedCrop(
        field.id,
        {
          cropId: zone.cropId,
          fieldId: field.id,
          plantedDate,
          status: "growing",
          position: { x: zone.x, y: zone.y },
          size: { width: zone.width, height: zone.height },
        },
        { occurredAt: plantedDate }
      );
    });
    setStatus(`已套用 ${zones.length} 個區域。`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="size-4 mr-1" />
          匯入地圖分區
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>地圖/藍圖分區匯入</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
          />

          {previewUrl && (
            <NextImage
              src={previewUrl}
              alt="map-preview"
              width={480}
              height={240}
              unoptimized
              className="max-h-48 rounded border object-contain"
            />
          )}

          {zones.length > 0 && (
            <ScrollArea className="h-60 rounded border p-2">
              <div className="space-y-2">
                {zones.map((zone, index) => (
                  <div key={zone.id} className="rounded border p-2">
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
                      <span>區域 {index + 1}</span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(zone.width)}×{Math.round(zone.height)} cm)
                      </span>
                    </div>
                    <Select
                      value={zone.cropId}
                      onValueChange={(value) =>
                        setZones((prev) => prev.map((item) => (item.id === zone.id ? { ...item, cropId: value } : item)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇作物或設施" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCrops.map((crop) => (
                          <SelectItem key={crop.id} value={crop.id}>
                            {crop.emoji} {crop.name}（{crop.category}）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <Button onClick={handleApply} disabled={!canApply || processing}>
            套用偵測結果
          </Button>
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
