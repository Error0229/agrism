"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Copy, CopyPlus, ImagePlus, Loader2, PanelBottomOpen, Redo2, Replace, Scissors, Trash2, Undo2, Wheat } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useFieldById,
  useCreateRegion,
  useAssignCropToRegion,
  useHarvestCrop,
  useRemovePlantedCrop,
  useRestorePlantedCrop,
  useDeletePlantedCropWithPlacement,
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
import { deriveFacilityType } from "@/lib/utils/facility-helpers";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { EditorCanvas } from "./editor-canvas";
import { EditorMinimap } from "./editor-minimap";
import { EditorToolbar } from "./editor-toolbar";
import { EditorStatusBar } from "./editor-status-bar";
import { EditorTimelineBar } from "./editor-timeline-bar";
import { PropertyInspector, type AlignType } from "./property-inspector";
import { PlantCropDialog } from "./plant-crop-dialog";
import { FieldManageMenu } from "./field-manage-menu";
import { useEditorShortcuts } from "./use-editor-shortcuts";

import type { Id } from "../../../convex/_generated/dataModel";

interface EditorLayoutProps {
  fieldId: string;
}

export function EditorLayout({ fieldId }: EditorLayoutProps) {
  const farmId = useFarmId();
  const isMobile = useIsMobile();
  const field = useFieldById(fieldId as Id<"fields">);
  const isLoading = field === undefined;
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

  const activeTool = useFieldEditor((s) => s.activeTool);
  const utilityNodeType = useFieldEditor((s) => s.utilityNodeType);
  const setUtilityNodeType = useFieldEditor((s) => s.setUtilityNodeType);

  const initFromStorage = useFieldEditor((s) => s.initFromStorage);

  const selectMultiple = useFieldEditor((s) => s.selectMultiple);
  const clipboard = useFieldEditor((s) => s.clipboard);
  const setClipboard = useFieldEditor((s) => s.setClipboard);

  const pan = useFieldEditor((s) => s.pan);
  const setPan = useFieldEditor((s) => s.setPan);
  const zoomToSelection = useFieldEditor((s) => s.zoomToSelection);
  const setBackgroundImage = useFieldEditor((s) => s.setBackgroundImage);
  const timelineMode = useFieldEditor((s) => s.timelineMode);
  const enterTimeline = useFieldEditor((s) => s.enterTimeline);
  const inspectorOpen = useFieldEditor((s) => s.inspectorOpen);
  const toggleInspector = useFieldEditor((s) => s.toggleInspector);

  const createRegionMut = useCreateRegion();
  const assignCropToRegion = useAssignCropToRegion();
  const harvestCropMut = useHarvestCrop();
  const removePlantedCrop = useRemovePlantedCrop();
  const restorePlantedCrop = useRestorePlantedCrop();
  const deletePlantedCropWithPlacement = useDeletePlantedCropWithPlacement();
  const deleteFacility = useDeleteFacility();
  const createFacility = useCreateFacility();
  const createUtilityNode = useCreateUtilityNode();
  const createUtilityEdge = useCreateUtilityEdge();
  const updateFieldMemo = useUpdateFieldMemo();
  const updatePlacement = useUpdateCropPlacement();
  const updateFacilityMut = useUpdateFacility();

  // Map import file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportMap = () => fileInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBackgroundImage(fieldId, reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset for re-upload
  };

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

  // Context menu state (rendered as HTML overlay in layout, triggered from canvas)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId: string;
    itemKind: "crop" | "facility";
    hasActiveCrop: boolean;
    status: string;
  } | null>(null);

  useEffect(() => {
    setActiveField(fieldId);
  }, [fieldId, setActiveField]);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Close context menu on any click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

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
    // Map plantedCrop IDs for crops (in Convex, placements are inlined into plantedCrops)
    const cropIds = new Set<string>();

    for (const id of selectedIds) {
      const pc = field.plantedCrops.find((p) => p._id === id);
      if (pc) {
        cropIds.add(id);
        continue;
      }
      const facility = field.facilities.find((f) => f._id === id);
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
        if (cropIds.has(id)) {
          await removePlantedCrop({ plantedCropId: id as Id<"plantedCrops"> });
          return;
        }
        if (facilitySnapshots.has(id)) {
          await deleteFacility({ facilityId: id as Id<"facilities"> });
        }
      },
      async restoreFn(id) {
        if (cropIds.has(id)) {
          await restorePlantedCrop({ plantedCropId: id as Id<"plantedCrops"> });
          return;
        }
        const snapshot = facilitySnapshots.get(id);
        if (snapshot) {
          await createFacility({
            fieldId: field._id,
            ...snapshot,
          });
        }
      },
    });
    void executeCommand(cmd);
  }, [selectedIds, field, removePlantedCrop, restorePlantedCrop, deleteFacility, createFacility, executeCommand]);

  const handleSelectAll = useCallback(() => {
    if (!field) return;
    const allIds: string[] = [
      ...field.plantedCrops.map((p) => p._id),
      ...field.facilities.map((f) => f._id),
    ];
    selectMultiple(allIds);
  }, [field, selectMultiple]);

  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0 || !field) return;
    const items: ClipboardItem[] = [];
    for (const id of selectedIds) {
      const pc = field.plantedCrops.find((p) => p._id === id);
      if (pc) {
        items.push({
          kind: "crop",
          xM: Number(pc.xM),
          yM: Number(pc.yM),
          widthM: Number(pc.widthM),
          heightM: Number(pc.heightM),
          cropId: pc.crop?._id,
          name: pc.crop?.name,
        });
        continue;
      }
      const facility = field.facilities.find((f) => f._id === id);
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
    if (clipboard.length === 0 || !farmId || !field) return;
    const OFFSET_M = 1;
    for (const item of clipboard) {
      if (item.kind === "crop") {
        const plantedCropId = await createRegionMut({
          fieldId: field._id,
          xM: item.xM + OFFSET_M,
          yM: item.yM + OFFSET_M,
          widthM: item.widthM,
          heightM: item.heightM,
        });
        if (item.cropId) {
          await assignCropToRegion({
            plantedCropId,
            cropId: item.cropId as Id<"crops">,
          });
        }
      } else if (item.kind === "facility") {
        const name = item.name ?? "設施";
        await createFacility({
          fieldId: field._id,
          facilityType: item.facilityType ?? deriveFacilityType(name),
          name,
          xM: item.xM + OFFSET_M,
          yM: item.yM + OFFSET_M,
          widthM: item.widthM,
          heightM: item.heightM,
        });
      }
    }
  }, [clipboard, farmId, field, createRegionMut, assignCropToRegion, createFacility]);

  const handleDuplicate = useCallback(async () => {
    handleCopy();
    // Need to paste from what we just copied — but clipboard is async
    // Copy sets clipboard synchronously via zustand, so we can read it next tick
    const items = useFieldEditor.getState().clipboard;
    if (items.length === 0 || !farmId || !field) return;
    const OFFSET_M = 1;
    for (const item of items) {
      if (item.kind === "crop") {
        const plantedCropId = await createRegionMut({
          fieldId: field._id,
          xM: item.xM + OFFSET_M,
          yM: item.yM + OFFSET_M,
          widthM: item.widthM,
          heightM: item.heightM,
        });
        if (item.cropId) {
          await assignCropToRegion({
            plantedCropId,
            cropId: item.cropId as Id<"crops">,
          });
        }
      } else if (item.kind === "facility") {
        const dupName = item.name ?? "設施";
        await createFacility({
          fieldId: field._id,
          facilityType: item.facilityType ?? deriveFacilityType(dupName),
          name: dupName,
          xM: item.xM + OFFSET_M,
          yM: item.yM + OFFSET_M,
          widthM: item.widthM,
          heightM: item.heightM,
        });
      }
    }
  }, [handleCopy, farmId, field, createRegionMut, assignCropToRegion, createFacility]);

  // --- Zoom to selection (Ctrl+2) ---
  const handleZoomToSelection = useCallback(() => {
    if (selectedIds.length === 0 || !field) return;
    const bounds: { xM: number; yM: number; widthM: number; heightM: number }[] = [];
    for (const id of selectedIds) {
      const pc = field.plantedCrops.find((p) => p._id === id);
      if (pc) {
        bounds.push({
          xM: Number(pc.xM),
          yM: Number(pc.yM),
          widthM: Number(pc.widthM),
          heightM: Number(pc.heightM),
        });
        continue;
      }
      const facility = field.facilities.find((f) => f._id === id);
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
  const handleAlign = useCallback(
    (type: AlignType) => {
      if (selectedIds.length < 2 || !field) return;

      // Gather bounds for all selected items
      const items: { id: string; kind: 'crop' | 'facility'; xM: number; yM: number; widthM: number; heightM: number }[] = [];
      for (const id of selectedIds) {
        const pc = field.plantedCrops.find((p) => p._id === id);
        if (pc) {
          items.push({
            id,
            kind: 'crop',
            xM: Number(pc.xM),
            yM: Number(pc.yM),
            widthM: Number(pc.widthM),
            heightM: Number(pc.heightM),
          });
          continue;
        }
        const facility = field.facilities.find((f) => f._id === id);
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
          updatePlacement({
            plantedCropId: item.id as Id<"plantedCrops">,
            xM: newX,
            yM: newY,
          });
        } else {
          updateFacilityMut({
            facilityId: item.id as Id<"facilities">,
            xM: newX,
            yM: newY,
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
      if (!field) return;
      const rectData = { ...rect };
      let createdPlantedCropId: string | null = null;

      const cmd = createPlantCropCommand({
        async plantFn() {
          const plantedCropId = await createRegionMut({
            fieldId: field._id,
            xM: rectData.xM,
            yM: rectData.yM,
            widthM: rectData.widthM,
            heightM: rectData.heightM,
          });
          createdPlantedCropId = plantedCropId;
          return { plantedCropId };
        },
        async removeFn(plantedCropId) {
          await removePlantedCrop({ plantedCropId: plantedCropId as Id<"plantedCrops"> });
        },
        async restoreFn(plantedCropId) {
          await restorePlantedCrop({ plantedCropId: plantedCropId as Id<"plantedCrops"> });
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
    [field, createRegionMut, removePlantedCrop, restorePlantedCrop, setTool, executeCommand],
  );

  const handleDrawPolygonComplete = useCallback(
    async (data: { xM: number; yM: number; widthM: number; heightM: number; shapePoints: { x: number; y: number }[] }) => {
      if (!field) return;
      const polyData = { ...data };
      let createdPlantedCropId: string | null = null;

      const cmd = createPlantCropCommand({
        async plantFn() {
          const plantedCropId = await createRegionMut({
            fieldId: field._id,
            xM: polyData.xM,
            yM: polyData.yM,
            widthM: polyData.widthM,
            heightM: polyData.heightM,
            shapePoints: polyData.shapePoints,
          });
          createdPlantedCropId = plantedCropId;
          return { plantedCropId };
        },
        async removeFn(plantedCropId) {
          await removePlantedCrop({ plantedCropId: plantedCropId as Id<"plantedCrops"> });
        },
        async restoreFn(plantedCropId) {
          await restorePlantedCrop({ plantedCropId: plantedCropId as Id<"plantedCrops"> });
        },
      });

      await executeCommand(cmd);

      if (createdPlantedCropId) {
        setPendingRegionId(createdPlantedCropId);
        setPendingRectInfo({ xM: data.xM, yM: data.yM, widthM: data.widthM, heightM: data.heightM });
      }
      setTool("select");
    },
    [field, createRegionMut, removePlantedCrop, restorePlantedCrop, setTool, executeCommand],
  );

  const handleAssignCrop = useCallback(
    async (cropId: string) => {
      if (!pendingRegionId) return;
      await assignCropToRegion({ plantedCropId: pendingRegionId as Id<"plantedCrops">, cropId: cropId as Id<"crops"> });
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
      await assignCropToRegion({ plantedCropId: reassignPlantedCropId as Id<"plantedCrops">, cropId: cropId as Id<"crops"> });
      setReassignPlantedCropId(null);
    },
    [reassignPlantedCropId, assignCropToRegion],
  );

  // --- Zone split ---
  const handleSplit = useCallback(
    async (direction: "horizontal" | "vertical") => {
      if (selectedIds.length !== 1 || !field || !farmId) return;
      const id = selectedIds[0];
      const pc = field.plantedCrops.find((p) => p._id === id);
      if (!pc) return;

      const cropId = pc.cropId ?? undefined;

      const xM = Number(pc.xM);
      const yM = Number(pc.yM);
      const widthM = Number(pc.widthM);
      const heightM = Number(pc.heightM);

      // Remove the original region
      await removePlantedCrop({ plantedCropId: pc._id });

      // Create two new regions
      if (direction === "horizontal") {
        const halfH = heightM / 2;
        await createRegionMut({
          fieldId: field._id,
          xM, yM, widthM, heightM: halfH, cropId,
        });
        await createRegionMut({
          fieldId: field._id,
          xM, yM: yM + halfH, widthM, heightM: halfH, cropId,
        });
      } else {
        const halfW = widthM / 2;
        await createRegionMut({
          fieldId: field._id,
          xM, yM, widthM: halfW, heightM, cropId,
        });
        await createRegionMut({
          fieldId: field._id,
          xM: xM + halfW, yM, widthM: halfW, heightM, cropId,
        });
      }

      // Clear selection since the original item is gone
      useFieldEditor.getState().clearSelection();
    },
    [selectedIds, field, farmId, removePlantedCrop, createRegionMut],
  );

  const handleSplitHorizontal = useCallback(() => handleSplit("horizontal"), [handleSplit]);
  const handleSplitVertical = useCallback(() => handleSplit("vertical"), [handleSplit]);

  // --- Zone merge ---
  const handleMergeZones = useCallback(async () => {
    if (selectedIds.length !== 2 || !field || !farmId) return;

    // Find both selected items from plantedCrops
    const items: { xM: number; yM: number; widthM: number; heightM: number; _id: Id<"plantedCrops"> }[] = [];
    for (const id of selectedIds) {
      const pc = field.plantedCrops.find((p) => p._id === id);
      if (pc) {
        items.push({
          xM: Number(pc.xM),
          yM: Number(pc.yM),
          widthM: Number(pc.widthM),
          heightM: Number(pc.heightM),
          _id: pc._id,
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
    await removePlantedCrop({ plantedCropId: items[0]._id });
    await removePlantedCrop({ plantedCropId: items[1]._id });

    // Create one new merged region (unassigned)
    await createRegionMut({
      fieldId: field._id,
      xM: minX,
      yM: minY,
      widthM: maxX - minX,
      heightM: maxY - minY,
    });

    // Clear selection
    useFieldEditor.getState().clearSelection();
  }, [selectedIds, field, farmId, removePlantedCrop, createRegionMut]);

  // --- Utility node placement ---
  const handlePlaceUtilityNode = useCallback(
    async (pos: { xM: number; yM: number }) => {
      if (!field) return;
      const nodeType = useFieldEditor.getState().utilityNodeType;
      // Derive kind from node type
      const waterTypes = ["pump", "tank", "valve", "outlet", "junction"];
      const kind = waterTypes.includes(nodeType) ? "water" as const : "electric" as const;
      // Use the node type label as default label
      const NODE_TYPE_LABELS: Record<string, string> = {
        pump: '水泵', tank: '水塔', valve: '閥門', outlet: '出水口',
        junction: '接頭', panel: '配電箱', switch: '開關',
      };
      const label = NODE_TYPE_LABELS[nodeType] ?? "新節點";
      await createUtilityNode({
        fieldId: field._id,
        kind,
        nodeType,
        label,
        xM: pos.xM,
        yM: pos.yM,
      });
    },
    [field, createUtilityNode],
  );

  // --- Utility edge connection ---
  const handleConnectUtilityNodes = useCallback(
    async (fromNodeId: string, toNodeId: string) => {
      if (!field) return;
      const fromNode = field.utilityNodes.find((n) => n._id === fromNodeId);
      const toNode = field.utilityNodes.find((n) => n._id === toNodeId);
      if (!fromNode || !toNode) return;

      if (fromNode.kind !== toNode.kind) {
        toast.error('無法連接不同類型的設施節點（水利與電力）');
        return;
      }

      try {
        await createUtilityEdge({
          fieldId: field._id,
          fromNodeId: fromNodeId as Id<"utilityNodes">,
          toNodeId: toNodeId as Id<"utilityNodes">,
          kind: fromNode.kind,
        });
        toast.success('設施連接已建立');
      } catch {
        toast.error('建立連接失敗，請重試');
      }
    },
    [field, createUtilityEdge],
  );

  // --- Quick-add (double-click on empty canvas) ---
  const handleQuickAdd = useCallback(
    async (pos: { xM: number; yM: number }) => {
      if (!farmId || !field) return;
      const DEFAULT_SIZE = 2;
      const rect = {
        xM: pos.xM - DEFAULT_SIZE / 2,
        yM: pos.yM - DEFAULT_SIZE / 2,
        widthM: DEFAULT_SIZE,
        heightM: DEFAULT_SIZE,
      };
      const plantedCropId = await createRegionMut({
        fieldId: field._id,
        ...rect,
      });
      setPendingRegionId(plantedCropId);
      setPendingRectInfo(rect);
    },
    [farmId, field, createRegionMut],
  );

  // --- Mark as harvested ---
  const handleMarkHarvested = useCallback(
    (plantedCropId: string) => {
      harvestCropMut({ plantedCropId: plantedCropId as Id<"plantedCrops"> });
    },
    [harvestCropMut],
  );

  // --- Delete area (remove both placement and planted_crop) ---
  const handleDeleteArea = useCallback(
    (plantedCropId: string) => {
      deletePlantedCropWithPlacement({ plantedCropId: plantedCropId as Id<"plantedCrops"> });
      useFieldEditor.getState().clearSelection();
    },
    [deletePlantedCropWithPlacement],
  );

  // --- Remove plant (unassign crop from region, keep region) ---
  const handleRemovePlant = useCallback(
    (plantedCropId: string) => {
      removePlantedCrop({ plantedCropId: plantedCropId as Id<"plantedCrops"> });
    },
    [removePlantedCrop],
  );

  // --- Context menu action (right-click on canvas item) ---
  const handleContextAction = useCallback(
    (action: string, itemId: string) => {
      // Select the item first
      useFieldEditor.getState().select(itemId);

      switch (action) {
        case "copy":
          // Copy needs selection to be reflected first, then use handleCopy
          setTimeout(() => handleCopy(), 0);
          break;
        case "duplicate":
          setTimeout(() => handleDuplicate(), 0);
          break;
        case "changeCrop": {
          const pc = field?.plantedCrops.find((p) => p._id === itemId);
          if (pc) {
            handleChangeCrop(pc._id);
          }
          break;
        }
        case "removePlant": {
          const pc = field?.plantedCrops.find((p) => p._id === itemId);
          if (pc) {
            handleRemovePlant(pc._id);
          }
          break;
        }
        case "markHarvested": {
          const pc = field?.plantedCrops.find((p) => p._id === itemId);
          if (pc) {
            handleMarkHarvested(pc._id);
          }
          break;
        }
        case "deleteArea": {
          const pc = field?.plantedCrops.find((p) => p._id === itemId);
          if (pc) {
            handleDeleteArea(pc._id);
          }
          break;
        }
        case "delete":
          setTimeout(() => {
            // Re-read to get updated selection
            const state = useFieldEditor.getState();
            if (state.selectedIds.length > 0) {
              handleDeleteSelected();
            }
          }, 0);
          break;
      }
    },
    [field, handleCopy, handleDuplicate, handleChangeCrop, handleDeleteSelected, handleRemovePlant, handleMarkHarvested, handleDeleteArea],
  );

  // --- Memo ---
  const handleMemoChange = useCallback(
    (memo: string) => {
      if (!field) return;
      updateFieldMemo({ fieldId: field._id, memo });
    },
    [field, updateFieldMemo],
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
    for (const pc of field.plantedCrops) {
      items.push({
        xM: Number(pc.xM),
        yM: Number(pc.yM),
        widthM: Number(pc.widthM),
        heightM: Number(pc.heightM),
        color: pc.crop?.color ?? "#d1d5db",
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
      <div className="flex h-full flex-col">
        {/* Skeleton top bar */}
        <div className="flex h-10 items-center gap-2 border-b bg-background px-2">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="h-4 w-24" />
          <div className="flex-1" />
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
        </div>
        {/* Skeleton body */}
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden md:flex w-10 border-r bg-background flex-col gap-2 items-center py-2">
            <Skeleton className="size-7 rounded" />
            <Skeleton className="size-7 rounded" />
            <Skeleton className="size-7 rounded" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </div>
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
    (pc) => pc.status === "growing",
  ).length;
  const harvestedCount = field.plantedCrops.filter(
    (pc) => pc.status === "harvested",
  ).length;
  const facilityCount = field.facilities.length;

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className={cn("flex h-10 items-center gap-1 md:gap-2 border-b bg-background px-2 overflow-hidden", timelineMode && "bg-amber-50/50 dark:bg-amber-950/10")}>
        <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
          <Link href="/fields">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <span className="min-w-0 truncate text-sm font-medium">{field.name}</span>

        {farmId && (
          <FieldManageMenu
            fieldId={field._id}
            farmId={farmId}
            fieldName={field.name}
            fieldWidthM={Number(field.widthM)}
            fieldHeightM={Number(field.heightM)}
          />
        )}

        {/* Utility node type selector (when utility_node tool is active) — desktop only */}
        {activeTool === "utility_node" && (
          <div className="hidden md:flex items-center gap-1 border-l pl-2 ml-2">
            <span className="text-xs text-muted-foreground">節點類型:</span>
            <select
              value={utilityNodeType}
              onChange={(e) => setUtilityNodeType(e.target.value)}
              className="h-7 rounded border bg-background px-1 text-xs"
            >
              <optgroup label="水利">
                <option value="pump">水泵</option>
                <option value="tank">水塔</option>
                <option value="valve">閥門</option>
                <option value="outlet">出水口</option>
                <option value="junction">接頭</option>
              </optgroup>
              <optgroup label="電力">
                <option value="panel">配電箱</option>
                <option value="switch">開關</option>
              </optgroup>
            </select>
          </div>
        )}

        <div className="flex-1" />

        {/* Timeline toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={timelineMode ? "secondary" : "ghost"}
                size="icon"
                className={cn("size-8 shrink-0", timelineMode && "text-amber-700 dark:text-amber-300")}
                onClick={() => enterTimeline()}
                aria-label="時間軸"
              >
                <Clock className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>時間軸 (T)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Map import — hidden on mobile to save space */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 hidden md:inline-flex"
                onClick={handleImportMap}
                aria-label="匯入地圖"
              >
                <ImagePlus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>匯入地圖</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Undo/Redo */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                disabled={!canUndo()}
                onClick={() => undo()}
                aria-label="復原"
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
                className="size-8 shrink-0"
                disabled={!canRedo()}
                onClick={() => redo()}
                aria-label="重做"
              >
                <Redo2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做 (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Zoom — hidden on mobile to save space */}
        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-xs"
            onClick={zoomOut}
            aria-label="縮小"
          >
            &minus;
          </Button>
          <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-xs"
            onClick={zoomIn}
            aria-label="放大"
          >
            +
          </Button>
        </div>
      </div>

      {/* Timeline bar (when active) */}
      {timelineMode && <EditorTimelineBar />}

      {/* Main area: toolbar + canvas + inspector */}
      <div className="flex w-full min-w-0 flex-1 overflow-hidden">
        {/* Left: toolbar (desktop vertical) */}
        <div className="hidden md:flex">
          <EditorToolbar />
        </div>

        {/* Center: canvas */}
        <div ref={canvasContainerRef} className="relative min-w-0 flex-1 overflow-hidden bg-muted/30">
          <EditorCanvas
            field={field}
            onDrawRectComplete={handleDrawRectComplete}
            onDrawPolygonComplete={handleDrawPolygonComplete}
            onPlaceUtilityNode={handlePlaceUtilityNode}
            onConnectUtilityNodes={handleConnectUtilityNodes}
            onQuickAdd={handleQuickAdd}
            onContextAction={handleContextAction}
            onContextMenu={(data) => setContextMenu(data)}
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
          {/* Floating button to reopen inspector on mobile when it's collapsed */}
          {isMobile && !inspectorOpen && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-3 right-3 z-10 size-11 rounded-full shadow-md"
              onClick={toggleInspector}
              aria-label="開啟屬性面板"
            >
              <PanelBottomOpen className="size-5" />
            </Button>
          )}

          {/* Right-click context menu overlay */}
          {contextMenu && (
            <div
              className="fixed z-50"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <div className="rounded-md border bg-popover p-1 shadow-md min-w-[160px]">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    handleContextAction("copy", contextMenu.itemId);
                    setContextMenu(null);
                  }}
                >
                  <Copy className="size-3.5 text-muted-foreground" />
                  複製
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    handleContextAction("duplicate", contextMenu.itemId);
                    setContextMenu(null);
                  }}
                >
                  <CopyPlus className="size-3.5 text-muted-foreground" />
                  複製並貼上
                </button>

                {/* Crop-specific actions */}
                {contextMenu.itemKind === "crop" && contextMenu.hasActiveCrop && (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        handleContextAction("changeCrop", contextMenu.itemId);
                        setContextMenu(null);
                      }}
                    >
                      <Replace className="size-3.5 text-muted-foreground" />
                      更換作物
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        handleContextAction("removePlant", contextMenu.itemId);
                        setContextMenu(null);
                      }}
                    >
                      <Scissors className="size-3.5 text-muted-foreground" />
                      移除作物
                    </button>
                    {contextMenu.status === "growing" && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => {
                          handleContextAction("markHarvested", contextMenu.itemId);
                          setContextMenu(null);
                        }}
                      >
                        <Wheat className="size-3.5 text-muted-foreground" />
                        標記收成
                      </button>
                    )}
                  </>
                )}

                {/* Harvested crop: allow replanting */}
                {contextMenu.itemKind === "crop" && !contextMenu.hasActiveCrop && contextMenu.status === "harvested" && (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        handleContextAction("changeCrop", contextMenu.itemId);
                        setContextMenu(null);
                      }}
                    >
                      <Replace className="size-3.5 text-muted-foreground" />
                      更換作物
                    </button>
                  </>
                )}

                <div className="my-1 h-px bg-border" />

                {/* Delete action: different for crop vs facility */}
                {contextMenu.itemKind === "crop" ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                    onClick={() => {
                      handleContextAction("deleteArea", contextMenu.itemId);
                      setContextMenu(null);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    刪除區域
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                    onClick={() => {
                      handleContextAction("delete", contextMenu.itemId);
                      setContextMenu(null);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    刪除
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: property inspector (desktop only) */}
        {!isMobile && (
          <PropertyInspector
            field={field}
            fieldName={field.name}
            fieldWidthM={Number(field.widthM)}
            fieldHeightM={Number(field.heightM)}
            growingCount={growingCount}
            harvestedCount={harvestedCount}
            facilityCount={facilityCount}
            onDeleteSelected={handleDeleteSelected}
            onDeleteArea={handleDeleteArea}
            onRemovePlant={handleRemovePlant}
            onChangeCrop={handleChangeCrop}
            onMarkHarvested={handleMarkHarvested}
            onSplitHorizontal={handleSplitHorizontal}
            onSplitVertical={handleSplitVertical}
            onMergeZones={handleMergeZones}
            onAlign={handleAlign}
            memo={field.memo}
            onMemoChange={handleMemoChange}
          />
        )}

        {/* Mobile inspector (bottom sheet) */}
        {isMobile && (
          <>
            <Sheet open={inspectorOpen} onOpenChange={(open) => { if (!open && inspectorOpen) toggleInspector(); }}>
              <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto" showCloseButton={false}>
                <SheetTitle className="sr-only">屬性面板</SheetTitle>
                <SheetDescription className="sr-only">查看與編輯選取項目的屬性</SheetDescription>
                <PropertyInspector
                  field={field}
                  fieldName={field.name}
                  fieldWidthM={Number(field.widthM)}
                  fieldHeightM={Number(field.heightM)}
                  growingCount={growingCount}
                  harvestedCount={harvestedCount}
                  facilityCount={facilityCount}
                  onDeleteSelected={handleDeleteSelected}
                  onDeleteArea={handleDeleteArea}
                  onRemovePlant={handleRemovePlant}
                  onChangeCrop={handleChangeCrop}
                  onMarkHarvested={handleMarkHarvested}
                  onSplitHorizontal={handleSplitHorizontal}
                  onSplitVertical={handleSplitVertical}
                  onMergeZones={handleMergeZones}
                  onAlign={handleAlign}
                  memo={field.memo}
                  onMemoChange={handleMemoChange}
                  embedded
                />
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      {/* Bottom: mobile toolbar (horizontal) */}
      <div className="md:hidden">
        <EditorToolbar orientation="horizontal" />
      </div>

      {/* Bottom: status bar — hidden on mobile to maximize canvas space */}
      <div className="hidden md:block">
        <EditorStatusBar
          fieldName={field.name}
          fieldWidthM={Number(field.widthM)}
          fieldHeightM={Number(field.heightM)}
        />
      </div>

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
