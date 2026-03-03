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
  useCreateUtilityNode,
  useCreateUtilityEdge,
  useUpdateFieldMemo,
} from "@/hooks/use-fields";
import { useFarmId } from "@/hooks/use-farm-id";
import { useFieldEditor, type ClipboardItem } from "@/lib/store/field-editor-store";
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

  const selectMultiple = useFieldEditor((s) => s.selectMultiple);
  const clipboard = useFieldEditor((s) => s.clipboard);
  const setClipboard = useFieldEditor((s) => s.setClipboard);

  const createRegionMut = useCreateRegion(farmId ?? "");
  const assignCropToRegion = useAssignCropToRegion();
  const removePlantedCrop = useRemovePlantedCrop();
  const restorePlantedCrop = useRestorePlantedCrop();
  const deleteFacility = useDeleteFacility();
  const createFacility = useCreateFacility();
  const createUtilityNode = useCreateUtilityNode();
  const createUtilityEdge = useCreateUtilityEdge();
  const updateFieldMemo = useUpdateFieldMemo();

  // Draw rect completion state — stores the newly created region's planted crop ID
  // so the user can optionally assign a crop to it
  const [pendingRegionId, setPendingRegionId] = useState<string | null>(null);
  const [pendingRectInfo, setPendingRectInfo] = useState<{
    xM: number;
    yM: number;
    widthM: number;
    heightM: number;
  } | null>(null);

  // Crop reassignment state
  const [reassignPlantedCropId, setReassignPlantedCropId] = useState<string | null>(null);

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

  const handleSelectAll = useCallback(() => {
    if (!field) return;
    const allIds: string[] = [
      ...field.placements.map((p) => p.id),
      ...field.facilities.map((f) => f.id),
    ];
    selectMultiple(allIds);
  }, [field, selectMultiple]);

  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0 || !field) return;
    const items: ClipboardItem[] = [];
    for (const id of selectedIds) {
      const placement = field.placements.find((p) => p.id === id);
      if (placement) {
        const row = field.plantedCrops.find(
          (pc) => pc.plantedCrop.id === placement.plantedCropId,
        );
        items.push({
          kind: "crop",
          xM: Number(placement.xM),
          yM: Number(placement.yM),
          widthM: Number(placement.widthM),
          heightM: Number(placement.heightM),
          cropId: row?.crop?.id,
          name: row?.crop?.name,
        });
        continue;
      }
      const facility = field.facilities.find((f) => f.id === id);
      if (facility) {
        items.push({
          kind: "facility",
          xM: Number(facility.xM),
          yM: Number(facility.yM),
          widthM: Number(facility.widthM),
          heightM: Number(facility.heightM),
          facilityType: facility.facilityType,
          name: facility.name,
        });
      }
    }
    setClipboard(items);
  }, [selectedIds, field, setClipboard]);

  const handlePaste = useCallback(async () => {
    if (clipboard.length === 0 || !farmId) return;
    const OFFSET_M = 1;
    for (const item of clipboard) {
      if (item.kind === "crop") {
        const result = await createRegionMut.mutateAsync({
          fieldId,
          data: {
            xM: item.xM + OFFSET_M,
            yM: item.yM + OFFSET_M,
            widthM: item.widthM,
            heightM: item.heightM,
          },
        });
        if (item.cropId) {
          await assignCropToRegion.mutateAsync({
            plantedCropId: result.plantedCrop.id,
            cropId: item.cropId,
          });
        }
      } else if (item.kind === "facility") {
        await createFacility.mutateAsync({
          fieldId,
          data: {
            facilityType: item.facilityType ?? "custom",
            name: item.name ?? "設施",
            xM: item.xM + OFFSET_M,
            yM: item.yM + OFFSET_M,
            widthM: item.widthM,
            heightM: item.heightM,
          } as Parameters<typeof createFacility.mutateAsync>[0]["data"],
        });
      }
    }
  }, [clipboard, farmId, fieldId, createRegionMut, assignCropToRegion, createFacility]);

  const handleDuplicate = useCallback(async () => {
    handleCopy();
    // Need to paste from what we just copied — but clipboard is async
    // Copy sets clipboard synchronously via zustand, so we can read it next tick
    const items = useFieldEditor.getState().clipboard;
    if (items.length === 0 || !farmId) return;
    const OFFSET_M = 1;
    for (const item of items) {
      if (item.kind === "crop") {
        const result = await createRegionMut.mutateAsync({
          fieldId,
          data: {
            xM: item.xM + OFFSET_M,
            yM: item.yM + OFFSET_M,
            widthM: item.widthM,
            heightM: item.heightM,
          },
        });
        if (item.cropId) {
          await assignCropToRegion.mutateAsync({
            plantedCropId: result.plantedCrop.id,
            cropId: item.cropId,
          });
        }
      } else if (item.kind === "facility") {
        await createFacility.mutateAsync({
          fieldId,
          data: {
            facilityType: item.facilityType ?? "custom",
            name: item.name ?? "設施",
            xM: item.xM + OFFSET_M,
            yM: item.yM + OFFSET_M,
            widthM: item.widthM,
            heightM: item.heightM,
          } as Parameters<typeof createFacility.mutateAsync>[0]["data"],
        });
      }
    }
  }, [handleCopy, farmId, fieldId, createRegionMut, assignCropToRegion, createFacility]);

  useEditorShortcuts({
    onDeleteSelected: handleDeleteSelected,
    onSelectAll: handleSelectAll,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDuplicate: handleDuplicate,
    fieldDimensions: field
      ? { widthM: Number(field.widthM), heightM: Number(field.heightM) }
      : undefined,
  });

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

  const handleChangeCrop = useCallback(
    (plantedCropId: string) => {
      setReassignPlantedCropId(plantedCropId);
    },
    [],
  );

  const handleReassignCrop = useCallback(
    async (cropId: string) => {
      if (!reassignPlantedCropId) return;
      await assignCropToRegion.mutateAsync({ plantedCropId: reassignPlantedCropId, cropId });
      setReassignPlantedCropId(null);
    },
    [reassignPlantedCropId, assignCropToRegion],
  );

  // --- Zone split ---
  // NOTE: Split is not fully undo-able. The original region deletion can be undone,
  // but the two newly created regions will persist. A full undo would require a
  // composite command that tracks all three operations together.
  const handleSplit = useCallback(
    async (direction: "horizontal" | "vertical") => {
      if (selectedIds.length !== 1 || !field || !farmId) return;
      const id = selectedIds[0];
      const placement = field.placements.find((p) => p.id === id);
      if (!placement) return;

      const pcRow = field.plantedCrops.find(
        (row) => row.plantedCrop.id === placement.plantedCropId,
      );
      const cropId = pcRow?.plantedCrop.cropId ?? undefined;

      const xM = Number(placement.xM);
      const yM = Number(placement.yM);
      const widthM = Number(placement.widthM);
      const heightM = Number(placement.heightM);

      // Remove the original region
      await removePlantedCrop.mutateAsync(placement.plantedCropId);

      // Create two new regions (createRegion handles cropId assignment internally)
      if (direction === "horizontal") {
        const halfH = heightM / 2;
        await createRegionMut.mutateAsync({
          fieldId,
          data: { xM, yM, widthM, heightM: halfH, cropId },
        });
        await createRegionMut.mutateAsync({
          fieldId,
          data: { xM, yM: yM + halfH, widthM, heightM: halfH, cropId },
        });
      } else {
        const halfW = widthM / 2;
        await createRegionMut.mutateAsync({
          fieldId,
          data: { xM, yM, widthM: halfW, heightM, cropId },
        });
        await createRegionMut.mutateAsync({
          fieldId,
          data: { xM: xM + halfW, yM, widthM: halfW, heightM, cropId },
        });
      }

      // Clear selection since the original item is gone
      useFieldEditor.getState().clearSelection();
    },
    [selectedIds, field, farmId, fieldId, removePlantedCrop, createRegionMut],
  );

  const handleSplitHorizontal = useCallback(() => handleSplit("horizontal"), [handleSplit]);
  const handleSplitVertical = useCallback(() => handleSplit("vertical"), [handleSplit]);

  // --- Utility node placement ---
  const handlePlaceUtilityNode = useCallback(
    async (pos: { xM: number; yM: number }) => {
      if (!field) return;
      await createUtilityNode.mutateAsync({
        fieldId: field.id,
        data: {
          kind: "water",
          nodeType: null,
          label: "新節點",
          xM: pos.xM,
          yM: pos.yM,
        },
      });
      setTool("select");
    },
    [field, createUtilityNode, setTool],
  );

  // --- Utility edge connection ---
  const handleConnectUtilityNodes = useCallback(
    async (fromNodeId: string, toNodeId: string) => {
      if (!field) return;
      // Determine kind from the source node
      const fromNode = field.utilityNodes.find((n) => n.id === fromNodeId);
      const kind = fromNode?.kind ?? "water";
      await createUtilityEdge.mutateAsync({
        fieldId: field.id,
        data: { fromNodeId, toNodeId, kind },
      });
      setTool("select");
    },
    [field, createUtilityEdge, setTool],
  );

  // --- Quick-add (double-click on empty canvas) ---
  const handleQuickAdd = useCallback(
    async (pos: { xM: number; yM: number }) => {
      if (!farmId) return;
      const DEFAULT_SIZE = 2;
      const rect = {
        xM: pos.xM - DEFAULT_SIZE / 2,
        yM: pos.yM - DEFAULT_SIZE / 2,
        widthM: DEFAULT_SIZE,
        heightM: DEFAULT_SIZE,
      };
      const result = await createRegionMut.mutateAsync({
        fieldId,
        data: rect,
      });
      setPendingRegionId(result.plantedCrop.id);
      setPendingRectInfo(rect);
    },
    [farmId, fieldId, createRegionMut],
  );

  // --- Memo ---
  const handleMemoChange = useCallback(
    (memo: string) => {
      if (!field) return;
      updateFieldMemo.mutate({ fieldId: field.id, memo });
    },
    [field, updateFieldMemo],
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
            onPlaceUtilityNode={handlePlaceUtilityNode}
            onConnectUtilityNodes={handleConnectUtilityNodes}
            onQuickAdd={handleQuickAdd}
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
          onChangeCrop={handleChangeCrop}
          onSplitHorizontal={handleSplitHorizontal}
          onSplitVertical={handleSplitVertical}
          memo={field.memo}
          onMemoChange={handleMemoChange}
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

      {/* Crop reassignment dialog */}
      {farmId && (
        <PlantCropDialog
          farmId={farmId}
          open={reassignPlantedCropId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setReassignPlantedCropId(null);
            }
          }}
          onSelect={handleReassignCrop}
          rectInfo={null}
        />
      )}
    </div>
  );
}
