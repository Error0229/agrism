"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle, Image as KonvaImage } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";

import { cn } from "@/lib/utils";
import { useFieldEditor } from "@/lib/store/field-editor-store";
import {
  useUpdateCropPlacement,
  useRemovePlantedCrop,
  useRestorePlantedCrop,
  useDeletePlantedCropWithPlacement,
  useDeleteFacility,
  useCreateFacility,
  useUpdateFacility,
  useUpdateUtilityNode,
  useDeleteUtilityNode,
} from "@/hooks/use-fields";
import {
  createMoveCommand,
  createDeleteCommand,
  createResizeCommand,
} from "@/lib/store/editor-commands";
import { buildPlannerGridLines, snapToGrid } from "@/lib/utils/planner-grid";
import type { PlannerGridSizeMeters } from "@/lib/utils/planner-grid-settings";
import { UTILITY_NODE_TYPE_LABELS } from "@/lib/types/labels";

// ---------------------------------------------------------------------------
// Types — field data shape from Convex
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FieldData = any;

// Merged shape for canvas rendering
interface CanvasItem {
  id: string; // plantedCrop _id for crops, facility _id for facilities
  kind: "crop" | "facility";
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  label: string;
  emoji: string;
  color: string;
  status: string;
  cropId?: string;
  plantedCropId?: string;
  plantedDate?: string;
  harvestedDate?: string | null;
  facilityType?: string;
  shapePoints?: { x: number; y: number }[] | null;
}

// Resize handle directions
type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ResizeState {
  itemId: string;
  dir: HandleDir;
  startXPx: number;
  startYPx: number;
  origBounds: { xM: number; yM: number; widthM: number; heightM: number };
  origShapePoints?: { x: number; y: number }[] | null;
}

interface ResizePreview {
  id: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  shapePoints?: { x: number; y: number }[] | null;
}

// Vertex drag state for polygon vertex editing
interface VertexDragState {
  itemId: string;
  vertexIndex: number;
  origShapePoints: { x: number; y: number }[];
  origBounds: { xM: number; yM: number; widthM: number; heightM: number };
}

// Measure tool state
interface MeasureState {
  startXM: number;
  startYM: number;
  endXM: number;
  endYM: number;
}

// Draw rect state
interface DrawRectState {
  startXM: number;
  startYM: number;
  endXM: number;
  endYM: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIXELS_PER_METER = 100;
const HANDLE_SIZE = 8;
const MIN_SIZE_M = 0.2; // minimum 20cm resize
const SNAP_THRESHOLD_M = 0.15; // snap within 15cm

// ---------------------------------------------------------------------------
// Resize bounds computation (shared between live preview and commit)
// ---------------------------------------------------------------------------

function computeResizeBounds(
  state: ResizeState,
  realPosX: number,
  realPosY: number,
  snapM: (m: number) => number,
): { xM: number; yM: number; widthM: number; heightM: number; shapePoints?: { x: number; y: number }[] | null } | null {
  const curXM = snapM(realPosX / PIXELS_PER_METER);
  const curYM = snapM(realPosY / PIXELS_PER_METER);
  const orig = state.origBounds;
  const dir = state.dir;

  let newX = orig.xM;
  let newY = orig.yM;
  let newW = orig.widthM;
  let newH = orig.heightM;

  if (dir.includes("w")) {
    newW = Math.max(MIN_SIZE_M, orig.xM + orig.widthM - curXM);
    newX = orig.xM + orig.widthM - newW;
  }
  if (dir.includes("e")) {
    newW = Math.max(MIN_SIZE_M, curXM - orig.xM);
  }
  if (dir.includes("n")) {
    newH = Math.max(MIN_SIZE_M, orig.yM + orig.heightM - curYM);
    newY = orig.yM + orig.heightM - newH;
  }
  if (dir.includes("s")) {
    newH = Math.max(MIN_SIZE_M, curYM - orig.yM);
  }

  newX = snapM(newX);
  newY = snapM(newY);
  newW = snapM(newW) || MIN_SIZE_M;
  newH = snapM(newH) || MIN_SIZE_M;

  // Scale polygon shape points if present
  let newShapePoints: { x: number; y: number }[] | null | undefined = undefined;
  if (state.origShapePoints && state.origShapePoints.length >= 3) {
    const scaleX = newW / orig.widthM;
    const scaleY = newH / orig.heightM;
    // origShapePoints are in absolute meters; transform relative to bounding box origin
    const origMinX = orig.xM;
    const origMinY = orig.yM;
    newShapePoints = state.origShapePoints.map((p) => ({
      x: newX + (p.x - origMinX) * scaleX,
      y: newY + (p.y - origMinY) * scaleY,
    }));
  }

  return { xM: newX, yM: newY, widthM: newW, heightM: newH, shapePoints: newShapePoints };
}

// ---------------------------------------------------------------------------
// Snap-to-object alignment guides
// ---------------------------------------------------------------------------

interface SnapGuide {
  orientation: "horizontal" | "vertical";
  positionM: number; // position in meters
}

interface SnapResult {
  guides: SnapGuide[];
  snappedXM: number | null;
  snappedYM: number | null;
}

function computeSnapGuides(
  movingBounds: { xM: number; yM: number; widthM: number; heightM: number },
  otherItems: Array<{ xM: number; yM: number; widthM: number; heightM: number }>,
  fieldWidthM: number,
  fieldHeightM: number,
): SnapResult {
  const guides: SnapGuide[] = [];
  let snappedXM: number | null = null;
  let snappedYM: number | null = null;

  const movingLeft = movingBounds.xM;
  const movingRight = movingBounds.xM + movingBounds.widthM;
  const movingCenterX = movingBounds.xM + movingBounds.widthM / 2;
  const movingTop = movingBounds.yM;
  const movingBottom = movingBounds.yM + movingBounds.heightM;
  const movingCenterY = movingBounds.yM + movingBounds.heightM / 2;

  // Collect all reference edges and centers from other items + field boundaries
  const verticalRefs: number[] = [0, fieldWidthM];
  const horizontalRefs: number[] = [0, fieldHeightM];

  for (const item of otherItems) {
    verticalRefs.push(item.xM, item.xM + item.widthM, item.xM + item.widthM / 2);
    horizontalRefs.push(item.yM, item.yM + item.heightM, item.yM + item.heightM / 2);
  }

  // Check vertical alignment (X axis)
  for (const ref of verticalRefs) {
    if (Math.abs(movingLeft - ref) < SNAP_THRESHOLD_M && snappedXM === null) {
      snappedXM = ref;
      guides.push({ orientation: "vertical", positionM: ref });
    }
    if (Math.abs(movingRight - ref) < SNAP_THRESHOLD_M && snappedXM === null) {
      snappedXM = ref - movingBounds.widthM;
      guides.push({ orientation: "vertical", positionM: ref });
    }
    if (Math.abs(movingCenterX - ref) < SNAP_THRESHOLD_M && snappedXM === null) {
      snappedXM = ref - movingBounds.widthM / 2;
      guides.push({ orientation: "vertical", positionM: ref });
    }
  }

  // Check horizontal alignment (Y axis)
  for (const ref of horizontalRefs) {
    if (Math.abs(movingTop - ref) < SNAP_THRESHOLD_M && snappedYM === null) {
      snappedYM = ref;
      guides.push({ orientation: "horizontal", positionM: ref });
    }
    if (Math.abs(movingBottom - ref) < SNAP_THRESHOLD_M && snappedYM === null) {
      snappedYM = ref - movingBounds.heightM;
      guides.push({ orientation: "horizontal", positionM: ref });
    }
    if (Math.abs(movingCenterY - ref) < SNAP_THRESHOLD_M && snappedYM === null) {
      snappedYM = ref - movingBounds.heightM / 2;
      guides.push({ orientation: "horizontal", positionM: ref });
    }
  }

  return { guides, snappedXM, snappedYM };
}

// ---------------------------------------------------------------------------
// Hook — load an image for Konva rendering
// ---------------------------------------------------------------------------

function useKonvaImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => { if (!cancelled) setImage(img); };
    img.src = src;
    return () => { cancelled = true; img.onload = null; setImage(null); };
  }, [src]);
  return image;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EditorCanvasProps {
  field: FieldData;
  onDrawRectComplete?: (rect: {
    xM: number;
    yM: number;
    widthM: number;
    heightM: number;
  }) => void;
  onDrawPolygonComplete?: (data: {
    xM: number;
    yM: number;
    widthM: number;
    heightM: number;
    shapePoints: { x: number; y: number }[];
  }) => void;
  onPlaceUtilityNode?: (pos: { xM: number; yM: number }) => void;
  onConnectUtilityNodes?: (fromNodeId: string, toNodeId: string) => void;
  onQuickAdd?: (pos: { xM: number; yM: number }) => void;
  onContextAction?: (action: string, itemId: string) => void;
  onContextMenu?: (data: {
    x: number;
    y: number;
    itemId: string;
    itemKind: "crop" | "facility";
    hasActiveCrop: boolean;
    status: string;
  }) => void;
}

