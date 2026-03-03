"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Redo2, Undo2 } from "lucide-react";

import {
  useFieldById,
  useCreateRegion,
  useAssignCropToRegion,
  useRemovePlantedCrop,
  useRestorePlantedCrop,
  useDeleteFacility,
  useCreateFacility,
} from "@/hooks/use-fields";
import { useFarmId } from "@/hooks/use-farm-id";
import { useFieldEditor } from "@/lib/store/field-editor-store";
import {
  createDeleteCommand,
  createPlantCropCommand,
} from "@/lib/store/editor-commands";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { EditorCanvas } from "./editor-canvas";
import { EditorToolbar } from "./editor-toolbar";
import { EditorStatusBar } from "./editor-status-bar";
import { PropertyInspector } from "./property-inspector";
import { PlantCropDialog } from "./plant-crop-dialog";
import { useEditorShortcuts } from "./use-editor-shortcuts";

interface EditorLayoutProps {
  fieldId: string;
}

export function EditorLayout({ fieldId }: EditorLayoutProps) {
  const farmId = useFarmId();
  const { data: field, isLoading } = useFieldById(fieldId);
  const setActiveField = useFieldEditor((s) => s.setActiveField);
  const setTool = useFieldEditor((s) => s.setTool);
  const undo = useFieldEditor((s) => s.undo);
  const redo = useFieldEditor((s) => s.redo);
  const canUndo = useFieldEditor((s) => s.canUndo);
  const canRedo = useFieldEditor((s) => s.canRedo);
  const zoom = useFieldEditor((s) => s.zoom);
  const zoomIn = useFieldEditor((s) => s.zoomIn);
  const zoomOut = useFieldEditor((s) => s.zoomOut);
  const selectedIds = useFieldEditor((s) => s.selectedIds);
  const executeCommand = useFieldEditor((s) => s.executeCommand);

  const createRegionMut = useCreateRegion(farmId ?? "");
  const assignCropToRegion = useAssignCropToRegion();
  const removePlantedCrop = useRemovePlantedCrop();
  const restorePlantedCrop = useRestorePlantedCrop();
  const deleteFacility = useDeleteFacility();
  const createFacility = useCreateFacility();

  // Draw rect completion state — stores the newly created region's planted crop ID
  // so the user can optionally assign a crop to it
  const [pendingRegionId, setPendingRegionId] = useState<string | null>(null);
  const [pendingRectInfo, setPendingRectInfo] = useState<{
    xM: number;
    yM: number;
    widthM: number;
    heightM: number;
  } | null>(null);

  useEffect(() => {
    setActiveField(fieldId);
  }, [fieldId, setActiveField]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0 || !field) return;

    // Snapshot facility data before deletion so undo can re-create them
    const facilitySnapshots = new Map<string, {
      facilityType: string;
      name: string;
      xM: number;
      yM: number;
      widthM: number;
      heightM: number;
    }>();
    // Map placement IDs to their plantedCropIds for crops
    const placementToPlantedCropId = new Map<string, string>();

    for (const id of selectedIds) {
      const placement = field.placements.find((p) => p.id === id);
      if (placement) {
        placementToPlantedCropId.set(id, placement.plantedCropId);
        continue;
      }
      const facility = field.facilities.find((f) => f.id === id);
      if (facility) {
        facilitySnapshots.set(id, {
          facilityType: facility.facilityType,
          name: facility.name,
          xM: Number(facility.xM),
          yM: Number(facility.yM),
          widthM: Number(facility.widthM),
          heightM: Number(facility.heightM),
        });
      }
    }

    const cmd = createDeleteCommand({
      ids: [...selectedIds],
      async deleteFn(id) {
        const plantedCropId = placementToPlantedCropId.get(id);
        if (plantedCropId) {
          await removePlantedCrop.mutateAsync(plantedCropId);
          return;
        }
        if (facilitySnapshots.has(id)) {
          await deleteFacility.mutateAsync({ id, fieldId: field.id });
        }
      },
      async restoreFn(id) {
        const plantedCropId = placementToPlantedCropId.get(id);
        if (plantedCropId) {
          await restorePlantedCrop.mutateAsync(plantedCropId);
          return;
        }
        const snapshot = facilitySnapshots.get(id);
        if (snapshot) {
          await createFacility.mutateAsync({
            fieldId: field.id,
            data: snapshot as Parameters<typeof createFacility.mutateAsync>[0]["data"],
          });
        }
      },
    });
    void executeCommand(cmd);
  }, [selectedIds, field, removePlantedCrop, restorePlantedCrop, deleteFacility, createFacility, executeCommand]);

  useEditorShortcuts({ onDeleteSelected: handleDeleteSelected });

  const handleDrawRectComplete = useCallback(
    async (rect: { xM: number; yM: number; widthM: number; heightM: number }) => {
      const rectData = { ...rect };
      let createdPlantedCropId: string | null = null;

      const cmd = createPlantCropCommand({
        async plantFn() {
          const result = await createRegionMut.mutateAsync({
            fieldId,
            data: {
              xM: rectData.xM,
              yM: rectData.yM,
              widthM: rectData.widthM,
              heightM: rectData.heightM,
            },
          });
          createdPlantedCropId = result.plantedCrop.id;
          return { plantedCropId: result.plantedCrop.id };
        },
        async removeFn(plantedCropId) {
          await removePlantedCrop.mutateAsync(plantedCropId);
        },
        async restoreFn(plantedCropId) {
          await restorePlantedCrop.mutateAsync(plantedCropId);
        },
      });

      await executeCommand(cmd);

      // Show optional crop assignment dialog
      if (createdPlantedCropId) {
        setPendingRegionId(createdPlantedCropId);
        setPendingRectInfo(rect);
      }
      setTool("select");
    },
    [createRegionMut, removePlantedCrop, restorePlantedCrop, fieldId, setTool, executeCommand],
  );

  const handleAssignCrop = useCallback(
    async (cropId: string) => {
      if (!pendingRegionId) return;
      await assignCropToRegion.mutateAsync({ plantedCropId: pendingRegionId, cropId });
      setPendingRegionId(null);
      setPendingRectInfo(null);
    },
    [pendingRegionId, assignCropToRegion],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!field) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">找不到此田地</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/fields">返回田地列表</Link>
        </Button>
      </div>
    );
  }

  const growingCount = field.plantedCrops.filter(
    (pc) => pc.plantedCrop.status === "growing",
  ).length;
  const harvestedCount = field.plantedCrops.filter(
    (pc) => pc.plantedCrop.status === "harvested",
  ).length;
  const facilityCount = field.facilities.length;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex h-10 items-center gap-2 border-b bg-background px-2">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link href="/fields">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <span className="text-sm font-medium">{field.name}</span>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!canUndo()}
                onClick={() => undo()}
              >
                <Undo2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>復原 (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!canRedo()}
                onClick={() => redo()}
              >
                <Redo2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做 (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Zoom */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-xs"
            onClick={zoomOut}
          >
            &minus;
          </Button>
          <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-xs"
            onClick={zoomIn}
          >
            +
          </Button>
        </div>
      </div>

      {/* Main area: toolbar + canvas + inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: toolbar */}
        <EditorToolbar />

        {/* Center: canvas */}
        <div className="min-w-0 flex-1 overflow-hidden bg-muted/30">
          <EditorCanvas
            field={field}
            onDrawRectComplete={handleDrawRectComplete}
          />
        </div>

        {/* Right: property inspector */}
        <PropertyInspector
          field={field}
          fieldName={field.name}
          fieldWidthM={Number(field.widthM)}
          fieldHeightM={Number(field.heightM)}
          growingCount={growingCount}
          harvestedCount={harvestedCount}
          facilityCount={facilityCount}
          onDeleteSelected={handleDeleteSelected}
        />
      </div>

      {/* Bottom: status bar */}
      <EditorStatusBar
        fieldName={field.name}
        fieldWidthM={Number(field.widthM)}
        fieldHeightM={Number(field.heightM)}
      />

      {/* Crop assignment dialog (opens after draw_rect creates a region) */}
      {farmId && (
        <PlantCropDialog
          farmId={farmId}
          open={pendingRegionId !== null}
          onOpenChange={(open) => {
            if (!open) {
              // User dismissed without selecting — region stays unassigned
              setPendingRegionId(null);
              setPendingRectInfo(null);
            }
          }}
          onSelect={handleAssignCrop}
          rectInfo={pendingRectInfo}
        />
      )}
    </div>
  );
}
