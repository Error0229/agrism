"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { useFields } from "@/lib/store/fields-context";
import type { Field } from "@/lib/types";
import {
  applyCropToAllZones,
  applyFacilitySuggestionsToZones,
  detectZonesFromImage,
  type ImageLikeData,
  type ZoneCandidate,
} from "@/lib/utils/map-zone-detection";
import { deriveFacilityTypeFromCrop } from "@/lib/utils/facility-metadata";
import { safeRevokeObjectUrl } from "@/lib/utils/object-url";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  normalizeCalibrationDistanceStored,
  parseCalibrationDistanceMeters,
} from "@/lib/utils/map-import-settings";
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
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [imageData, setImageData] = useState<ImageLikeData | null>(null);
  const [zones, setZones] = useState<ZoneCandidate[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  const [calibrationDistance, setCalibrationDistance, calibrationDistanceLoaded] = useLocalStorage(
    "hualien-map-import-calibration-distance",
    "5"
  );
  const [status, setStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const defaultCropId = allCrops[0]?.id ?? "";
  const [bulkCropId, setBulkCropId] = useState("");
  const cropById = useMemo(() => new Map(allCrops.map((crop) => [crop.id, crop])), [allCrops]);

  const canApply = useMemo(
    () => zones.length > 0 && zones.every((zone) => Boolean(zone.cropId)),
    [zones]
  );
  const calibrationDistanceMeters = parseCalibrationDistanceMeters(calibrationDistance);
  const hasValidCalibrationDistance = calibrationDistanceMeters !== null && calibrationDistanceMeters > 0;
  const canCalibrate = calibrationPoints.length === 2 && hasValidCalibrationDistance;
  const hasNormalizedStoredDistance = useRef(false);

  useEffect(() => {
    if (!defaultCropId) return;
    setBulkCropId((prev) => prev || defaultCropId);
  }, [defaultCropId]);

  useEffect(() => {
    if (!calibrationDistanceLoaded) return;
    if (hasNormalizedStoredDistance.current) return;
    hasNormalizedStoredDistance.current = true;
    const normalized = normalizeCalibrationDistanceStored(calibrationDistance);
    if (normalized === calibrationDistance) return;
    setCalibrationDistance(normalized);
  }, [calibrationDistance, calibrationDistanceLoaded, setCalibrationDistance]);

  useEffect(() => {
    return () => {
      safeRevokeObjectUrl(previewUrl);
    };
  }, [previewUrl]);

  const resetDialogState = () => {
    setPreviewSize(null);
    setImageData(null);
    setZones([]);
    setCalibrationPoints([]);
    setStatus(null);
    setProcessing(false);
    setBulkCropId(defaultCropId);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) return;

    setPreviewUrl((prev) => {
      safeRevokeObjectUrl(prev);
      return null;
    });
    resetDialogState();
  };

  const runDetection = (nextImageData: ImageLikeData, useCalibration: boolean) => {
    const detected = detectZonesFromImage(nextImageData, field, defaultCropId, {
      calibration:
        useCalibration && canCalibrate
          ? {
              pointA: calibrationPoints[0],
              pointB: calibrationPoints[1],
              distanceMeters: calibrationDistanceMeters ?? 5,
            }
          : undefined,
    });
    setZones(detected);
    setBulkCropId((prev) => prev || defaultCropId);
    setStatus(detected.length > 0 ? `已偵測 ${detected.length} 個候選區域。` : "未偵測到可用分區，請換一張對比更高的圖。");
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file || !defaultCropId) return;
    setProcessing(true);
    setStatus(null);
    setCalibrationPoints([]);

    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        safeRevokeObjectUrl(prev);
        return url;
      });
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
      const nextImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      setPreviewSize({ width: targetWidth, height: targetHeight });
      setImageData(nextImageData);
      runDetection(nextImageData, false);
    } catch {
      setStatus("圖片分析失敗，請更換檔案後再試。");
      setZones([]);
      setImageData(null);
      setPreviewSize(null);
      setPreviewUrl((prev) => {
        safeRevokeObjectUrl(prev);
        return null;
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!previewSize) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * previewSize.width;
    const y = ((event.clientY - rect.top) / rect.height) * previewSize.height;
    const point = { x, y };
    setCalibrationPoints((prev) => (prev.length >= 2 ? [point] : [...prev, point]));
  };

  const handleRunCalibratedDetection = () => {
    if (!imageData) return;
    if (!canCalibrate) {
      setStatus("請先在預覽圖選取兩個校正點，並輸入實際距離。");
      return;
    }
    runDetection(imageData, true);
    setStatus("已套用兩點比例校正並重新偵測分區。");
  };

  const handleResetCalibration = () => {
    setCalibrationPoints([]);
    if (imageData) {
      runDetection(imageData, false);
      setStatus("已清除比例校正，恢復原始偵測。");
    }
  };

  const handleApply = () => {
    if (!canApply) return;
    const plantedDate = occurredAt ?? new Date().toISOString();
    zones.forEach((zone) => {
      const crop = cropById.get(zone.cropId);
      addPlantedCrop(
        field.id,
        {
          cropId: zone.cropId,
          fieldId: field.id,
          plantedDate,
          status: "growing",
          position: { x: zone.x, y: zone.y },
          size: { width: zone.width, height: zone.height },
          facilityType: deriveFacilityTypeFromCrop(crop),
        },
        { occurredAt: plantedDate }
      );
    });
    setStatus(`已套用 ${zones.length} 個區域。`);
    handleOpenChange(false);
  };

  const handleBulkAssign = () => {
    if (!bulkCropId || zones.length === 0) return;
    setZones((prev) => applyCropToAllZones(prev, bulkCropId));
    setStatus(`已將 ${zones.length} 個區域批次指定為同一項目。`);
  };

  const handleAutoFacilitySuggestions = () => {
    if (zones.length === 0) return;
    const before = zones.map((zone) => zone.cropId).join("|");
    const next = applyFacilitySuggestionsToZones(zones, allCrops);
    const after = next.map((zone) => zone.cropId).join("|");
    setZones(next);
    if (before === after) {
      setStatus("目前顏色分區沒有可套用的設施建議。");
      return;
    }
    setStatus("已依顏色套用可辨識的設施建議。");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

          {previewUrl && previewSize && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                在預覽圖上點兩下建立比例尺校正點，再輸入實際距離（公尺）。
              </p>
              <div
                className="relative inline-block cursor-crosshair select-none"
                style={{ width: previewSize.width, height: previewSize.height }}
                onClick={handlePreviewClick}
              >
                <NextImage
                  src={previewUrl}
                  alt="map-preview"
                  width={previewSize.width}
                  height={previewSize.height}
                  unoptimized
                  className="rounded border"
                />
                {calibrationPoints.map((point, index) => (
                  <span
                    key={`${point.x}-${point.y}-${index}`}
                    className="pointer-events-none absolute block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-red-500"
                    style={{
                      left: `${(point.x / previewSize.width) * 100}%`,
                      top: `${(point.y / previewSize.height) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">兩點實際距離（公尺）</label>
                <input
                  className="h-8 w-24 rounded border px-2 text-sm"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={calibrationDistance}
                  onChange={(event) => setCalibrationDistance(event.target.value)}
                />
                <Button size="sm" variant="outline" onClick={handleRunCalibratedDetection} disabled={!imageData}>
                  套用校正重算
                </Button>
                <Button size="sm" variant="ghost" onClick={handleResetCalibration} disabled={calibrationPoints.length === 0}>
                  清除校正點
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">已選取校正點：{calibrationPoints.length}/2（選第 3 次會重新開始）</p>
            </div>
          )}

          {zones.length > 0 && (
            <div className="space-y-2">
              <div className="rounded border p-2">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Select value={bulkCropId} onValueChange={setBulkCropId}>
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="批次選擇作物或設施" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCrops.map((crop) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.emoji} {crop.name}（{crop.category}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={handleBulkAssign} disabled={!bulkCropId}>
                    套用到全部區域
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleAutoFacilitySuggestions}>
                    依顏色自動標示設施
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">可先批次套用，再逐區覆寫。</p>
              </div>
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
            </div>
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
