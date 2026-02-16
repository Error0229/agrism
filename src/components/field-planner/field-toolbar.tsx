"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { cropsDatabase, getCropById } from "@/lib/data/crops-database";
import { generateTasksForPlantedCrop } from "@/lib/utils/calendar-helpers";
import type { Field } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface FieldToolbarProps {
  field: Field;
  selectedCropId: string | null;
  onSelectCrop: (id: string | null) => void;
}

export function FieldToolbar({ field, selectedCropId, onSelectCrop }: FieldToolbarProps) {
  const { addPlantedCrop, removePlantedCrop } = useFields();
  const { addTasks, removeTasksByPlantedCrop } = useTasks();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCrops = cropsDatabase.filter((c) =>
    c.name.includes(search)
  );

  const handleAddCrop = (cropId: string) => {
    const crop = getCropById(cropId);
    if (!crop) return;
    const plantedCrop = addPlantedCrop(field.id, {
      cropId,
      fieldId: field.id,
      plantedDate: new Date().toISOString(),
      status: "growing",
      position: { x: 50 + Math.random() * 200, y: 50 + Math.random() * 200 },
      size: { width: crop.spacing.plant, height: crop.spacing.row },
    });
    const tasks = generateTasksForPlantedCrop(crop, plantedCrop);
    addTasks(tasks);
    setPopoverOpen(false);
    setSearch("");
  };

  const handleDeleteSelected = () => {
    if (!selectedCropId) return;
    removeTasksByPlantedCrop(selectedCropId);
    removePlantedCrop(field.id, selectedCropId);
    onSelectCrop(null);
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
                  className="flex items-center gap-2 w-full p-2 text-sm rounded hover:bg-accent transition-colors text-left"
                >
                  <span className="text-lg">{crop.emoji}</span>
                  <span>{crop.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedCropId && (
        <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
          <Trash2 className="size-4 mr-1" />
          刪除選取
        </Button>
      )}
    </div>
  );
}
