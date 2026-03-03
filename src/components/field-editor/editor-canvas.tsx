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
  useDeleteFacility,
  useCreateFacility,
  useUpdateFacility,
  useUpdateUtilityNode,
} from "@/hooks/use-fields";
import {
  createMoveCommand,
  createDeleteCommand,
  createResizeCommand,
} from "@/lib/store/editor-commands";
import { buildPlannerGridLines, snapToGrid } from "@/lib/utils/planner-grid";
import type { PlannerGridSizeMeters } from "@/lib/utils/planner-grid-settings";

// ---------------------------------------------------------------------------
// Types — derived from getFieldById() return shape
// ---------------------------------------------------------------------------

type FieldData = NonNullable<
  Awaited<ReturnType<typeof import("@/server/actions/fields").getFieldById>>
>;

type PlacementRow = FieldData["placements"][number];

// Merged shape for canvas rendering
interface CanvasItem {
  id: string; // placement id for crops, facility id for facilities
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
}

// Resize handle directions
type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface ResizeState {
  itemId: string;
  dir: HandleDir;
  startXPx: number;
  startYPx: number;
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
  onPlaceUtilityNode?: (pos: { xM: number; yM: number }) => void;
  onConnectUtilityNodes?: (fromNodeId: string, toNodeId: string) => void;
  onQuickAdd?: (pos: { xM: number; yM: number }) => void;
}

