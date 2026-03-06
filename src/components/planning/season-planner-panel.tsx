"use client";

import React, { useState, useCallback } from "react";
import { SeasonBoard } from "./season-board";
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
  widthM: number;
  heightM: number;
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
  const [editingPlan, setEditingPlan] = useState<
    | {
        _id: Id<"plannedPlantings">;
        cropId?: Id<"crops">;
        cropName?: string;
        startWindowEarliest?: string;
        startWindowLatest?: string;
        endWindowEarliest?: string;
        endWindowLatest?: string;
        confidence: "high" | "medium" | "low";
        notes?: string;
        planningState: string;
      }
    | undefined
  >();

  const handlePlanCrop = useCallback(
    (_regionId?: string, _plantedCropId?: string) => {
      setPlanRegionId(_plantedCropId);
      setEditingPlan(undefined);
      setPlanDialogOpen(true);
    },
    [],
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
        confidence: plan.confidence,
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
      />
    </div>
  );
}
