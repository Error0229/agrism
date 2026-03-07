"use client";

import React, { useState, useCallback } from "react";
import { SeasonBoard, type CellContext } from "./season-board";
import { PlanCropDialog } from "./plan-crop-dialog";
import {
  usePlannedPlantingsByField,
  useFieldOccupancy,
} from "@/hooks/use-planned-plantings";
import type { Id } from "../../../convex/_generated/dataModel";

// --- Types ---

type PlantedCropInfo = {
  _id: string;
  cropId?: string;
  crop?: { _id: string; name: string; color?: string; emoji?: string } | null;
  status: string;
  xM: number;
  yM: number;
  widthM?: number;
  heightM?: number;
};

interface SeasonPlannerPanelProps {
  fieldId: Id<"fields">;
  farmId: Id<"farms">;
  plantedCrops: PlantedCropInfo[];
}

// --- Component ---

export function SeasonPlannerPanel({
  fieldId,
  farmId,
  plantedCrops,
}: SeasonPlannerPanelProps) {
  const occupancy = useFieldOccupancy(fieldId);
  const plannedPlantings = usePlannedPlantingsByField(fieldId);

  // Dialog state
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planRegionId, setPlanRegionId] = useState<string | undefined>();
  const [planCellContext, setPlanCellContext] = useState<CellContext | undefined>();
  const [predecessorPlantedCropId, setPredecessorPlantedCropId] = useState<string | undefined>();
  const [currentOccupant, setCurrentOccupant] = useState<{ cropName?: string; estimatedEnd?: string } | undefined>();
  const [editingPlan, setEditingPlan] = useState<
    | {
        _id: Id<"plannedPlantings">;
        cropId?: Id<"crops">;
        cropName?: string;
        startWindowEarliest?: string;
        startWindowLatest?: string;
        endWindowEarliest?: string;
        endWindowLatest?: string;
        notes?: string;
        planningState: string;
      }
    | undefined
  >();

  const handlePlanCrop = useCallback(
    (_regionId?: string, _plantedCropId?: string, _cellContext?: CellContext, _predecessorId?: string) => {
      setPlanRegionId(_plantedCropId);
      setPlanCellContext(_cellContext);
      setPredecessorPlantedCropId(_predecessorId);
      setEditingPlan(undefined);

      // Find the current occupant info for predecessor display
      if (_predecessorId) {
        const pc = plantedCrops.find((p) => p._id === _predecessorId);
        if (pc?.crop) {
          // Compute estimated end from occupancy data
          const occ = occupancy?.find((o) => o.sourceId === _predecessorId && o.type === "current");
          let estimatedEnd: string | undefined;
          if (occ?.endWindow.earliest) {
            const d = new Date(occ.endWindow.earliest);
            const month = d.getMonth() + 1;
            const day = d.getDate();
            const jun = day <= 10 ? "上旬" : day <= 20 ? "中旬" : "下旬";
            estimatedEnd = `${d.getFullYear()}年${month}月${jun}`;
          }
          setCurrentOccupant({ cropName: pc.crop.name, estimatedEnd });
        } else {
          setCurrentOccupant(undefined);
        }
      } else {
        setCurrentOccupant(undefined);
      }

      setPlanDialogOpen(true);
    },
    [plantedCrops, occupancy],
  );

  const handleEditPlanning = useCallback(
    (sourceId: string) => {
      if (!plannedPlantings) return;
      const plan = plannedPlantings.find((p) => p._id === sourceId);
      if (!plan) return;
      setEditingPlan({
        _id: plan._id,
        cropId: plan.cropId ?? undefined,
        cropName: plan.cropName ?? undefined,
        startWindowEarliest: plan.startWindowEarliest ?? undefined,
        startWindowLatest: plan.startWindowLatest ?? undefined,
        endWindowEarliest: plan.endWindowEarliest ?? undefined,
        endWindowLatest: plan.endWindowLatest ?? undefined,
        notes: plan.notes ?? undefined,
        planningState: plan.planningState,
      });
      setPlanDialogOpen(true);
    },
    [plannedPlantings],
  );

  return (
    <div className="flex h-full flex-col">
      <SeasonBoard
        plantedCrops={plantedCrops}
        occupancy={occupancy}
        onPlanCrop={handlePlanCrop}
        onEditPlanning={handleEditPlanning}
      />

      <PlanCropDialog
        farmId={farmId}
        fieldId={fieldId}
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        regionId={planRegionId}
        existingPlan={editingPlan}
        initialCellContext={planCellContext}
        predecessorPlantedCropId={predecessorPlantedCropId as Id<"plantedCrops"> | undefined}
        currentOccupant={currentOccupant}
      />
    </div>
  );
}