export function EditorCanvas({ field, onDrawRectComplete, onPlaceUtilityNode, onConnectUtilityNodes, onQuickAdd }: EditorCanvasProps) {
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
  const backgroundImage = useFieldEditor((s) => s.backgroundImage);
  const backgroundOpacity = useFieldEditor((s) => s.backgroundOpacity);
  const timelineMode = useFieldEditor((s) => s.timelineMode);
  const timelineDate = useFieldEditor((s) => s.timelineDate);

  // Mutations
  const updatePlacement = useUpdateCropPlacement();
  const removePlantedCrop = useRemovePlantedCrop();
  const restorePlantedCrop = useRestorePlantedCrop();
  const deleteFacility = useDeleteFacility();
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const updateUtilityNode = useUpdateUtilityNode();

  // Background image for map import
  const bgImage = useKonvaImage(backgroundImage);

  // Local interaction state
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [dragStartPositions, setDragStartPositions] = useState<Map<
    string,
    { xM: number; yM: number }
  > | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
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

  // Clear edge pending state when switching away from utility_edge
  useEffect(() => {
    if (activeTool === "utility_edge") {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && pendingEdgeFromNodeId) {
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
  }, [activeTool, pendingEdgeFromNodeId]);

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

  // Build a placement lookup for crops
  const placementByPlantedCropId = useMemo(() => {
    const map = new Map<string, PlacementRow>();
    for (const p of field.placements) {
      map.set(p.plantedCropId, p);
    }
    return map;
  }, [field.placements]);

  // Build canvas items (crops + facilities merged into one list)
  const canvasItems = useMemo<CanvasItem[]>(() => {
    const items: CanvasItem[] = [];

    for (const row of field.plantedCrops) {
      const placement = placementByPlantedCropId.get(row.plantedCrop.id);
      if (!placement) continue;

      // Handle unassigned regions (crop is null from leftJoin)
      const crop = row.crop;
      items.push({
        id: placement.id,
        kind: "crop",
        xM: Number(placement.xM),
        yM: Number(placement.yM),
        widthM: Number(placement.widthM),
        heightM: Number(placement.heightM),
        label: crop ? `${crop.emoji} ${crop.name}` : "未指定作物",
        emoji: crop?.emoji ?? "",
        color: crop?.color ?? "#d1d5db",
        status: row.plantedCrop.status,
        cropId: crop?.id,
        plantedCropId: row.plantedCrop.id,
        plantedDate: row.plantedCrop.plantedDate,
        harvestedDate: row.plantedCrop.harvestedDate,
      });
    }

    for (const fac of field.facilities) {
      items.push({
        id: fac.id,
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
  }, [field.plantedCrops, field.facilities, placementByPlantedCropId]);

  // Utility nodes / edges
  const utilityNodes = field.utilityNodes;
  const utilityEdges = field.utilityEdges;
  const utilityNodeById = useMemo(
    () => new Map(utilityNodes.map((n) => [n.id, n])),
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
    const result: { xPx: number; yPx: number }[] = [];
    for (let i = 0; i < cropItems.length; i++) {
      for (let j = i + 1; j < cropItems.length; j++) {
        const a = cropItems[i];
        const b = cropItems[j];
        // Check rectangle intersection
        const intersects = !(
          a.xM + a.widthM <= b.xM ||
          b.xM + b.widthM <= a.xM ||
          a.yM + a.heightM <= b.yM ||
          b.yM + b.heightM <= a.yM
        );
        if (intersects) {
          // Midpoint between the two items' centers
          const aCx = a.xM + a.widthM / 2;
          const aCy = a.yM + a.heightM / 2;
          const bCx = b.xM + b.widthM / 2;
          const bCy = b.yM + b.heightM / 2;
          result.push({
            xPx: ((aCx + bCx) / 2) * PIXELS_PER_METER,
            yPx: ((aCy + bCy) / 2) * PIXELS_PER_METER,
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

  // Snap helper (works in meters)
  const snapM = useCallback(
    (m: number): number => {
      if (!snapEnabled) return m;
      return snapToGrid(m, gridSpacing, 0);
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
      // Don't clear selection when using polygon tool (clicks add vertices)
      if (activeTool === "draw_polygon") return;

      // Utility node tool: place a node on stage click
      if (activeTool === "utility_node" && e.target === e.target.getStage()) {
        const pos = getPointerMeters();
        if (pos && onPlaceUtilityNode) {
          onPlaceUtilityNode({ xM: snapM(pos.xM), yM: snapM(pos.yM) });
        }
        return;
      }

      // Utility edge tool: cancel on empty stage click (no node hit)
      if (activeTool === "utility_edge") return;

      if (e.target === e.target.getStage()) {
        clearSelection();
      }
    },
    [clearSelection, activeTool, getPointerMeters, snapM, onPlaceUtilityNode],
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
            // Close polygon: compute bounding box
            const xs = polygonPoints.map((p) => p.xM);
            const ys = polygonPoints.map((p) => p.yM);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const w = maxX - minX;
            const h = maxY - minY;
            if (w >= MIN_SIZE_M && h >= MIN_SIZE_M) {
              onDrawRectComplete?.({ xM: minX, yM: minY, widthM: w, heightM: h });
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
    [activeTool, getPointerMeters, snapM, polygonPoints, zoom, onDrawRectComplete],
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

      // Handle resize drag
      if (resizeState) {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const stagePos = stage.getPointerPosition();
        if (!stagePos) return;
        const transform = stage.getAbsoluteTransform().copy().invert();
        const realPos = transform.point(stagePos);
        // Store current pixel position to compute final bounds on mouse up
        setResizeState((prev) =>
          prev ? { ...prev, startXPx: realPos.x, startYPx: realPos.y } : null,
        );
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

        // Snapshot facility data for undo re-creation
        const facilitySnapshot = item.kind === "facility" ? {
          facilityType: item.facilityType ?? "custom",
          name: item.label,
          xM: item.xM,
          yM: item.yM,
          widthM: item.widthM,
          heightM: item.heightM,
        } : null;

        const cmd = createDeleteCommand({
          ids: [itemId],
          async deleteFn(id) {
            const target = itemById.get(id);
            if (!target) return;
            if (target.kind === "crop" && target.plantedCropId) {
              await removePlantedCrop.mutateAsync(target.plantedCropId);
            } else if (target.kind === "facility") {
              await deleteFacility.mutateAsync({
                id: target.id,
                fieldId: field.id,
              });
            }
          },
          async restoreFn(id) {
            const target = itemById.get(id);
            if (target?.kind === "crop" && target.plantedCropId) {
              await restorePlantedCrop.mutateAsync(target.plantedCropId);
            } else if (facilitySnapshot) {
              await createFacility.mutateAsync({
                fieldId: field.id,
                data: facilitySnapshot as Parameters<typeof createFacility.mutateAsync>[0]["data"],
              });
            }
          },
        });
        executeCommand(cmd);
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
      executeCommand,
      itemById,
      removePlantedCrop,
      restorePlantedCrop,
      deleteFacility,
      createFacility,
      field.id,
    ],
  );

  const handleItemDragStart = useCallback(() => {
    if (activeTool !== "select") return;
    const positions = new Map<string, { xM: number; yM: number }>();
    for (const id of selectedIds) {
      const item = itemById.get(id);
      if (item) positions.set(id, { xM: item.xM, yM: item.yM });
    }
    setDragStartPositions(positions);
  }, [activeTool, selectedIds, itemById]);

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
            await updatePlacement.mutateAsync({
              placementId: id,
              fieldId: field.id,
              data: { xM: data.xM, yM: data.yM },
            });
          } else if (target.kind === "facility") {
            await updateFacility.mutateAsync({
              id,
              fieldId: field.id,
              data: { xM: data.xM, yM: data.yM },
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
      field.id,
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
      });
    },
    [itemById],
  );

  const handleResizeEnd = useCallback(() => {
    if (!resizeState) return;
    const item = itemById.get(resizeState.itemId);
    if (!item) {
      setResizeState(null);
      return;
    }

    // Compute the new position from where the handle ended up
    const stage = stageRef.current;
    if (!stage) {
      setResizeState(null);
      return;
    }
    const pos = stage.getPointerPosition();
    if (!pos) {
      setResizeState(null);
      return;
    }
    const transform = stage.getAbsoluteTransform().copy().invert();
    const realPos = transform.point(pos);

    const curXM = snapM(realPos.x / PIXELS_PER_METER);
    const curYM = snapM(realPos.y / PIXELS_PER_METER);

    const orig = resizeState.origBounds;
    let newX = orig.xM;
    let newY = orig.yM;
    let newW = orig.widthM;
    let newH = orig.heightM;

    const dir = resizeState.dir;

    // Compute new bounds based on handle direction
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

    // Snap new dimensions
    newX = snapM(newX);
    newY = snapM(newY);
    newW = snapM(newW) || MIN_SIZE_M;
    newH = snapM(newH) || MIN_SIZE_M;

    const newBounds = { xM: newX, yM: newY, widthM: newW, heightM: newH };

    // Skip if nothing changed
    if (
      Math.abs(newX - orig.xM) < 0.001 &&
      Math.abs(newY - orig.yM) < 0.001 &&
      Math.abs(newW - orig.widthM) < 0.001 &&
      Math.abs(newH - orig.heightM) < 0.001
    ) {
      setResizeState(null);
      return;
    }

    const cmd = createResizeCommand({
      id: resizeState.itemId,
      oldBounds: orig,
      newBounds,
      async updateFn(id, data) {
        if (item.kind === "crop") {
          await updatePlacement.mutateAsync({
            placementId: id,
            fieldId: field.id,
            data,
          });
        } else if (item.kind === "facility") {
          await updateFacility.mutateAsync({
            id,
            fieldId: field.id,
            data,
          });
        }
      },
    });

    executeCommand(cmd);
    setResizeState(null);
  }, [
    resizeState,
    itemById,
    snapM,
    field.id,
    updatePlacement,
    updateFacility,
    executeCommand,
  ]);

  // --- Utility node drag ---
  const handleUtilityNodeDragEnd = useCallback(
    (nodeId: string, e: KonvaEventObject<DragEvent>) => {
      const newXM = snapM(e.target.x() / PIXELS_PER_METER);
      const newYM = snapM(e.target.y() / PIXELS_PER_METER);

      updateUtilityNode.mutate({
        id: nodeId,
        fieldId: field.id,
        data: { xM: newXM, yM: newYM },
      });
    },
    [snapM, field.id, updateUtilityNode],
  );

  // Whether stage is draggable (hand tool or space-bar override)
  const isHandMode = activeTool === "hand";

  // Cursor based on tool
  const cursorClass =
    activeTool === "hand"
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

  return (
    <div ref={containerRef} className={cn("size-full overflow-hidden", cursorClass, timelineMode && "opacity-75 saturate-[0.7]")}>
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
        onDblClick={(e) => {
          if (activeTool === "select" && e.target === e.target.getStage()) {
            const pos = getPointerMeters();
            if (pos && onQuickAdd) {
              onQuickAdd({ xM: snapM(pos.xM), yM: snapM(pos.yM) });
            }
          }
        }}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseLeave={() => setCursorPosition(null)}
        onMouseUp={(e) => {
          handleStageMouseUp();
          if (resizeState) {
            handleResizeEnd();
          }
          // Clear measure on next click
          if (activeTool !== "measure" && measureState) {
            setMeasureState(null);
          }
          // Prevent stage drag interference
          if (activeTool === "draw_rect" || activeTool === "measure") {
            e.cancelBubble = true;
          }
        }}
      >
        <Layer>
          {/* Field background */}
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="#f0fdf4"
            stroke="#86efac"
            strokeWidth={2}
            listening={false}
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
              listening={false}
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
                    listening={false}
                  />
                  {line.label && (
                    <Text
                      x={line.position + 2}
                      y={-16}
                      text={line.label}
                      fontSize={10}
                      fill="#9ca3af"
                      listening={false}
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
                  listening={false}
                />
                {line.label && (
                  <Text
                    x={-28}
                    y={line.position + 2}
                    text={line.label}
                    fontSize={10}
                    fill="#9ca3af"
                    listening={false}
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
            listening={false}
          />

          {/* Utility edges */}
          {visibleUtilityEdges.map((edge) => {
            const from = utilityNodeById.get(edge.fromNodeId);
            const to = utilityNodeById.get(edge.toNodeId);
            if (!from || !to) return null;
            return (
              <Line
                key={edge.id}
                points={[
                  Number(from.xM) * PIXELS_PER_METER,
                  Number(from.yM) * PIXELS_PER_METER,
                  Number(to.xM) * PIXELS_PER_METER,
                  Number(to.yM) * PIXELS_PER_METER,
                ]}
                stroke={edge.kind === "water" ? "#0284c7" : "#f97316"}
                strokeWidth={3}
                dash={edge.kind === "water" ? [6, 4] : undefined}
                listening={false}
              />
            );
          })}

          {/* Utility nodes (draggable) */}
          {visibleUtilityNodes.map((node) => {
            const isEdgeSource = pendingEdgeFromNodeId === node.id;
            const isNodeSelected = selectedSet.has(node.id);
            return (
              <Group
                key={node.id}
                x={Number(node.xM) * PIXELS_PER_METER}
                y={Number(node.yM) * PIXELS_PER_METER}
                draggable={activeTool === "select"}
                onDragEnd={(e) => handleUtilityNodeDragEnd(node.id, e)}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === "select") {
                    if (e.evt.shiftKey) {
                      toggleSelect(node.id);
                    } else {
                      select(node.id);
                    }
                    return;
                  }
                  if (activeTool === "utility_edge") {
                    if (!pendingEdgeFromNodeId) {
                      setPendingEdgeFromNodeId(node.id);
                    } else if (pendingEdgeFromNodeId !== node.id) {
                      onConnectUtilityNodes?.(pendingEdgeFromNodeId, node.id);
                      setPendingEdgeFromNodeId(null);
                      setEdgeCursorPos(null);
                    }
                    return;
                  }
                }}
              >
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
                />
                <Text
                  x={8}
                  y={-6}
                  text={node.label}
                  fontSize={10}
                  fill={node.kind === "water" ? "#0369a1" : "#9a3412"}
                  listening={false}
                />
              </Group>
            );
          })}

          {/* Canvas items (crops + facilities) */}
          {visibleCanvasItems.map((item) => {
            const xPx = item.xM * PIXELS_PER_METER;
            const yPx = item.yM * PIXELS_PER_METER;
            const wPx = item.widthM * PIXELS_PER_METER;
            const hPx = item.heightM * PIXELS_PER_METER;
            const isSelected = selectedSet.has(item.id);
            const isHovered = hoveredItemId === item.id;
            const isHarvested = item.status === "harvested";
            const isDraggable =
              activeTool === "select" &&
              item.status !== "harvested" &&
              item.status !== "removed";

            return (
              <Group key={item.id}>
                <Rect
                  x={xPx}
                  y={yPx}
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
                  draggable={isDraggable}
                  onDragStart={handleItemDragStart}
                  onDragMove={snapEnabled ? (e) => {
                    const newXM = e.target.x() / PIXELS_PER_METER;
                    const newYM = e.target.y() / PIXELS_PER_METER;
                    const others = canvasItems.filter(ci => !selectedSet.has(ci.id));
                    const result = computeSnapGuides(
                      { xM: newXM, yM: newYM, widthM: item.widthM, heightM: item.heightM },
                      others,
                      fieldWidthM,
                      fieldHeightM,
                    );
                    setActiveGuides(result.guides);
                    if (result.snappedXM !== null) e.target.x(result.snappedXM * PIXELS_PER_METER);
                    if (result.snappedYM !== null) e.target.y(result.snappedYM * PIXELS_PER_METER);
                  } : undefined}
                  onDragEnd={(e) => handleItemDragEnd(item.id, e)}
                  onClick={(e) => handleItemClick(item.id, e)}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  shadowColor={isSelected ? "#16a34a" : "transparent"}
                  shadowBlur={isSelected ? 8 : 0}
                />

                {/* Emoji */}
                <Text
                  x={xPx + 4}
                  y={yPx + 4}
                  text={item.emoji}
                  fontSize={16}
                  listening={false}
                />

                {/* Label */}
                <Text
                  x={xPx + 4}
                  y={yPx + 24}
                  text={item.label}
                  fontSize={10}
                  fill="#374151"
                  listening={false}
                />

                {/* Status for harvested */}
                {isHarvested && (
                  <Text
                    x={xPx + 4}
                    y={yPx + 36}
                    text="\u5df2\u6536\u6210"
                    fontSize={9}
                    fill="#4b5563"
                    listening={false}
                  />
                )}

                {/* Dimensions on select */}
                {isSelected && (
                  <Text
                    x={xPx}
                    y={yPx + hPx + 4}
                    text={`${item.widthM.toFixed(1)} \u00d7 ${item.heightM.toFixed(1)} m`}
                    fontSize={9}
                    fill="#16a34a"
                    listening={false}
                  />
                )}

                {/* Resize handles for selected items */}
                {isSelected && isDraggable && (
                  <ResizeHandles
                    itemId={item.id}
                    xPx={xPx}
                    yPx={yPx}
                    wPx={wPx}
                    hPx={hPx}
                    scale={zoom}
                    onResizeStart={handleResizeStart}
                  />
                )}
              </Group>
            );
          })}

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
              <Circle radius={10} fill="#fbbf24" stroke="#d97706" strokeWidth={1} />
              <Text x={-4} y={-6} text={"\u26a0"} fontSize={11} fill="#92400e" />
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
