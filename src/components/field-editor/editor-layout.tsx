"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Redo2, Undo2 } from "lucide-react";

import {
  useFieldById,
  useCreateRegion,
  useAssignCropToRegion,
  useHarvestCrop,
  useRemovePlantedCrop,
  useRestorePlantedCrop,
  useDeleteFacility,
  useCreateFacility,
  useCreateUtilityNode,
  useCreateUtilityEdge,
  useUpdateFieldMemo,
  useUpdateCropPlacement,
  useUpdateFacility,
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
import { EditorMinimap } from "./editor-minimap";
import { EditorToolbar } from "./editor-toolbar";
import { EditorStatusBar } from "./editor-status-bar";
import { PropertyInspector, type AlignType } from "./property-inspector";
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

  const pan = useFieldEditor((s) => s.pan);
  const setPan = useFieldEditor((s) => s.setPan);
  const zoomToSelection = useFieldEditor((s) => s.zoomToSelection);

  const createRegionMut = useCreateRegion(farmId ?? "");
  const assignCropToRegion = useAssignCropToRegion();
  const harvestCropMut = useHarvestCrop();
  const removePlantedCrop = useRemovePlantedCrop();
  const restorePlantedCrop = useRestorePlantedCrop();
  const deleteFacility = useDeleteFacility();
  const createFacility = useCreateFacility();
  const createUtilityNode = useCreateUtilityNode();
  const createUtilityEdge = useCreateUtilityEdge();
  const updateFieldMemo = useUpdateFieldMemo();
  const updatePlacement = useUpdateCropPlacement();
  const updateFacilityMut = useUpdateFacility();

  // Canvas container ref + size for minimap viewport calculation
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasContainerSize, setCanvasContainerSize] = useState({ width: 800, height: 600 });

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

  // --- Zoom to selection (Ctrl+2) ---
  const handleZoomToSelection = useCallback(() => {
    if (selectedIds.length === 0 || !field) return;
    const bounds: { xM: number; yM: number; widthM: number; heightM: number }[] = [];
    for (const id of selectedIds) {
      const placement = field.placements.find((p) => p.id === id);
      if (placement) {
        bounds.push({
          xM: Number(placement.xM),
          yM: Number(placement.yM),
          widthM: Number(placement.widthM),
          heightM: Number(placement.heightM),
        });
        continue;
      }
      const facility = field.facilities.find((f) => f.id === id);
      if (facility) {
        bounds.push({
          xM: Number(facility.xM),
          yM: Number(facility.yM),
          widthM: Number(facility.widthM),
          heightM: Number(facility.heightM),
        });
      }
    }
    if (bounds.length > 0) {
      zoomToSelection(bounds, canvasContainerSize.width, canvasContainerSize.height);
    }
  }, [selectedIds, field, zoomToSelection, canvasContainerSize]);

  // --- Multi-select alignment ---
  // TODO: wrap alignment mutations in an undo command for future undo support
  const handleAlign = useCallback(
    (type: AlignType) => {
      if (selectedIds.length < 2 || !field) return;

      // Gather bounds for all selected items
      const items: { id: string; kind: 'crop' | 'facility'; xM: number; yM: number; widthM: number; heightM: number; plantedCropId?: string }[] = [];
      for (const id of selectedIds) {
        const placement = field.placements.find((p) => p.id === id);
        if (placement) {
          items.push({
            id,
            kind: 'crop',
            xM: Number(placement.xM),
            yM: Number(placement.yM),
            widthM: Number(placement.widthM),
            heightM: Number(placement.heightM),
            plantedCropId: placement.plantedCropId,
          });
          continue;
        }
        const facility = field.facilities.find((f) => f.id === id);
        if (facility) {
          items.push({
            id,
            kind: 'facility',
            xM: Number(facility.xM),
            yM: Number(facility.yM),
            widthM: Number(facility.widthM),
            heightM: Number(facility.heightM),
          });
        }
      }
      if (items.length < 2) return;

      // Compute bounding box
      const minX = Math.min(...items.map((i) => i.xM));
      const minY = Math.min(...items.map((i) => i.yM));
      const maxX = Math.max(...items.map((i) => i.xM + i.widthM));
      const maxY = Math.max(...items.map((i) => i.yM + i.heightM));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      for (const item of items) {
        let newX = item.xM;
        let newY = item.yM;

        switch (type) {
          case 'left':
            newX = minX;
            break;
          case 'centerH':
            newX = centerX - item.widthM / 2;
            break;
          case 'right':
            newX = maxX - item.widthM;
            break;
          case 'top':
            newY = minY;
            break;
          case 'centerV':
            newY = centerY - item.heightM / 2;
            break;
          case 'bottom':
            newY = maxY - item.heightM;
            break;
        }

        if (newX === item.xM && newY === item.yM) continue;

        if (item.kind === 'crop') {
          updatePlacement.mutate({
            placementId: item.id,
            fieldId: field.id,
            data: { xM: newX, yM: newY },
          });
        } else {
          updateFacilityMut.mutate({
            id: item.id,
            fieldId: field.id,
            data: { xM: newX, yM: newY },
          });
        }
      }
    },
    [selectedIds, field, updatePlacement, updateFacilityMut],
  );

  useEditorShortcuts({
    onDeleteSelected: handleDeleteSelected,
    onSelectAll: handleSelectAll,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDuplicate: handleDuplicate,
    onZoomToSelection: handleZoomToSelection,
    fieldDimensions: field
      ? { widthM: Number(field.widthM), heightM: Number(field.heightM) }
      : undefined,
    viewportSize: canvasContainerSize,
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

  // --- Zone merge ---
  const handleMergeZones = useCallback(async () => {
    if (selectedIds.length !== 2 || !field || !farmId) return;

    // Find both selected items from placements
    const items: { xM: number; yM: number; widthM: number; heightM: number; plantedCropId: string }[] = [];
    for (const id of selectedIds) {
      const placement = field.placements.find((p) => p.id === id);
      if (placement) {
        items.push({
          xM: Number(placement.xM),
          yM: Number(placement.yM),
          widthM: Number(placement.widthM),
          heightM: Number(placement.heightM),
          plantedCropId: placement.plantedCropId,
        });
      }
    }
    if (items.length !== 2) return;

    // Compute bounding box
    const minX = Math.min(items[0].xM, items[1].xM);
    const minY = Math.min(items[0].yM, items[1].yM);
    const maxX = Math.max(items[0].xM + items[0].widthM, items[1].xM + items[1].widthM);
    const maxY = Math.max(items[0].yM + items[0].heightM, items[1].yM + items[1].heightM);

    // Delete both original regions
    await removePlantedCrop.mutateAsync(items[0].plantedCropId);
    await removePlantedCrop.mutateAsync(items[1].plantedCropId);

    // Create one new merged region (unassigned)
    await createRegionMut.mutateAsync({
      fieldId,
      data: {
        xM: minX,
        yM: minY,
        widthM: maxX - minX,
        heightM: maxY - minY,
      },
    });

    // Clear selection
    useFieldEditor.getState().clearSelection();
  }, [selectedIds, field, farmId, fieldId, removePlantedCrop, createRegionMut]);

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

  // --- Mark as harvested ---
  const handleMarkHarvested = useCallback(
    (plantedCropId: string) => {
      harvestCropMut.mutate(plantedCropId);
    },
    [harvestCropMut],
  );

  // --- Canvas container size tracking for minimap ---
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Minimap items ---
  const minimapItems = useMemo(() => {
    if (!field) return [];
    const items: Array<{ xM: number; yM: number; widthM: number; heightM: number; color: string; kind: string }> = [];
    for (const row of field.plantedCrops) {
      const placement = field.placements.find((p) => p.plantedCropId === row.plantedCrop.id);
      if (!placement) continue;
      items.push({
        xM: Number(placement.xM),
        yM: Number(placement.yM),
        widthM: Number(placement.widthM),
        heightM: Number(placement.heightM),
        color: row.crop?.color ?? "#d1d5db",
        kind: "crop",
      });
    }
    for (const fac of field.facilities) {
      items.push({
        xM: Number(fac.xM),
        yM: Number(fac.yM),
        widthM: Number(fac.widthM),
        heightM: Number(fac.heightM),
        color: "#94a3b8",
        kind: "facility",
      });
    }
    return items;
  }, [field]);

  // --- Minimap navigation ---
  const PIXELS_PER_METER = 100;
  const handleMinimapNavigate = useCallback(
    (xM: number, yM: number) => {
      const newPanX = -(xM * PIXELS_PER_METER * zoom - canvasContainerSize.width / 2);
      const newPanY = -(yM * PIXELS_PER_METER * zoom - canvasContainerSize.height / 2);
      setPan(newPanX, newPanY);
    },
    [zoom, canvasContainerSize, setPan],
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
        <div ref={canvasContainerRef} className="relative min-w-0 flex-1 overflow-hidden bg-muted/30">
          <EditorCanvas
            field={field}
            onDrawRectComplete={handleDrawRectComplete}
            onPlaceUtilityNode={handlePlaceUtilityNode}
            onConnectUtilityNodes={handleConnectUtilityNodes}
            onQuickAdd={handleQuickAdd}
          />
          <EditorMinimap
            fieldWidthM={Number(field.widthM)}
            fieldHeightM={Number(field.heightM)}
            items={minimapItems}
            zoom={zoom}
            pan={pan}
            viewportWidth={canvasContainerSize.width}
            viewportHeight={canvasContainerSize.height}
            onNavigate={handleMinimapNavigate}
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
          onMarkHarvested={handleMarkHarvested}
          onSplitHorizontal={handleSplitHorizontal}
          onSplitVertical={handleSplitVertical}
          onMergeZones={handleMergeZones}
          onAlign={handleAlign}
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
