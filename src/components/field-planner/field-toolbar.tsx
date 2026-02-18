"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { generateTasksForPlantedCrop } from "@/lib/utils/calendar-helpers";
import { isInfrastructureCategory, type Field } from "@/lib/types";
import { polygonBounds, toTrapezoidPoints } from "@/lib/utils/crop-shape";
import { CropTimingDialog } from "./crop-timing-dialog";
import { CropHarvestDialog } from "./crop-harvest-dialog";
import { Plus, Trash2, Clock, Scissors, Eye, EyeOff } from "lucide-react";

interface FieldToolbarProps {
  field: Field;
  selectedCropId: string | null;
  onSelectCrop: (id: string | null) => void;
  occurredAt?: string;
}

export function FieldToolbar({ field, selectedCropId, onSelectCrop, occurredAt }: FieldToolbarProps) {
  const { addPlantedCrop, updatePlantedCrop, removePlantedCrop, harvestPlantedCrop, showHarvestedCrops, setShowHarvestedCrops } = useFields();
  const { addTasks, removeTasksByPlantedCrop } = useTasks();
  const allCrops = useAllCrops();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [timingOpen, setTimingOpen] = useState(false);
  const [harvestOpen, setHarvestOpen] = useState(false);

  const filteredCrops = useMemo(() => allCrops.filter((c) => c.name.includes(search)), [allCrops, search]);

  const selectedPlanted = selectedCropId ? field.plantedCrops.find((c) => c.id === selectedCropId) ?? null : null;
  const selectedCropMeta = useMemo(
    () => (selectedPlanted ? allCrops.find((crop) => crop.id === selectedPlanted.cropId) : null),
    [selectedPlanted, allCrops]
  );
  const selectedIsInfrastructure = selectedCropMeta ? isInfrastructureCategory(selectedCropMeta.category) : false;

  const handleAddCrop = (cropId: string) => {
    const crop = allCrops.find((c) => c.id === cropId);
    if (!crop) return;
    const existingCount = field.plantedCrops.filter((item) => item.status === "growing").length;
    const column = existingCount % 5;
    const row = Math.floor(existingCount / 5);
    const plantedDate = occurredAt ?? new Date().toISOString();
    const plantedCrop = addPlantedCrop(
      field.id,
      {
        cropId,
        fieldId: field.id,
        plantedDate,
        status: "growing",
        position: { x: 50 + column * 70, y: 50 + row * 70 },
        size: { width: crop.spacing.plant, height: crop.spacing.row },
      },
      { occurredAt: plantedDate }
    );
    if (!isInfrastructureCategory(crop.category)) {
      const tasks = generateTasksForPlantedCrop(crop, plantedCrop);
      addTasks(tasks);
    }
    setPopoverOpen(false);
    setSearch("");
  };

  const handleDeleteSelected = () => {
    if (!selectedCropId) return;
    removeTasksByPlantedCrop(selectedCropId);
    removePlantedCrop(field.id, selectedCropId, { occurredAt });
    onSelectCrop(null);
  };

  const handleHarvestSelected = (harvestedDate: string) => {
    if (!selectedCropId) return;
    harvestPlantedCrop(field.id, selectedCropId, harvestedDate, { occurredAt: occurredAt ?? harvestedDate });
  };

  const handleConvertToTrapezoid = () => {
    if (!selectedPlanted || selectedPlanted.status !== "growing") return;
    const points = toTrapezoidPoints(selectedPlanted);
    const bounds = polygonBounds(points);
    updatePlantedCrop(
      field.id,
      selectedPlanted.id,
      {
        shape: { kind: "polygon", points },
        position: { x: bounds.minX, y: bounds.minY },
        size: { width: bounds.width, height: bounds.height },
      },
      { occurredAt }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button size="sm">
            <Plus className="size-4 mr-1" />
            新增作物
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            placeholder="搜尋作物..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {filteredCrops.map((crop) => (
                <button
                  key={crop.id}
                  onClick={() => handleAddCrop(crop.id)}
                  className="flex w-full items-center gap-2 rounded p-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="text-lg">{crop.emoji}</span>
                  <span>{crop.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="outline" onClick={() => setShowHarvestedCrops(!showHarvestedCrops)}>
        {showHarvestedCrops ? <EyeOff className="size-4 mr-1" /> : <Eye className="size-4 mr-1" />}
        {showHarvestedCrops ? "隱藏已收成" : "顯示已收成"}
      </Button>

      {selectedCropId && (
        <>
          <Button size="sm" variant="outline" onClick={() => setTimingOpen(true)} disabled={selectedIsInfrastructure}>
            <Clock className="size-4 mr-1" />
            調整播種時間
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setHarvestOpen(true)}
            disabled={selectedPlanted?.status === "harvested" || selectedIsInfrastructure}
          >
            <Scissors className="size-4 mr-1" />
            標記收成
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleConvertToTrapezoid}
            disabled={selectedPlanted?.status !== "growing"}
          >
            梯形/多邊形
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <Trash2 className="size-4 mr-1" />
            刪除選取
          </Button>
        </>
      )}

      <CropTimingDialog
        open={timingOpen}
        onOpenChange={setTimingOpen}
        plantedCrop={selectedIsInfrastructure ? null : selectedPlanted}
        fieldId={field.id}
        occurredAt={occurredAt}
      />

      <CropHarvestDialog
        open={harvestOpen}
        onOpenChange={setHarvestOpen}
        plantedCrop={selectedPlanted}
        cropName={selectedCropMeta?.name}
        onConfirm={handleHarvestSelected}
      />
    </div>
  );
}