export function EditorCanvas({ field, onDrawRectComplete, onDrawPolygonComplete, onPlaceUtilityNode, onConnectUtilityNodes, onQuickAdd, onContextAction, onContextMenu }: EditorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });

  // Zustand store
  const activeTool = useFieldEditor((s) => s.activeTool);
  const selectedIds = useFieldEditor((s) => s.selectedIds);
  const select = useFieldEditor((s) => s.select);
  const toggleSelect = useFieldEditor((s) => s.toggleSelect);
  const clearSelection = useFieldEditor((s) => s.clearSelection);
  const zoom = useFieldEditor((s) => s.zoom);
  const setZoom = useFieldEditor((s) => s.setZoom);
  const pan = useFieldEditor((s) => s.pan);
  const setPan = useFieldEditor((s) => s.setPan);
  const gridVisible = useFieldEditor((s) => s.gridVisible);
  const gridSpacing = useFieldEditor((s) => s.gridSpacing);
  const snapEnabled = useFieldEditor((s) => s.snapEnabled);
  const selectMultiple = useFieldEditor((s) => s.selectMultiple);
  const executeCommand = useFieldEditor((s) => s.executeCommand);
  const layerVisibility = useFieldEditor((s) => s.layerVisibility);
  const showHarvested = useFieldEditor((s) => s.showHarvested);
  const setCursorPosition = useFieldEditor((s) => s.setCursorPosition);
  const activeFieldId = useFieldEditor((s) => s.activeFieldId);
  const bgEntry = useFieldEditor((s) => activeFieldId ? s.backgroundImages[activeFieldId] : undefined);
  const timelineMode = useFieldEditor((s) => s.timelineMode);
  const timelineDate = useFieldEditor((s) => s.timelineDate);
  const calibrationMode = useFieldEditor((s) => s.calibrationMode);
  const calibrationPoints = useFieldEditor((s) => s.calibrationPoints);
  const addCalibrationPoint = useFieldEditor((s) => s.addCalibrationPoint);

  // Mutations
  const updatePlacement = useUpdateCropPlacement();
  const removePlantedCrop = useRemovePlantedCrop();
  const restorePlantedCrop = useRestorePlantedCrop();
  const deletePlantedCropWithPlacement = useDeletePlantedCropWithPlacement();
  const deleteFacility = useDeleteFacility();
  const deleteUtilityNode = useDeleteUtilityNode();
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const updateUtilityNode = useUpdateUtilityNode();

  // Background image for map import (per-field)
  const bgImage = useKonvaImage(bgEntry?.dataUrl ?? null);
  const backgroundOpacity = bgEntry?.opacity ?? 0.5;

  // Local interaction state
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [dragStartPositions, setDragStartPositions] = useState<Map<
    string,
    { xM: number; yM: number; shapePoints?: { x: number; y: number }[] | null }
  > | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);
  const [measureState, setMeasureState] = useState<MeasureState | null>(null);
  const [drawRectState, setDrawRectState] = useState<DrawRectState | null>(
    null,
  );
  const [marqueeState, setMarqueeState] = useState<{
    startXM: number;
    startYM: number;
    endXM: number;
    endYM: number;
    shiftHeld: boolean;
  } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ xM: number; yM: number }[]>([]);
  const [polygonCursorPos, setPolygonCursorPos] = useState<{ xM: number; yM: number } | null>(null);
  const [pendingEdgeFromNodeId, setPendingEdgeFromNodeId] = useState<string | null>(null);
  const [edgeCursorPos, setEdgeCursorPos] = useState<{ xM: number; yM: number } | null>(null);
  const [vertexDragState, setVertexDragState] = useState<VertexDragState | null>(null);

  // Track dragging node positions for live edge rendering
  const [draggingNodePositions, setDraggingNodePositions] = useState<Map<string, { xM: number; yM: number }>>(new Map());

  // Context menu state removed — now delegated via onContextMenu prop

  // Clear polygon state when switching away from draw_polygon.
  // The cleanup function runs when activeTool changes away from draw_polygon,
  // which is a valid synchronization with external state (the Zustand store).
  useEffect(() => {
    if (activeTool === "draw_polygon") {
      return () => {
        setPolygonPoints([]);
        setPolygonCursorPos(null);
      };
    }
  }, [activeTool]);

  // Clear edge pending state when switching away from utility_edge.
  // IMPORTANT: pendingEdgeFromNodeId must NOT be in the dependency array,
  // otherwise the cleanup resets it immediately after every state change.
  useEffect(() => {
    if (activeTool === "utility_edge") {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setPendingEdgeFromNodeId(null);
          setEdgeCursorPos(null);
        }
      };
      window.addEventListener("keydown", handleEscape);
      return () => {
        window.removeEventListener("keydown", handleEscape);
        setPendingEdgeFromNodeId(null);
        setEdgeCursorPos(null);
      };
    }
  }, [activeTool]);

  // Resize container on mount / window resize
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Field dimensions in pixels
  const fieldWidthM = Number(field.widthM);
  const fieldHeightM = Number(field.heightM);
  const canvasWidth = fieldWidthM * PIXELS_PER_METER;
  const canvasHeight = fieldHeightM * PIXELS_PER_METER;

  // Build canvas items (crops + facilities merged into one list)
  // In Convex, placement data (xM, yM, widthM, heightM, shapePoints) is inlined into plantedCrops
  const canvasItems = useMemo<CanvasItem[]>(() => {
    const items: CanvasItem[] = [];

    for (const pc of field.plantedCrops) {
      // Handle unassigned regions (crop is null)
      const crop = pc.crop;
      items.push({
        id: pc._id,
        kind: "crop",
        xM: Number(pc.xM),
        yM: Number(pc.yM),
        widthM: Number(pc.widthM ?? 1),
        heightM: Number(pc.heightM ?? 1),
        label: crop ? `${crop.emoji} ${crop.name}` : "未指定作物",
        emoji: crop?.emoji ?? "",
        color: crop?.color ?? "#d1d5db",
        status: pc.status,
        cropId: crop?._id,
        plantedCropId: pc._id,
        plantedDate: pc.plantedDate,
        harvestedDate: pc.harvestedDate,
        shapePoints: pc.shapePoints as { x: number; y: number }[] | null,
      });
    }

    for (const fac of field.facilities) {
      items.push({
        id: fac._id,
        kind: "facility",
        xM: Number(fac.xM),
        yM: Number(fac.yM),
        widthM: Number(fac.widthM),
        heightM: Number(fac.heightM),
        label: fac.name,
        emoji: "\u{1F3D7}",
        color: "#94a3b8",
        status: "facility",
        facilityType: fac.facilityType,
      });
    }

    return items;
  }, [field.plantedCrops, field.facilities]);

  // Utility nodes / edges
  const utilityNodes = field.utilityNodes;
  const utilityEdges = field.utilityEdges;
  const utilityNodeById = useMemo(
    () => new Map<string, any>(utilityNodes.map((n: any) => [n._id, n])),
    [utilityNodes],
  );

  // Filter canvas items by layer visibility, harvested toggle, and timeline
  const visibleCanvasItems = useMemo(() => {
    return canvasItems.filter((item) => {
      if (item.kind === "crop" && !layerVisibility.crops) return false;
      if (item.kind === "facility" && !layerVisibility.facilities) return false;
      if (item.status === "harvested" && !showHarvested) return false;
      // Timeline date filtering: hide crops not yet planted
      if (timelineMode && timelineDate && item.kind === "crop") {
        if (item.plantedDate && item.plantedDate > timelineDate) return false;
      }
      return true;
    });
  }, [canvasItems, layerVisibility.crops, layerVisibility.facilities, showHarvested, timelineMode, timelineDate]);

  // Filter utility nodes/edges by layer visibility
  const visibleUtilityNodes = useMemo(() => {
    return utilityNodes.filter((node) => {
      if (node.kind === "water" && !layerVisibility.waterUtilities) return false;
      if (node.kind === "electric" && !layerVisibility.electricUtilities) return false;
      return true;
    });
  }, [utilityNodes, layerVisibility.waterUtilities, layerVisibility.electricUtilities]);

  const visibleUtilityEdges = useMemo(() => {
    return utilityEdges.filter((edge) => {
      if (edge.kind === "water" && !layerVisibility.waterUtilities) return false;
      if (edge.kind === "electric" && !layerVisibility.electricUtilities) return false;
      return true;
    });
  }, [utilityEdges, layerVisibility.waterUtilities, layerVisibility.electricUtilities]);

  // Compute overlap conflict warnings between visible crop items
  const overlaps = useMemo(() => {
    const cropItems = visibleCanvasItems.filter((item) => item.kind === "crop");
    const result: { xPx: number; yPx: number; item1Name: string; item2Name: string }[] = [];

    // Helper: get polygon vertices for an item (rect → 4 corners, polygon → shapePoints)
    function getPolygon(item: CanvasItem): { x: number; y: number }[] {
      if (item.shapePoints && item.shapePoints.length >= 3) return item.shapePoints;
      return [
        { x: item.xM, y: item.yM },
        { x: item.xM + item.widthM, y: item.yM },
        { x: item.xM + item.widthM, y: item.yM + item.heightM },
        { x: item.xM, y: item.yM + item.heightM },
      ];
    }

    // SAT helper: get perpendicular axes from polygon edges
    function getAxes(poly: { x: number; y: number }[]): { x: number; y: number }[] {
      const axes: { x: number; y: number }[] = [];
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        const edgeX = p2.x - p1.x;
        const edgeY = p2.y - p1.y;
        const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
        if (len > 0) axes.push({ x: -edgeY / len, y: edgeX / len });
      }
      return axes;
    }

    // SAT helper: project polygon onto axis, return min/max
    function projectPoly(poly: { x: number; y: number }[], axis: { x: number; y: number }): { min: number; max: number } {
      let min = Infinity, max = -Infinity;
      for (const p of poly) {
        const dot = p.x * axis.x + p.y * axis.y;
        if (dot < min) min = dot;
        if (dot > max) max = dot;
      }
      return { min, max };
    }

    function polygonsOverlap(poly1: { x: number; y: number }[], poly2: { x: number; y: number }[]): boolean {
      const axes = [...getAxes(poly1), ...getAxes(poly2)];
      for (const axis of axes) {
        const proj1 = projectPoly(poly1, axis);
        const proj2 = projectPoly(poly2, axis);
        if (proj1.max <= proj2.min || proj2.max <= proj1.min) return false;
      }
      return true;
    }

    for (let i = 0; i < cropItems.length; i++) {
      for (let j = i + 1; j < cropItems.length; j++) {
        const a = cropItems[i];
        const b = cropItems[j];

        // Quick AABB reject first
        const aabbIntersects = !(
          a.xM + a.widthM <= b.xM ||
          b.xM + b.widthM <= a.xM ||
          a.yM + a.heightM <= b.yM ||
          b.yM + b.heightM <= a.yM
        );
        if (!aabbIntersects) continue;

        // If both are rectangles (no shapePoints), AABB is sufficient
        const aHasPoly = a.shapePoints && a.shapePoints.length >= 3;
        const bHasPoly = b.shapePoints && b.shapePoints.length >= 3;
        const intersects = (aHasPoly || bHasPoly)
          ? polygonsOverlap(getPolygon(a), getPolygon(b))
          : true; // AABB already confirmed

        if (intersects) {
          const aCx = a.xM + a.widthM / 2;
          const aCy = a.yM + a.heightM / 2;
          const bCx = b.xM + b.widthM / 2;
          const bCy = b.yM + b.heightM / 2;
          result.push({
            xPx: ((aCx + bCx) / 2) * PIXELS_PER_METER,
            yPx: ((aCy + bCy) / 2) * PIXELS_PER_METER,
            item1Name: a.label,
            item2Name: b.label,
          });
        }
      }
    }
    return result;
  }, [visibleCanvasItems]);

  // Grid lines
  const gridLines = useMemo(() => {
    if (!gridVisible) return [];
    return buildPlannerGridLines(
      fieldWidthM,
      fieldHeightM,
      PIXELS_PER_METER,
      gridSpacing as PlannerGridSizeMeters,
    );
  }, [gridVisible, fieldWidthM, fieldHeightM, gridSpacing]);

  // Snap helper (works in meters) — uses -Infinity as min so items can be
  // placed outside the field boundary (negative coordinates are valid).
  const snapM = useCallback(
    (m: number): number => {
      if (!snapEnabled) return m;
      return snapToGrid(m, gridSpacing, -Infinity);
    },
    [snapEnabled, gridSpacing],
  );

  // Canvas item lookup
  const itemById = useMemo(
    () => new Map(canvasItems.map((item) => [item.id, item])),
    [canvasItems],
  );

  // Selected set
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Pre-compute non-selected items for snap guide computation (avoids filtering on every drag frame)
  const snapOtherItems = useMemo(
    () => canvasItems.filter((ci) => !selectedSet.has(ci.id)),
    [canvasItems, selectedSet],
  );

  // Stable drag-move handler for snap guides (avoids creating closures per-item per-render)
  const handleItemDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!snapEnabled) return;
      const node = e.target;
      // Find which item is being dragged — we use the Group's position
      const parentGroup = node.getParent();
      const groupNode = parentGroup && parentGroup.nodeType === "Group" ? parentGroup : node;
      const newXM = groupNode.x() / PIXELS_PER_METER;
      const newYM = groupNode.y() / PIXELS_PER_METER;
      // We need the item's dimensions. Read them from the dataset or compute from the node.
      // Since Konva Groups don't have width/height, we store a reference via a closure-free approach.
      // For now, use the store to find the item.
      const state = useFieldEditor.getState();
      const draggedIds = state.selectedIds;
      if (draggedIds.length === 0) return;
      // Use the first selected item's dimensions as approximation for snap
      const draggedId = draggedIds[0];
      const item = itemById.get(draggedId);
      if (!item) return;
      const result = computeSnapGuides(
        { xM: newXM, yM: newYM, widthM: item.widthM, heightM: item.heightM },
        snapOtherItems,
        fieldWidthM,
        fieldHeightM,
      );
      setActiveGuides(result.guides);
      if (result.snappedXM !== null) groupNode.x(result.snappedXM * PIXELS_PER_METER);
      if (result.snappedYM !== null) groupNode.y(result.snappedYM * PIXELS_PER_METER);
    },
    [snapEnabled, snapOtherItems, fieldWidthM, fieldHeightM, itemById],
  );

  // --- Helper: get pointer position in meters ---
  const getPointerMeters = useCallback((): {
    xM: number;
    yM: number;
  } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const transform = stage.getAbsoluteTransform().copy().invert();
    const realPos = transform.point(pos);
    return {
      xM: realPos.x / PIXELS_PER_METER,
      yM: realPos.y / PIXELS_PER_METER,
    };
  }, []);

  // --- Event handlers ---

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const newZoom = e.evt.deltaY > 0 ? zoom / scaleBy : zoom * scaleBy;
      setZoom(newZoom);
    },
    [zoom, setZoom],
  );

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Calibration mode: intercept clicks to place calibration points
      if (calibrationMode) {
        const pos = getPointerMeters();
        if (pos) {
          addCalibrationPoint({ xM: pos.xM, yM: pos.yM });
        }
        return;
      }

      // Don't clear selection when using polygon tool (clicks add vertices)
      if (activeTool === "draw_polygon") return;

      // Utility node tool: place a node on stage click
      if (activeTool === "utility_node" && e.target === e.target.getStage()) {
        const pos = getPointerMeters();
        if (pos && onPlaceUtilityNode) {
          const snappedX = snapM(pos.xM);
          const snappedY = snapM(pos.yM);
          onPlaceUtilityNode({ xM: snappedX, yM: snappedY });
        }
        return;
      }

      // Utility edge tool: cancel pending connection on empty stage click
      if (activeTool === "utility_edge") {
        // Only clear pending edge if clicking on empty stage, not on a node
        const clickedOnStage = e.target === e.target.getStage();
        if (pendingEdgeFromNodeId && clickedOnStage) {
          setPendingEdgeFromNodeId(null);
          setEdgeCursorPos(null);
        }
        return;
      }

      if (e.target === e.target.getStage()) {
        clearSelection();
      }
    },
    [clearSelection, activeTool, getPointerMeters, snapM, onPlaceUtilityNode, calibrationMode, addCalibrationPoint, pendingEdgeFromNodeId],
  );

  const handleStageDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (e.target === stageRef.current) {
        setPan(e.target.x(), e.target.y());
      }
    },
    [setPan],
  );

  // --- Stage mouse events for measure / draw_rect tools ---
  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Only act on stage-level clicks (not items)
      if (e.target !== e.target.getStage()) return;

      const pos = getPointerMeters();
      if (!pos) return;

      if (activeTool === "measure") {
        const snapped = { xM: snapM(pos.xM), yM: snapM(pos.yM) };
        setMeasureState({
          startXM: snapped.xM,
          startYM: snapped.yM,
          endXM: snapped.xM,
          endYM: snapped.yM,
        });
        return;
      }

      if (activeTool === "draw_rect") {
        const snapped = { xM: snapM(pos.xM), yM: snapM(pos.yM) };
        setDrawRectState({
          startXM: snapped.xM,
          startYM: snapped.yM,
          endXM: snapped.xM,
          endYM: snapped.yM,
        });
        return;
      }

      if (activeTool === "draw_polygon") {
        const snapped = { xM: snapM(pos.xM), yM: snapM(pos.yM) };

        if (polygonPoints.length >= 3) {
          // Check if cursor is near first point (close polygon)
          const firstPt = polygonPoints[0];
          const dxPx = (snapped.xM - firstPt.xM) * PIXELS_PER_METER * zoom;
          const dyPx = (snapped.yM - firstPt.yM) * PIXELS_PER_METER * zoom;
          const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
          if (distPx < 15) {
            // Close polygon: compute bounding box and store actual vertices
            const xs = polygonPoints.map((p) => p.xM);
            const ys = polygonPoints.map((p) => p.yM);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const w = maxX - minX;
            const h = maxY - minY;
            if (w >= MIN_SIZE_M && h >= MIN_SIZE_M) {
              const shapePoints = polygonPoints.map((p) => ({ x: p.xM, y: p.yM }));
              onDrawPolygonComplete?.({
                xM: minX,
                yM: minY,
                widthM: w,
                heightM: h,
                shapePoints,
              });
            }
            setPolygonPoints([]);
            setPolygonCursorPos(null);
            return;
          }
        }
        // Add vertex
        setPolygonPoints((prev) => [...prev, snapped]);
        return;
      }

      if (activeTool === "select") {
        setMarqueeState({
          startXM: pos.xM,
          startYM: pos.yM,
          endXM: pos.xM,
          endYM: pos.yM,
          shiftHeld: e.evt.shiftKey,
        });
        return;
      }
    },
    [activeTool, getPointerMeters, snapM, polygonPoints, zoom, onDrawRectComplete, onDrawPolygonComplete],
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getPointerMeters();
      if (!pos) return;

      // Update cursor position for status bar
      setCursorPosition({ xM: pos.xM, yM: pos.yM });

      if (activeTool === "measure" && measureState) {
        setMeasureState((prev) =>
          prev
            ? { ...prev, endXM: snapM(pos.xM), endYM: snapM(pos.yM) }
            : null,
        );
        return;
      }

      if (activeTool === "draw_rect" && drawRectState) {
        setDrawRectState((prev) =>
          prev
            ? { ...prev, endXM: snapM(pos.xM), endYM: snapM(pos.yM) }
            : null,
        );
        return;
      }

      if (activeTool === "draw_polygon" && polygonPoints.length > 0) {
        setPolygonCursorPos({ xM: snapM(pos.xM), yM: snapM(pos.yM) });
        return;
      }

      if (activeTool === "utility_edge" && pendingEdgeFromNodeId) {
        setEdgeCursorPos({ xM: pos.xM, yM: pos.yM });
        return;
      }

      if (activeTool === "select" && marqueeState) {
        setMarqueeState((prev) =>
          prev ? { ...prev, endXM: pos.xM, endYM: pos.yM } : null,
        );
        return;
      }

      // Handle resize drag — compute live preview
      if (resizeState) {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const stagePos = stage.getPointerPosition();
        if (!stagePos) return;
        const transform = stage.getAbsoluteTransform().copy().invert();
        const realPos = transform.point(stagePos);

        const preview = computeResizeBounds(resizeState, realPos.x, realPos.y, snapM);
        if (preview) {
          setResizePreview({
            id: resizeState.itemId,
            ...preview,
          });
        }
        return;
      }

      // Handle vertex drag — compute live preview
      if (vertexDragState) {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const stagePos = stage.getPointerPosition();
        if (!stagePos) return;
        const transform = stage.getAbsoluteTransform().copy().invert();
        const realPos = transform.point(stagePos);

        const newVertexXM = snapM(realPos.x / PIXELS_PER_METER);
        const newVertexYM = snapM(realPos.y / PIXELS_PER_METER);

        const newShapePoints = vertexDragState.origShapePoints.map((p, i) =>
          i === vertexDragState.vertexIndex ? { x: newVertexXM, y: newVertexYM } : p,
        );

        // Recalculate bounding box
        const xs = newShapePoints.map((p) => p.x);
        const ys = newShapePoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        setResizePreview({
          id: vertexDragState.itemId,
          xM: minX,
          yM: minY,
          widthM: Math.max(maxX - minX, MIN_SIZE_M),
          heightM: Math.max(maxY - minY, MIN_SIZE_M),
          shapePoints: newShapePoints,
        });
        return;
      }
    },
    [
      activeTool,
      measureState,
      drawRectState,
      marqueeState,
      polygonPoints,
      pendingEdgeFromNodeId,
      resizeState,
      vertexDragState,
      getPointerMeters,
      snapM,
      setCursorPosition,
    ],
  );

  const handleStageMouseUp = useCallback(() => {
    // Measure tool: just clear
    if (activeTool === "measure" && measureState) {
      // Keep the measurement visible for a moment, then clear
      // Actually keep it visible until next click — clear on next mousedown
      return;
    }

    // Draw rect tool: complete the draw
    if (activeTool === "draw_rect" && drawRectState) {
      const x = Math.min(drawRectState.startXM, drawRectState.endXM);
      const y = Math.min(drawRectState.startYM, drawRectState.endYM);
      const w = Math.abs(drawRectState.endXM - drawRectState.startXM);
      const h = Math.abs(drawRectState.endYM - drawRectState.startYM);

      if (w >= MIN_SIZE_M && h >= MIN_SIZE_M) {
        onDrawRectComplete?.({ xM: x, yM: y, widthM: w, heightM: h });
      }
      setDrawRectState(null);
      return;
    }

    // Marquee select: find enclosed items
    if (activeTool === "select" && marqueeState) {
      const minX = Math.min(marqueeState.startXM, marqueeState.endXM);
      const minY = Math.min(marqueeState.startYM, marqueeState.endYM);
      const maxX = Math.max(marqueeState.startXM, marqueeState.endXM);
      const maxY = Math.max(marqueeState.startYM, marqueeState.endYM);

      // Only select if the marquee had some area
      if (maxX - minX > 0.01 || maxY - minY > 0.01) {
        const matchedIds: string[] = [];
        for (const item of canvasItems) {
          if (
            item.xM >= minX &&
            item.yM >= minY &&
            item.xM + item.widthM <= maxX &&
            item.yM + item.heightM <= maxY
          ) {
            matchedIds.push(item.id);
          }
        }

        if (marqueeState.shiftHeld) {
          // Add to existing selection
          const combined = new Set([...selectedIds, ...matchedIds]);
          selectMultiple([...combined]);
        } else {
          selectMultiple(matchedIds);
        }
      }
      setMarqueeState(null);
      return;
    }
  }, [activeTool, measureState, drawRectState, marqueeState, canvasItems, selectedIds, selectMultiple, onDrawRectComplete]);

  // --- Item event handlers ---

  const handleItemClick = useCallback(
    (itemId: string, e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === "eraser") {
        const item = itemById.get(itemId);
        if (!item) return;
        e.cancelBubble = true;

        // Eraser deletes the area entirely (hard delete, no undo)
        if (item.kind === "crop" && item.plantedCropId) {
          deletePlantedCropWithPlacement({ plantedCropId: item.plantedCropId as any });
        } else if (item.kind === "facility") {
          deleteFacility({ facilityId: item.id as any });
        }
        return;
      }

      if (activeTool !== "select") return;
      e.cancelBubble = true;
      if (e.evt.shiftKey) {
        toggleSelect(itemId);
      } else {
        select(itemId);
      }
    },
    [
      activeTool,
      select,
      toggleSelect,
      itemById,
      deletePlantedCropWithPlacement,
      deleteFacility,
      field._id,
    ],
  );

  const handleItemDragStart = useCallback((itemId: string) => {
    if (activeTool !== "select") return;
    // Issue 8: Switch selection to dragged item immediately if not already selected
    let effectiveIds = selectedIds;
    if (!selectedIds.includes(itemId)) {
      select(itemId);
      effectiveIds = [itemId];
    }
    const positions = new Map<string, { xM: number; yM: number; shapePoints?: { x: number; y: number }[] | null }>();
    for (const id of effectiveIds) {
      const item = itemById.get(id);
      if (item) positions.set(id, {
        xM: item.xM,
        yM: item.yM,
        shapePoints: item.shapePoints ? item.shapePoints.map(p => ({ ...p })) : null,
      });
    }
    setDragStartPositions(positions);
  }, [activeTool, selectedIds, itemById, select]);

  const handleItemDragEnd = useCallback(
    (itemId: string, e: KonvaEventObject<DragEvent>) => {
      setActiveGuides([]);
      if (activeTool !== "select" || !dragStartPositions) return;

      const item = itemById.get(itemId);
      if (!item) return;

      const newXPx = e.target.x();
      const newYPx = e.target.y();
      const newXM = snapM(newXPx / PIXELS_PER_METER);
      const newYM = snapM(newYPx / PIXELS_PER_METER);
      const dxM = newXM - item.xM;
      const dyM = newYM - item.yM;

      if (Math.abs(dxM) < 0.001 && Math.abs(dyM) < 0.001) {
        e.target.position({
          x: item.xM * PIXELS_PER_METER,
          y: item.yM * PIXELS_PER_METER,
        });
        setDragStartPositions(null);
        return;
      }

      const cmd = createMoveCommand({
        ids: selectedIds,
        dx: dxM,
        dy: dyM,
        async updateFn(id, data) {
          const target = itemById.get(id);
          if (!target) return;
          if (target.kind === "crop") {
            const placementData: { xM: number; yM: number; shapePoints?: { x: number; y: number }[] | null } = {
              xM: data.xM,
              yM: data.yM,
            };
            if (data.shapePoints) {
              placementData.shapePoints = data.shapePoints;
            }
            await updatePlacement({
              plantedCropId: id as any,
              fieldId: field._id,
              ...placementData,
              shapePoints: placementData.shapePoints ?? undefined,
            });
          } else if (target.kind === "facility") {
            await updateFacility({
              facilityId: id as any,
              fieldId: field._id,
              xM: data.xM,
              yM: data.yM,
            });
          }
        },
        positions: dragStartPositions,
      });

      executeCommand(cmd);
      setDragStartPositions(null);
    },
    [
      activeTool,
      dragStartPositions,
      selectedIds,
      itemById,
      snapM,
      field._id,
      updatePlacement,
      updateFacility,
      executeCommand,
    ],
  );

  // --- Resize handle handlers ---
  const handleResizeStart = useCallback(
    (itemId: string, dir: HandleDir) => {
      const item = itemById.get(itemId);
      if (!item) return;
      setResizeState({
        itemId,
        dir,
        startXPx: 0,
        startYPx: 0,
        origBounds: {
          xM: item.xM,
          yM: item.yM,
          widthM: item.widthM,
          heightM: item.heightM,
        },
        origShapePoints: item.shapePoints ?? null,
      });
    },
    [itemById],
  );

  // --- Vertex drag handler ---
  const handleVertexDragStart = useCallback(
    (itemId: string, vertexIndex: number) => {
      const item = itemById.get(itemId);
      if (!item || !item.shapePoints || item.shapePoints.length < 3) return;
      setVertexDragState({
        itemId,
        vertexIndex,
        origShapePoints: item.shapePoints.map((p) => ({ ...p })),
        origBounds: {
          xM: item.xM,
          yM: item.yM,
          widthM: item.widthM,
          heightM: item.heightM,
        },
      });
    },
    [itemById],
  );

  const handleResizeEnd = useCallback(() => {
    if (!resizeState) return;
    const item = itemById.get(resizeState.itemId);
    if (!item) {
      setResizeState(null);
      setResizePreview(null);
      return;
    }

    // Compute the new position from where the handle ended up
    const stage = stageRef.current;
    if (!stage) {
      setResizeState(null);
      setResizePreview(null);
      return;
    }
    const pos = stage.getPointerPosition();
    if (!pos) {
      setResizeState(null);
      setResizePreview(null);
      return;
    }
    const transform = stage.getAbsoluteTransform().copy().invert();
    const realPos = transform.point(pos);

    const result = computeResizeBounds(resizeState, realPos.x, realPos.y, snapM);
    if (!result) {
      setResizeState(null);
      setResizePreview(null);
      return;
    }

    const orig = resizeState.origBounds;
    const { xM: newX, yM: newY, widthM: newW, heightM: newH, shapePoints: newShapePoints } = result;

    // Skip if nothing changed
    if (
      Math.abs(newX - orig.xM) < 0.001 &&
      Math.abs(newY - orig.yM) < 0.001 &&
      Math.abs(newW - orig.widthM) < 0.001 &&
      Math.abs(newH - orig.heightM) < 0.001
    ) {
      setResizeState(null);
      setResizePreview(null);
      return;
    }

    const newBounds = { xM: newX, yM: newY, widthM: newW, heightM: newH };
    const oldShapePoints = resizeState.origShapePoints;

    const cmd = createResizeCommand({
      id: resizeState.itemId,
      oldBounds: orig,
      newBounds,
      async updateFn(id, data) {
        if (item.kind === "crop") {
          const updateData: typeof data & { shapePoints?: { x: number; y: number }[] | null } = { ...data };
          if (newShapePoints !== undefined) {
            updateData.shapePoints = newShapePoints;
          }
          await updatePlacement({
            plantedCropId: id as any,
            fieldId: field._id,
            ...updateData,
            shapePoints: updateData.shapePoints ?? undefined,
          });
        } else if (item.kind === "facility") {
          await updateFacility({
            facilityId: id as any,
            fieldId: field._id,
            ...data,
          });
        }
      },
    });

    // For undo: also restore old shape points
    const origUndo = cmd.undo;
    cmd.undo = async () => {
      await origUndo();
      if (item.kind === "crop" && oldShapePoints !== undefined) {
        await updatePlacement({
          plantedCropId: resizeState.itemId as any,
          fieldId: field._id,
          shapePoints: oldShapePoints ?? undefined,
        });
      }
    };

    executeCommand(cmd);
    setResizeState(null);
    setResizePreview(null);
  }, [
    resizeState,
    itemById,
    snapM,
    field._id,
    updatePlacement,
    updateFacility,
    executeCommand,
  ]);

  // --- Utility node drag ---
  const handleUtilityNodeDragMove = useCallback(
    (nodeId: string, e: KonvaEventObject<DragEvent>) => {
      const xM = e.target.x() / PIXELS_PER_METER;
      const yM = e.target.y() / PIXELS_PER_METER;
      setDraggingNodePositions(prev => {
        const next = new Map(prev);
        next.set(nodeId, { xM, yM });
        return next;
      });
    },
    [],
  );

  const handleUtilityNodeDragEnd = useCallback(
    (nodeId: string, e: KonvaEventObject<DragEvent>) => {
      const newXM = snapM(e.target.x() / PIXELS_PER_METER);
      const newYM = snapM(e.target.y() / PIXELS_PER_METER);

      // Clear dragging position
      setDraggingNodePositions(prev => {
        const next = new Map(prev);
        next.delete(nodeId);
        return next;
      });

      updateUtilityNode({
        nodeId: nodeId as any,
        fieldId: field._id,
        xM: newXM,
        yM: newYM,
      });
    },
    [snapM, field._id, updateUtilityNode],
  );

  // Whether stage is draggable (hand tool or space-bar override)
  const isHandMode = activeTool === "hand";

  // Cursor based on tool
  const cursorClass =
    calibrationMode
      ? "cursor-crosshair"
      : activeTool === "hand"
        ? "cursor-grab"
        : activeTool === "eraser" ||
            activeTool === "draw_rect" ||
            activeTool === "draw_polygon" ||
            activeTool === "measure" ||
            activeTool === "utility_node" ||
            activeTool === "utility_edge"
          ? "cursor-crosshair"
          : "cursor-default";

  // Measure distance computation
  const measureDist = measureState
    ? Math.sqrt(
        (measureState.endXM - measureState.startXM) ** 2 +
          (measureState.endYM - measureState.startYM) ** 2,
      )
    : 0;

  // Stable Stage event handlers (avoid creating closures on every render)
  const handleStageDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool === "select" && e.target === e.target.getStage()) {
        const pos = getPointerMeters();
        if (pos && onQuickAdd) {
          onQuickAdd({ xM: snapM(pos.xM), yM: snapM(pos.yM) });
        }
      }
    },
    [activeTool, getPointerMeters, snapM, onQuickAdd],
  );

  const handleStageMouseLeave = useCallback(
    () => setCursorPosition(null),
    [setCursorPosition],
  );

  // --- Vertex drag commit ---
  const handleVertexDragEnd = useCallback(() => {
    if (!vertexDragState) return;

    const item = itemById.get(vertexDragState.itemId);
    if (!item || !resizePreview?.shapePoints) {
      setVertexDragState(null);
      setResizePreview(null);
      return;
    }

    const newShapePoints = resizePreview.shapePoints;
    const newBounds = {
      xM: resizePreview.xM,
      yM: resizePreview.yM,
      widthM: resizePreview.widthM,
      heightM: resizePreview.heightM,
    };
    const origBounds = vertexDragState.origBounds;
    const origShapePoints = vertexDragState.origShapePoints;

    const cmd = createResizeCommand({
      id: vertexDragState.itemId,
      oldBounds: origBounds,
      newBounds,
      async updateFn(id, data) {
        if (item.kind === "crop") {
          await updatePlacement({
            plantedCropId: id as any,
            fieldId: field._id,
            ...data,
            shapePoints: newShapePoints,
          });
        } else if (item.kind === "facility") {
          await updateFacility({ facilityId: id as any, fieldId: field._id, ...data });
        }
      },
    });

    // For undo: also restore old shape points
    const origUndo = cmd.undo;
    cmd.undo = async () => {
      await origUndo();
      if (item.kind === "crop") {
        await updatePlacement({
          plantedCropId: vertexDragState.itemId as any,
          fieldId: field._id,
          shapePoints: origShapePoints,
        });
      }
    };

    executeCommand(cmd);
    setVertexDragState(null);
    setResizePreview(null);
  }, [vertexDragState, resizePreview, itemById, field._id, updatePlacement, updateFacility, executeCommand]);

  const handleStageMouseUpCombined = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      handleStageMouseUp();
      if (resizeState) {
        handleResizeEnd();
      }
      if (vertexDragState) {
        handleVertexDragEnd();
      }
      if (activeTool !== "measure" && measureState) {
        setMeasureState(null);
      }
      if (activeTool === "draw_rect" || activeTool === "measure") {
        e.cancelBubble = true;
      }
    },
    [handleStageMouseUp, resizeState, handleResizeEnd, vertexDragState, handleVertexDragEnd, activeTool, measureState],
  );

  const handleContextMenuEvent = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!onContextMenu) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const transform = stage.getAbsoluteTransform().copy().invert();
      const realPos = transform.point(pos);
      const xM = realPos.x / PIXELS_PER_METER;
      const yM = realPos.y / PIXELS_PER_METER;

      const hitItem = canvasItems.find(
        (item) =>
          xM >= item.xM &&
          xM <= item.xM + item.widthM &&
          yM >= item.yM &&
          yM <= item.yM + item.heightM,
      );
      if (hitItem) {
        onContextMenu({
          x: e.clientX,
          y: e.clientY,
          itemId: hitItem.id,
          itemKind: hitItem.kind,
          hasActiveCrop: hitItem.kind === "crop" && hitItem.status !== "harvested" && hitItem.status !== "removed",
          status: hitItem.status,
        });
      }
    },
    [canvasItems, onContextMenu],
  );

  return (
    <div
      ref={containerRef}
      className={cn("size-full overflow-hidden", cursorClass, timelineMode && "opacity-75 saturate-[0.7]")}
      onContextMenu={handleContextMenuEvent}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={isHandMode}
        onDragEnd={handleStageDragEnd}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseLeave={handleStageMouseLeave}
        onMouseUp={handleStageMouseUpCombined}
      >
        {/* Layer 1: Grid lines + background image (static) */}
        <Layer listening={false}>
          {/* Field background */}
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="#f0fdf4"
            stroke="#86efac"
            strokeWidth={2}
          />

          {/* Background map image */}
          {bgImage && (
            <KonvaImage
              image={bgImage}
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              opacity={backgroundOpacity}
            />
          )}

          {/* Grid lines */}
          {gridLines.map((line) => {
            if (line.orientation === "vertical") {
              return (
                <Group key={`v-${line.position}`}>
                  <Line
                    points={[line.position, 0, line.position, canvasHeight]}
                    stroke={line.major ? "#d1d5db" : "#e5e7eb"}
                    strokeWidth={line.major ? 1.2 : 0.8}
                  />
                  {line.label && (
                    <Text
                      x={line.position + 2}
                      y={-16}
                      text={line.label}
                      fontSize={10}
                      fill="#9ca3af"
                    />
                  )}
                </Group>
              );
            }
            return (
              <Group key={`h-${line.position}`}>
                <Line
                  points={[0, line.position, canvasWidth, line.position]}
                  stroke={line.major ? "#d1d5db" : "#e5e7eb"}
                  strokeWidth={line.major ? 1.2 : 0.8}
                />
                {line.label && (
                  <Text
                    x={-28}
                    y={line.position + 2}
                    text={line.label}
                    fontSize={10}
                    fill="#9ca3af"
                  />
                )}
              </Group>
            );
          })}

          {/* Field dimensions label */}
          <Text
            x={canvasWidth / 2 - 40}
            y={canvasHeight + 8}
            text={`${fieldWidthM} \u00d7 ${fieldHeightM} m`}
            fontSize={12}
            fill="#6b7280"
          />
        </Layer>

        {/* Layer 2: Canvas items (crops + facilities) */}
        <Layer>
          {visibleCanvasItems.map((item) => {
            // Use resize preview dimensions if this item is being resized
            const rp = resizePreview?.id === item.id ? resizePreview : null;
            const renderXM = rp ? rp.xM : item.xM;
            const renderYM = rp ? rp.yM : item.yM;
            const renderWM = rp ? rp.widthM : item.widthM;
            const renderHM = rp ? rp.heightM : item.heightM;
            const renderShapePoints = rp?.shapePoints !== undefined ? rp.shapePoints : item.shapePoints;

            const xPx = renderXM * PIXELS_PER_METER;
            const yPx = renderYM * PIXELS_PER_METER;
            const wPx = renderWM * PIXELS_PER_METER;
            const hPx = renderHM * PIXELS_PER_METER;
            const isSelected = selectedSet.has(item.id);
            const isHovered = hoveredItemId === item.id;
            const isHarvested = item.status === "harvested";
            const isDraggable =
              activeTool === "select" &&
              item.status !== "harvested" &&
              item.status !== "removed";

            // Check if this item has polygon shape points
            const hasPolygonShape = renderShapePoints && renderShapePoints.length >= 3;

            // Calculate label position: centroid for polygons, center for rectangles
            let labelX: number;
            let labelY: number;
            if (hasPolygonShape) {
              const centroidX = renderShapePoints!.reduce((s, p) => s + p.x, 0) / renderShapePoints!.length;
              const centroidY = renderShapePoints!.reduce((s, p) => s + p.y, 0) / renderShapePoints!.length;
              labelX = (centroidX - renderXM) * PIXELS_PER_METER;
              labelY = (centroidY - renderYM) * PIXELS_PER_METER;
            } else {
              labelX = wPx / 2;
              labelY = hPx / 2;
            }

            return (
              <Group
                key={item.id}
                x={xPx}
                y={yPx}
                draggable={isDraggable}
                onDragStart={() => handleItemDragStart(item.id)}
                onDragMove={snapEnabled ? handleItemDragMove : undefined}
                onDragEnd={(e) => handleItemDragEnd(item.id, e)}
                onClick={(e) => handleItemClick(item.id, e)}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                {/* Shape: polygon or rectangle */}
                {hasPolygonShape ? (
                  <Line
                    points={renderShapePoints!.flatMap(p => [
                      (p.x - renderXM) * PIXELS_PER_METER,
                      (p.y - renderYM) * PIXELS_PER_METER,
                    ])}
                    closed
                    fill={isHarvested ? "#9ca3af44" : `${item.color}40`}
                    stroke={
                      isSelected
                        ? "#16a34a"
                        : isHovered
                          ? "#3b82f6"
                          : isHarvested
                            ? "#6b7280"
                            : item.color
                    }
                    strokeWidth={isSelected ? 2 : 1}
                    dash={isHarvested ? [4, 4] : undefined}
                    shadowColor={isSelected ? "#16a34a" : "transparent"}
                    shadowBlur={isSelected ? 8 : 0}
                  />
                ) : (
                  <Rect
                    x={0}
                    y={0}
                    width={wPx}
                    height={hPx}
                    fill={isHarvested ? "#9ca3af44" : `${item.color}40`}
                    stroke={
                      isSelected
                        ? "#16a34a"
                        : isHovered
                          ? "#3b82f6"
                          : isHarvested
                            ? "#6b7280"
                            : item.color
                    }
                    strokeWidth={isSelected ? 2 : 1}
                    dash={isHarvested ? [4, 4] : undefined}
                    cornerRadius={4}
                    shadowColor={isSelected ? "#16a34a" : "transparent"}
                    shadowBlur={isSelected ? 8 : 0}
                  />
                )}

                {/* Centered Emoji */}
                <Text
                  x={labelX - wPx / 2}
                  y={labelY - 18}
                  width={wPx}
                  align="center"
                  text={item.emoji}
                  fontSize={16}
                  listening={false}
                />

                {/* Centered Label */}
                <Text
                  x={labelX - wPx / 2}
                  y={labelY}
                  width={wPx}
                  align="center"
                  text={item.label}
                  fontSize={10}
                  fill="#374151"
                  listening={false}
                />

                {/* Status for harvested */}
                {isHarvested && (
                  <Text
                    x={labelX - wPx / 2}
                    y={labelY + 14}
                    width={wPx}
                    align="center"
                    text="\u5df2\u6536\u6210"
                    fontSize={11}
                    fill="#4b5563"
                    listening={false}
                  />
                )}

                {/* Dimensions on select */}
                {isSelected && (
                  <Text
                    x={0}
                    y={hPx + 4}
                    text={`${renderWM.toFixed(1)} \u00d7 ${renderHM.toFixed(1)} m`}
                    fontSize={9}
                    fill="#16a34a"
                    listening={false}
                  />
                )}

                {/* Handles: polygon vertex handles or bounding-box resize handles */}
                {isSelected && isDraggable && (
                  hasPolygonShape ? (
                    <PolygonVertexHandles
                      itemId={item.id}
                      shapePoints={renderShapePoints!}
                      originXM={renderXM}
                      originYM={renderYM}
                      scale={zoom}
                      onVertexDragStart={handleVertexDragStart}
                    />
                  ) : (
                    <ResizeHandles
                      itemId={item.id}
                      xPx={0}
                      yPx={0}
                      wPx={wPx}
                      hPx={hPx}
                      scale={zoom}
                      onResizeStart={handleResizeStart}
                    />
                  )
                )}
              </Group>
            );
          })}
        </Layer>

        {/* Layer 3: Utility edges + nodes */}
        <Layer>
          {/* Utility edges */}
          {visibleUtilityEdges.map((edge) => {
            const from = utilityNodeById.get(edge.fromNodeId);
            const to = utilityNodeById.get(edge.toNodeId);
            if (!from || !to) return null;
            // Issue 4: Use dragging positions if node is being dragged
            const fromPos = draggingNodePositions.get(edge.fromNodeId) ?? { xM: Number(from.xM), yM: Number(from.yM) };
            const toPos = draggingNodePositions.get(edge.toNodeId) ?? { xM: Number(to.xM), yM: Number(to.yM) };
            return (
              <Line
                key={edge._id}
                points={[
                  fromPos.xM * PIXELS_PER_METER,
                  fromPos.yM * PIXELS_PER_METER,
                  toPos.xM * PIXELS_PER_METER,
                  toPos.yM * PIXELS_PER_METER,
                ]}
                stroke={edge.kind === "water" ? "#0ea5e9" : "#f97316"}
                strokeWidth={3}
                dash={edge.kind === "water" ? [6, 4] : undefined}
                listening={false}
              />
            );
          })}

          {/* Utility nodes (draggable) */}
          {visibleUtilityNodes.map((node) => {
            const isEdgeSource = pendingEdgeFromNodeId === node._id;
            const isNodeSelected = selectedSet.has(node._id);
            return (
              <Group
                key={node._id}
                x={Number(node.xM) * PIXELS_PER_METER}
                y={Number(node.yM) * PIXELS_PER_METER}
                draggable={activeTool === "select"}
                onDragMove={(e) => handleUtilityNodeDragMove(node._id, e)}
                onDragEnd={(e) => handleUtilityNodeDragEnd(node._id, e)}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === "eraser") {
                    deleteUtilityNode({ nodeId: node._id as any });
                    return;
                  }
                  if (activeTool === "select") {
                    if (e.evt.shiftKey) {
                      toggleSelect(node._id);
                    } else {
                      select(node._id);
                    }
                    return;
                  }
                  if (activeTool === "utility_edge") {
                    if (!pendingEdgeFromNodeId) {
                      setPendingEdgeFromNodeId(node._id);
                    } else if (pendingEdgeFromNodeId !== node._id) {
                      // Issue 2: Set pending edge for optimistic rendering
                      onConnectUtilityNodes?.(pendingEdgeFromNodeId, node._id);
                      setPendingEdgeFromNodeId(null);
                      setEdgeCursorPos(null);
                    }
                    return;
                  }
                }}
              >
                {/* Invisible hit area — larger clickable zone for utility_edge and other tools */}
                <Circle
                  x={0}
                  y={0}
                  radius={16}
                  fill="transparent"
                  listening={true}
                />
                {/* Highlight ring for edge source or selected node */}
                {(isEdgeSource || isNodeSelected) && (
                  <Circle
                    x={0}
                    y={0}
                    radius={12}
                    fill="transparent"
                    stroke={isEdgeSource ? "#f59e0b" : "#16a34a"}
                    strokeWidth={2}
                    dash={isEdgeSource ? [4, 2] : undefined}
                    listening={false}
                  />
                )}
                <Circle
                  x={0}
                  y={0}
                  radius={7}
                  fill={node.kind === "water" ? "#0ea5e9" : "#fb923c"}
                  stroke="#1f2937"
                  strokeWidth={1}
                  listening={true}
                  hitStrokeWidth={12}
                />
                <Text
                  x={8}
                  y={-6}
                  text={node.label}
                  fontSize={10}
                  fill={node.kind === "water" ? "#0369a1" : "#9a3412"}
                  listening={false}
                />
                {/* Node type label below circle — skip if same as node.label */}
                {(() => {
                  const typeLabel = node.nodeType ? (UTILITY_NODE_TYPE_LABELS[node.nodeType] ?? node.nodeType) : (node.kind === "water" ? "水管" : "電線");
                  if (node.label === typeLabel) return null;
                  return (
                    <Text
                      x={-20}
                      y={10}
                      width={40}
                      align="center"
                      text={typeLabel}
                      fontSize={8}
                      fill="#6b7280"
                      listening={false}
                    />
                  );
                })()}
              </Group>
            );
          })}

        </Layer>

        {/* Layer 4: Overlays (selection handles, snap guides, draw preview, measure, calibration) */}
        <Layer listening={false}>
          {/* Smart alignment guides */}
          {activeGuides.map((guide, i) => (
            <Line
              key={`guide-${i}`}
              points={
                guide.orientation === "vertical"
                  ? [guide.positionM * PIXELS_PER_METER, 0, guide.positionM * PIXELS_PER_METER, canvasHeight]
                  : [0, guide.positionM * PIXELS_PER_METER, canvasWidth, guide.positionM * PIXELS_PER_METER]
              }
              stroke="#f97316"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          ))}

          {/* Overlap conflict warnings */}
          {overlaps.map((overlap, i) => (
            <Group key={`overlap-${i}`} x={overlap.xPx} y={overlap.yPx} listening={false}>
              <Circle radius={8} fill="#facc15" stroke="#ca8a04" strokeWidth={1.5} />
              <Text text="!" x={-3} y={-6} fontSize={12} fontStyle="bold" fill="#854d0e" />
              <Text
                text={`${overlap.item1Name} ↔ ${overlap.item2Name} 重疊`}
                x={12} y={-6} fontSize={10} fill="#854d0e"
              />
            </Group>
          ))}

          {/* Draw rect preview */}
          {drawRectState && (
            <Rect
              x={
                Math.min(drawRectState.startXM, drawRectState.endXM) *
                PIXELS_PER_METER
              }
              y={
                Math.min(drawRectState.startYM, drawRectState.endYM) *
                PIXELS_PER_METER
              }
              width={
                Math.abs(drawRectState.endXM - drawRectState.startXM) *
                PIXELS_PER_METER
              }
              height={
                Math.abs(drawRectState.endYM - drawRectState.startYM) *
                PIXELS_PER_METER
              }
              fill="#22c55e20"
              stroke="#22c55e"
              strokeWidth={2}
              dash={[6, 3]}
              listening={false}
            />
          )}

          {/* Marquee selection preview */}
          {marqueeState && (
            <Rect
              x={
                Math.min(marqueeState.startXM, marqueeState.endXM) *
                PIXELS_PER_METER
              }
              y={
                Math.min(marqueeState.startYM, marqueeState.endYM) *
                PIXELS_PER_METER
              }
              width={
                Math.abs(marqueeState.endXM - marqueeState.startXM) *
                PIXELS_PER_METER
              }
              height={
                Math.abs(marqueeState.endYM - marqueeState.startYM) *
                PIXELS_PER_METER
              }
              fill="#3b82f620"
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}

          {/* Polygon draw preview */}
          {polygonPoints.length > 0 && activeTool === "draw_polygon" && (
            <Group listening={false}>
              {/* Completed segments */}
              {polygonPoints.length >= 2 && (
                <Line
                  points={polygonPoints.flatMap(p => [p.xM * PIXELS_PER_METER, p.yM * PIXELS_PER_METER])}
                  stroke="#22c55e"
                  strokeWidth={2}
                  dash={[6, 3]}
                />
              )}
              {/* Preview line to cursor */}
              {polygonCursorPos && polygonPoints.length > 0 && (
                <Line
                  points={[
                    polygonPoints[polygonPoints.length - 1].xM * PIXELS_PER_METER,
                    polygonPoints[polygonPoints.length - 1].yM * PIXELS_PER_METER,
                    polygonCursorPos.xM * PIXELS_PER_METER,
                    polygonCursorPos.yM * PIXELS_PER_METER,
                  ]}
                  stroke="#22c55e80"
                  strokeWidth={1}
                  dash={[4, 4]}
                />
              )}
              {/* Vertex dots */}
              {polygonPoints.map((pt, i) => (
                <Circle
                  key={i}
                  x={pt.xM * PIXELS_PER_METER}
                  y={pt.yM * PIXELS_PER_METER}
                  radius={i === 0 && polygonPoints.length >= 3 ? 8 : 4}
                  fill={i === 0 ? "#22c55e" : "#16a34a"}
                  stroke="#15803d"
                  strokeWidth={1}
                />
              ))}
            </Group>
          )}

          {/* Utility edge preview line */}
          {pendingEdgeFromNodeId && edgeCursorPos && activeTool === "utility_edge" && (() => {
            const fromNode = utilityNodeById.get(pendingEdgeFromNodeId);
            if (!fromNode) return null;
            return (
              <Line
                points={[
                  Number(fromNode.xM) * PIXELS_PER_METER,
                  Number(fromNode.yM) * PIXELS_PER_METER,
                  edgeCursorPos.xM * PIXELS_PER_METER,
                  edgeCursorPos.yM * PIXELS_PER_METER,
                ]}
                stroke="#f59e0b"
                strokeWidth={2}
                dash={[6, 4]}
                listening={false}
              />
            );
          })()}

          {/* Calibration overlay */}
          {calibrationMode && calibrationPoints.map((pt, i) => (
            <Group key={`cal-${i}`} listening={false}>
              <Circle
                x={pt.xM * PIXELS_PER_METER}
                y={pt.yM * PIXELS_PER_METER}
                radius={6}
                stroke="red"
                strokeWidth={2}
                fill="transparent"
              />
              <Line
                points={[
                  pt.xM * PIXELS_PER_METER - 10, pt.yM * PIXELS_PER_METER,
                  pt.xM * PIXELS_PER_METER + 10, pt.yM * PIXELS_PER_METER,
                ]}
                stroke="red"
                strokeWidth={1}
              />
              <Line
                points={[
                  pt.xM * PIXELS_PER_METER, pt.yM * PIXELS_PER_METER - 10,
                  pt.xM * PIXELS_PER_METER, pt.yM * PIXELS_PER_METER + 10,
                ]}
                stroke="red"
                strokeWidth={1}
              />
              <Text
                x={pt.xM * PIXELS_PER_METER + 8}
                y={pt.yM * PIXELS_PER_METER - 12}
                text={`點 ${i + 1}`}
                fill="red"
                fontSize={12}
              />
            </Group>
          ))}
          {calibrationMode && calibrationPoints.length === 2 && (() => {
            const p0 = calibrationPoints[0];
            const p1 = calibrationPoints[1];
            const dx = p1.xM - p0.xM;
            const dy = p1.yM - p0.yM;
            const distM = Math.sqrt(dx * dx + dy * dy);
            return (
              <Group listening={false}>
                <Line
                  points={[
                    p0.xM * PIXELS_PER_METER, p0.yM * PIXELS_PER_METER,
                    p1.xM * PIXELS_PER_METER, p1.yM * PIXELS_PER_METER,
                  ]}
                  stroke="red"
                  strokeWidth={1}
                  dash={[6, 4]}
                />
                <Text
                  x={((p0.xM + p1.xM) / 2) * PIXELS_PER_METER + 6}
                  y={((p0.yM + p1.yM) / 2) * PIXELS_PER_METER - 14}
                  text={`${distM.toFixed(2)} m (地圖)`}
                  fill="red"
                  fontSize={11}
                  fontStyle="bold"
                />
              </Group>
            );
          })()}

          {/* Measure tool overlay */}
          {measureState && (
            <Group listening={false}>
              <Line
                points={[
                  measureState.startXM * PIXELS_PER_METER,
                  measureState.startYM * PIXELS_PER_METER,
                  measureState.endXM * PIXELS_PER_METER,
                  measureState.endYM * PIXELS_PER_METER,
                ]}
                stroke="#ef4444"
                strokeWidth={2}
                dash={[8, 4]}
              />
              {/* Start point */}
              <Circle
                x={measureState.startXM * PIXELS_PER_METER}
                y={measureState.startYM * PIXELS_PER_METER}
                radius={4}
                fill="#ef4444"
              />
              {/* End point */}
              <Circle
                x={measureState.endXM * PIXELS_PER_METER}
                y={measureState.endYM * PIXELS_PER_METER}
                radius={4}
                fill="#ef4444"
              />
              {/* Distance label */}
              {measureDist > 0.01 && (
                <Group>
                  <Rect
                    x={
                      ((measureState.startXM + measureState.endXM) / 2) *
                        PIXELS_PER_METER -
                      30
                    }
                    y={
                      ((measureState.startYM + measureState.endYM) / 2) *
                        PIXELS_PER_METER -
                      12
                    }
                    width={60}
                    height={20}
                    fill="#1f2937"
                    cornerRadius={4}
                  />
                  <Text
                    x={
                      ((measureState.startXM + measureState.endXM) / 2) *
                        PIXELS_PER_METER -
                      26
                    }
                    y={
                      ((measureState.startYM + measureState.endYM) / 2) *
                        PIXELS_PER_METER -
                      8
                    }
                    text={`${measureDist.toFixed(2)} m`}
                    fontSize={11}
                    fill="#ffffff"
                    fontStyle="bold"
                  />
                </Group>
              )}
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resize handles — interactive
// ---------------------------------------------------------------------------

const HANDLE_DIRS: { dir: HandleDir; getPos: (x: number, y: number, w: number, h: number) => { x: number; y: number }; cursor: string }[] = [
  { dir: "nw", getPos: (x, y) => ({ x, y }), cursor: "nwse-resize" },
  { dir: "n", getPos: (x, y, w) => ({ x: x + w / 2, y }), cursor: "ns-resize" },
  { dir: "ne", getPos: (x, y, w) => ({ x: x + w, y }), cursor: "nesw-resize" },
  { dir: "e", getPos: (x, y, w, h) => ({ x: x + w, y: y + h / 2 }), cursor: "ew-resize" },
  { dir: "se", getPos: (x, y, w, h) => ({ x: x + w, y: y + h }), cursor: "nwse-resize" },
  { dir: "s", getPos: (x, y, w, h) => ({ x: x + w / 2, y: y + h }), cursor: "ns-resize" },
  { dir: "sw", getPos: (x, y, _w, h) => ({ x, y: y + h }), cursor: "nesw-resize" },
  { dir: "w", getPos: (x, y, _w, h) => ({ x, y: y + h / 2 }), cursor: "ew-resize" },
];

function ResizeHandles({
  itemId,
  xPx,
  yPx,
  wPx,
  hPx,
  scale,
  onResizeStart,
}: {
  itemId: string;
  xPx: number;
  yPx: number;
  wPx: number;
  hPx: number;
  scale: number;
  onResizeStart: (itemId: string, dir: HandleDir) => void;
}) {
  const hs = HANDLE_SIZE / scale;
  const half = hs / 2;

  return (
    <>
      {HANDLE_DIRS.map(({ dir, getPos }) => {
        const pos = getPos(xPx, yPx, wPx, hPx);
        return (
          <Rect
            key={dir}
            x={pos.x - half}
            y={pos.y - half}
            width={hs}
            height={hs}
            fill="#22c55e"
            stroke="#166534"
            strokeWidth={1}
            cornerRadius={1}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              onResizeStart(itemId, dir);
            }}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Polygon vertex handles — renders a handle at each vertex position
// ---------------------------------------------------------------------------

function PolygonVertexHandles({
  itemId,
  shapePoints,
  originXM,
  originYM,
  scale,
  onVertexDragStart,
}: {
  itemId: string;
  shapePoints: { x: number; y: number }[];
  originXM: number;
  originYM: number;
  scale: number;
  onVertexDragStart: (itemId: string, vertexIndex: number) => void;
}) {
  const radius = (HANDLE_SIZE / 2) / scale;

  return (
    <>
      {shapePoints.map((pt, i) => (
        <Circle
          key={`vertex-${i}`}
          x={(pt.x - originXM) * PIXELS_PER_METER}
          y={(pt.y - originYM) * PIXELS_PER_METER}
          radius={radius}
          fill="#22c55e"
          stroke="#166534"
          strokeWidth={1}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            onVertexDragStart(itemId, i);
          }}
        />
      ))}
    </>
  );
}
