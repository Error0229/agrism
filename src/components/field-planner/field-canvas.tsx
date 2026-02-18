"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { CropPoint, Field, PlantedCrop } from "@/lib/types";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { useFields } from "@/lib/store/fields-context";
import { addDays, format } from "date-fns";
import { getCropPolygon, polygonBounds, translatePoints } from "@/lib/utils/crop-shape";
import { getPlantedCropDisplayLabel } from "@/lib/utils/facility-metadata";

const PIXELS_PER_METER = 100;
const MIN_SIZE_METERS = 1;
const HANDLE_SIZE = 12;
const SNAP_METERS = 0.5;
const CROP_HANDLE_SIZE = 8;
const MIN_CROP_SIZE = 10; // minimum 10cm

type ResizeHandle = "top-left" | "top" | "top-right" | "right" | "bottom-right" | "bottom" | "bottom-left" | "left" | null;
type CropResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"
  | null;

interface FieldCanvasProps {
  field: Field;
  selectedCropId: string | null;
  onSelectCrop: (cropId: string | null) => void;
  resizeMode: boolean;
  occurredAt?: string;
  showHarvestedCrops: boolean;
  conflictedCropIds?: string[];
  showUtilities: boolean;
}

export default function FieldCanvas({
  field,
  selectedCropId,
  onSelectCrop,
  resizeMode,
  occurredAt,
  showHarvestedCrops,
  conflictedCropIds = [],
  showUtilities,
}: FieldCanvasProps) {
  const { updateField, updatePlantedCrop } = useFields();
  const allCrops = useAllCrops();
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [hoveredCropId, setHoveredCropId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [tempDimensions, setTempDimensions] = useState<{ width: number; height: number } | null>(null);

  const [cropResizeHandle, setCropResizeHandle] = useState<CropResizeHandle>(null);
  const [cropResizeId, setCropResizeId] = useState<string | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropOriginal, setCropOriginal] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tempCropRect, setTempCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [polygonEditCropId, setPolygonEditCropId] = useState<string | null>(null);
  const [tempPolygonPoints, setTempPolygonPoints] = useState<CropPoint[] | null>(null);

  const conflictSet = useMemo(() => new Set(conflictedCropIds), [conflictedCropIds]);

  const getCropById = useCallback((id: string) => allCrops.find((c) => c.id === id), [allCrops]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: Math.max(500, window.innerHeight - 300),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const dims = tempDimensions ?? field.dimensions;
  const canvasWidth = dims.width * PIXELS_PER_METER;
  const canvasHeight = dims.height * PIXELS_PER_METER;

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const newScale = e.evt.deltaY > 0 ? scale / scaleBy : scale * scaleBy;
      setScale(Math.max(0.2, Math.min(3.0, newScale)));
    },
    [scale]
  );

  const handleDragEnd = useCallback(
    (plantedCrop: PlantedCrop, e: KonvaEventObject<DragEvent>) => {
      if (plantedCrop.status !== "growing") return;
      const node = e.target;
      const maxX = field.dimensions.width * PIXELS_PER_METER - plantedCrop.size.width;
      const maxY = field.dimensions.height * PIXELS_PER_METER - plantedCrop.size.height;
      const x = Math.max(0, Math.min(maxX, node.x()));
      const y = Math.max(0, Math.min(maxY, node.y()));
      node.x(x);
      node.y(y);
      updatePlantedCrop(
        field.id,
        plantedCrop.id,
        {
          position: { x, y },
        },
        { occurredAt }
      );
    },
    [field.id, field.dimensions, occurredAt, updatePlantedCrop]
  );

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        onSelectCrop(null);
      }
    },
    [onSelectCrop]
  );

  const snapToGrid = (meters: number): number => {
    return Math.max(MIN_SIZE_METERS, Math.round(meters / SNAP_METERS) * SNAP_METERS);
  };

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      setActiveHandle(handle);
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (pointer) {
        setDragStart({ x: pointer.x, y: pointer.y });
        setTempDimensions({ ...field.dimensions });
      }
    },
    [field.dimensions]
  );

  const handleResizeMove = useCallback(() => {
    if (!activeHandle || !dragStart || !tempDimensions) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const dx = (pointer.x - dragStart.x) / scale;
    const dy = (pointer.y - dragStart.y) / scale;
    const dxMeters = dx / PIXELS_PER_METER;
    const dyMeters = dy / PIXELS_PER_METER;

    let newW = field.dimensions.width;
    let newH = field.dimensions.height;

    if (activeHandle.includes("right")) newW = field.dimensions.width + dxMeters;
    if (activeHandle.includes("left")) newW = field.dimensions.width - dxMeters;
    if (activeHandle === "bottom" || activeHandle.includes("bottom")) newH = field.dimensions.height + dyMeters;
    if (activeHandle === "top" || activeHandle.includes("top")) newH = field.dimensions.height - dyMeters;

    newW = snapToGrid(newW);
    newH = snapToGrid(newH);
    setTempDimensions({ width: newW, height: newH });
  }, [activeHandle, dragStart, tempDimensions, field.dimensions, scale]);

  const handleResizeEnd = useCallback(() => {
    if (tempDimensions && activeHandle) {
      updateField(field.id, { dimensions: tempDimensions }, { occurredAt });
      const maxX = tempDimensions.width * PIXELS_PER_METER;
      const maxY = tempDimensions.height * PIXELS_PER_METER;
      for (const planted of field.plantedCrops) {
        if (planted.status !== "growing") continue;
        const clampedX = Math.min(planted.position.x, maxX - planted.size.width);
        const clampedY = Math.min(planted.position.y, maxY - planted.size.height);
        if (clampedX !== planted.position.x || clampedY !== planted.position.y) {
          updatePlantedCrop(
            field.id,
            planted.id,
            {
              position: { x: Math.max(0, clampedX), y: Math.max(0, clampedY) },
            },
            { occurredAt }
          );
        }
      }
    }
    setActiveHandle(null);
    setDragStart(null);
    setTempDimensions(null);
  }, [tempDimensions, activeHandle, field.id, field.plantedCrops, updateField, updatePlantedCrop, occurredAt]);

  const handleCropResizeStart = useCallback(
    (cropId: string, handle: CropResizeHandle, e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const planted = field.plantedCrops.find((c) => c.id === cropId);
      if (!planted || planted.status !== "growing") return;
      setCropResizeHandle(handle);
      setCropResizeId(cropId);
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (pointer) {
        setCropDragStart({ x: pointer.x, y: pointer.y });
        setCropOriginal({
          x: planted.position.x,
          y: planted.position.y,
          w: planted.size.width,
          h: planted.size.height,
        });
        setTempCropRect({
          x: planted.position.x,
          y: planted.position.y,
          w: planted.size.width,
          h: planted.size.height,
        });
      }
    },
    [field.plantedCrops]
  );

  const handleCropResizeMove = useCallback(() => {
    if (!cropResizeHandle || !cropDragStart || !cropOriginal) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const dx = (pointer.x - cropDragStart.x) / scale;
    const dy = (pointer.y - cropDragStart.y) / scale;

    let { x, y, w, h } = cropOriginal;
    const fieldW = field.dimensions.width * PIXELS_PER_METER;
    const fieldH = field.dimensions.height * PIXELS_PER_METER;

    if (cropResizeHandle.includes("left")) {
      x = cropOriginal.x + dx;
      w = cropOriginal.w - dx;
    }
    if (cropResizeHandle.includes("right")) {
      w = cropOriginal.w + dx;
    }
    if (cropResizeHandle.includes("top")) {
      y = cropOriginal.y + dy;
      h = cropOriginal.h - dy;
    }
    if (cropResizeHandle.includes("bottom")) {
      h = cropOriginal.h + dy;
    }

    w = Math.max(MIN_CROP_SIZE, w);
    h = Math.max(MIN_CROP_SIZE, h);

    if (cropResizeHandle.includes("left") && w === MIN_CROP_SIZE) {
      x = cropOriginal.x + cropOriginal.w - MIN_CROP_SIZE;
    }
    if (cropResizeHandle.includes("top") && h === MIN_CROP_SIZE) {
      y = cropOriginal.y + cropOriginal.h - MIN_CROP_SIZE;
    }

    x = Math.max(0, x);
    y = Math.max(0, y);
    w = Math.min(w, fieldW - x);
    h = Math.min(h, fieldH - y);

    setTempCropRect({ x, y, w, h });
  }, [cropResizeHandle, cropDragStart, cropOriginal, field.dimensions, scale]);

  const handleCropResizeEnd = useCallback(() => {
    if (tempCropRect && cropResizeId) {
      updatePlantedCrop(
        field.id,
        cropResizeId,
        {
          position: { x: tempCropRect.x, y: tempCropRect.y },
          size: { width: tempCropRect.w, height: tempCropRect.h },
        },
        { occurredAt }
      );
    }
    setCropResizeHandle(null);
    setCropResizeId(null);
    setCropDragStart(null);
    setCropOriginal(null);
    setTempCropRect(null);
  }, [tempCropRect, cropResizeId, field.id, updatePlantedCrop, occurredAt]);

  const updatePolygonShape = useCallback(
    (cropId: string, points: CropPoint[]) => {
      const bounds = polygonBounds(points);
      updatePlantedCrop(
        field.id,
        cropId,
        {
          shape: { kind: "polygon", points },
          position: { x: bounds.minX, y: bounds.minY },
          size: { width: bounds.width, height: bounds.height },
        },
        { occurredAt }
      );
    },
    [field.id, occurredAt, updatePlantedCrop]
  );

  const handlePolygonDragEnd = useCallback(
    (plantedCrop: PlantedCrop, e: KonvaEventObject<DragEvent>) => {
      if (plantedCrop.status !== "growing") return;
      const dx = e.target.x();
      const dy = e.target.y();
      const moved = translatePoints(getCropPolygon(plantedCrop), dx, dy);
      e.target.position({ x: 0, y: 0 });
      updatePolygonShape(plantedCrop.id, moved);
    },
    [updatePolygonShape]
  );

  const handlePolygonVertexMove = useCallback(
    (plantedCrop: PlantedCrop, pointIndex: number, e: KonvaEventObject<DragEvent>) => {
      const source = tempPolygonPoints ?? getCropPolygon(plantedCrop);
      const next = source.map((point, index) =>
        index === pointIndex
          ? {
              x: Math.max(0, Math.min(field.dimensions.width * PIXELS_PER_METER, e.target.x())),
              y: Math.max(0, Math.min(field.dimensions.height * PIXELS_PER_METER, e.target.y())),
            }
          : point
      );
      setPolygonEditCropId(plantedCrop.id);
      setTempPolygonPoints(next);
    },
    [field.dimensions.height, field.dimensions.width, tempPolygonPoints]
  );

  const handlePolygonVertexCommit = useCallback(
    (plantedCrop: PlantedCrop) => {
      if (polygonEditCropId !== plantedCrop.id || !tempPolygonPoints) return;
      updatePolygonShape(plantedCrop.id, tempPolygonPoints);
      setPolygonEditCropId(null);
      setTempPolygonPoints(null);
    },
    [polygonEditCropId, tempPolygonPoints, updatePolygonShape]
  );

  const handleUtilityNodeDragEnd = useCallback(
    (nodeId: string, e: KonvaEventObject<DragEvent>) => {
      const nextX = Math.max(0, Math.min(field.dimensions.width * PIXELS_PER_METER, e.target.x()));
      const nextY = Math.max(0, Math.min(field.dimensions.height * PIXELS_PER_METER, e.target.y()));
      const nextNodes = (field.utilityNodes ?? []).map((node) =>
        node.id === nodeId ? { ...node, position: { x: nextX, y: nextY } } : node
      );
      updateField(field.id, { utilityNodes: nextNodes }, { occurredAt });
    },
    [field.dimensions.height, field.dimensions.width, field.id, field.utilityNodes, occurredAt, updateField]
  );

  const handleMouseMove = useCallback(() => {
    if (activeHandle) {
      handleResizeMove();
    } else if (cropResizeHandle) {
      handleCropResizeMove();
    }
  }, [activeHandle, cropResizeHandle, handleResizeMove, handleCropResizeMove]);

  const handleMouseUp = useCallback(() => {
    if (activeHandle) {
      handleResizeEnd();
    } else if (cropResizeHandle) {
      handleCropResizeEnd();
    }
  }, [activeHandle, cropResizeHandle, handleResizeEnd, handleCropResizeEnd]);

  const checkOverlap = (crop: PlantedCrop) => {
    const cropData = getCropById(crop.cropId);
    if (!cropData) return false;
    const maxSpacing = Math.max(cropData.spacing.plant, cropData.spacing.row);
    for (const other of field.plantedCrops) {
      if (other.id === crop.id || other.status !== "growing") continue;
      const otherCropData = getCropById(other.cropId);
      if (!otherCropData) continue;
      const otherMaxSpacing = Math.max(otherCropData.spacing.plant, otherCropData.spacing.row);
      const dx = crop.position.x - other.position.x;
      const dy = crop.position.y - other.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < (maxSpacing + otherMaxSpacing) / 2) return true;
    }
    return false;
  };

  const gridLines = useMemo(() => {
    const lines = [];
    for (let x = 0; x <= canvasWidth; x += PIXELS_PER_METER) {
      lines.push(<Line key={`v-${x}`} points={[x, 0, x, canvasHeight]} stroke="#e5e7eb" strokeWidth={1} />);
      lines.push(<Text key={`vl-${x}`} x={x + 2} y={-16} text={`${x / PIXELS_PER_METER}m`} fontSize={10} fill="#9ca3af" />);
    }
    for (let y = 0; y <= canvasHeight; y += PIXELS_PER_METER) {
      lines.push(<Line key={`h-${y}`} points={[0, y, canvasWidth, y]} stroke="#e5e7eb" strokeWidth={1} />);
      lines.push(<Text key={`hl-${y}`} x={-28} y={y + 2} text={`${y / PIXELS_PER_METER}m`} fontSize={10} fill="#9ca3af" />);
    }
    return lines;
  }, [canvasWidth, canvasHeight]);

  const handlePositions = useMemo(() => {
    const hs = HANDLE_SIZE / scale;
    const w = canvasWidth;
    const h = canvasHeight;
    return [
      { id: "top-left" as const, x: -hs / 2, y: -hs / 2, cursor: "nwse-resize" },
      { id: "top" as const, x: w / 2 - hs / 2, y: -hs / 2, cursor: "ns-resize" },
      { id: "top-right" as const, x: w - hs / 2, y: -hs / 2, cursor: "nesw-resize" },
      { id: "right" as const, x: w - hs / 2, y: h / 2 - hs / 2, cursor: "ew-resize" },
      { id: "bottom-right" as const, x: w - hs / 2, y: h - hs / 2, cursor: "nwse-resize" },
      { id: "bottom" as const, x: w / 2 - hs / 2, y: h - hs / 2, cursor: "ns-resize" },
      { id: "bottom-left" as const, x: -hs / 2, y: h - hs / 2, cursor: "nesw-resize" },
      { id: "left" as const, x: -hs / 2, y: h / 2 - hs / 2, cursor: "ew-resize" },
    ];
  }, [canvasWidth, canvasHeight, scale]);

  const visibleCrops = field.plantedCrops.filter((crop) => showHarvestedCrops || crop.status === "growing");
  const utilityNodes = useMemo(() => field.utilityNodes ?? [], [field.utilityNodes]);
  const utilityEdges = useMemo(() => field.utilityEdges ?? [], [field.utilityEdges]);
  const utilityNodeById = useMemo(() => new Map(utilityNodes.map((node) => [node.id, node])), [utilityNodes]);
  const isResizing = !!activeHandle;
  const isCropResizing = !!cropResizeHandle;
  const isPolygonEditing = !!polygonEditCropId;

  const getCropRect = (planted: PlantedCrop) => {
    const points =
      polygonEditCropId === planted.id && tempPolygonPoints
        ? tempPolygonPoints
        : planted.shape?.kind === "polygon"
          ? getCropPolygon(planted)
          : null;
    if (points) {
      const bounds = polygonBounds(points);
      return { x: bounds.minX, y: bounds.minY, w: bounds.width, h: bounds.height };
    }
    if (cropResizeId === planted.id && tempCropRect) {
      return { x: tempCropRect.x, y: tempCropRect.y, w: tempCropRect.w, h: tempCropRect.h };
    }
    return { x: planted.position.x, y: planted.position.y, w: planted.size.width, h: planted.size.height };
  };

  const getCropHandles = (rect: { x: number; y: number; w: number; h: number }) => {
    const hs = CROP_HANDLE_SIZE / scale;
    return [
      { id: "top-left" as const, x: rect.x - hs / 2, y: rect.y - hs / 2, cursor: "nwse-resize" },
      { id: "top" as const, x: rect.x + rect.w / 2 - hs / 2, y: rect.y - hs / 2, cursor: "ns-resize" },
      { id: "top-right" as const, x: rect.x + rect.w - hs / 2, y: rect.y - hs / 2, cursor: "nesw-resize" },
      { id: "right" as const, x: rect.x + rect.w - hs / 2, y: rect.y + rect.h / 2 - hs / 2, cursor: "ew-resize" },
      { id: "bottom-right" as const, x: rect.x + rect.w - hs / 2, y: rect.y + rect.h - hs / 2, cursor: "nwse-resize" },
      { id: "bottom" as const, x: rect.x + rect.w / 2 - hs / 2, y: rect.y + rect.h - hs / 2, cursor: "ns-resize" },
      { id: "bottom-left" as const, x: rect.x - hs / 2, y: rect.y + rect.h - hs / 2, cursor: "nesw-resize" },
      { id: "left" as const, x: rect.x - hs / 2, y: rect.y + rect.h / 2 - hs / 2, cursor: "ew-resize" },
    ];
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg border bg-white">
      {resizeMode && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-blue-500 px-3 py-1.5 text-xs text-white shadow-md">
          拖拉藍色方塊調整田地大小
        </div>
      )}
      {!resizeMode && selectedCropId && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-green-600 px-3 py-1.5 text-xs text-white shadow-md">
          拖拉綠色方塊調整作物種植範圍
        </div>
      )}
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={!isResizing && !resizeMode && !isCropResizing && !isPolygonEditing}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setPosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="#f0fdf4"
            stroke={resizeMode ? "#2563eb" : "#86efac"}
            strokeWidth={resizeMode ? 3 : 2}
            dash={resizeMode ? [8, 4] : undefined}
          />
          {gridLines}

          <Text
            x={canvasWidth / 2 - 40}
            y={canvasHeight + 8}
            text={`${dims.width} × ${dims.height} 公尺`}
            fontSize={12}
            fill="#6b7280"
            listening={false}
          />

          {resizeMode &&
            handlePositions.map((hp) => {
              const hs = HANDLE_SIZE / scale;
              const isActive = activeHandle === hp.id;
              const isHovered = hoveredHandle === hp.id;
              return (
                <Rect
                  key={hp.id}
                  x={hp.x}
                  y={hp.y}
                  width={hs}
                  height={hs}
                  fill={isActive ? "#1d4ed8" : isHovered ? "#3b82f6" : "#60a5fa"}
                  stroke="#1e40af"
                  strokeWidth={1}
                  cornerRadius={2}
                  onMouseDown={(e) => handleResizeStart(hp.id, e)}
                  onMouseEnter={(e) => {
                    setHoveredHandle(hp.id);
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = hp.cursor;
                  }}
                  onMouseLeave={(e) => {
                    setHoveredHandle(null);
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = "default";
                  }}
                />
              );
            })}

          {isResizing && tempDimensions && (
            <Group>
              <Rect
                x={canvasWidth / 2 - 55}
                y={canvasHeight / 2 - 16}
                width={110}
                height={32}
                fill="rgba(37, 99, 235, 0.9)"
                cornerRadius={6}
                listening={false}
              />
              <Text
                x={canvasWidth / 2 - 50}
                y={canvasHeight / 2 - 8}
                text={`${tempDimensions.width} × ${tempDimensions.height} m`}
                fontSize={14}
                fontStyle="bold"
                fill="white"
                listening={false}
              />
            </Group>
          )}

          {showUtilities &&
            utilityEdges.map((edge) => {
              const from = utilityNodeById.get(edge.fromNodeId);
              const to = utilityNodeById.get(edge.toNodeId);
              if (!from || !to) return null;
              return (
                <Line
                  key={edge.id}
                  points={[from.position.x, from.position.y, to.position.x, to.position.y]}
                  stroke={edge.kind === "water" ? "#0284c7" : "#f97316"}
                  strokeWidth={3}
                  dash={edge.kind === "water" ? [6, 4] : undefined}
                />
              );
            })}

          {showUtilities &&
            utilityNodes.map((node) => (
              <Group key={node.id}>
                <Circle
                  x={node.position.x}
                  y={node.position.y}
                  radius={7}
                  fill={node.kind === "water" ? "#0ea5e9" : "#fb923c"}
                  stroke="#1f2937"
                  strokeWidth={1}
                  draggable
                  onDragEnd={(e) => handleUtilityNodeDragEnd(node.id, e)}
                />
                <Text
                  x={node.position.x + 8}
                  y={node.position.y - 6}
                  text={node.label}
                  fontSize={10}
                  fill={node.kind === "water" ? "#0369a1" : "#9a3412"}
                />
              </Group>
            ))}

          {visibleCrops.map((plantedCrop) => {
            const cropData = getCropById(plantedCrop.cropId);
            if (!cropData) return null;
            const isSelected = selectedCropId === plantedCrop.id;
            const isHovered = hoveredCropId === plantedCrop.id;
            const polygonPoints =
              polygonEditCropId === plantedCrop.id && tempPolygonPoints ? tempPolygonPoints : getCropPolygon(plantedCrop);
            const isPolygon = plantedCrop.shape?.kind === "polygon" || polygonEditCropId === plantedCrop.id;
            const flatPoints = polygonPoints.flatMap((point) => [point.x, point.y]);
            const showSpacing = isSelected || isHovered;
            const hasOverlap = checkOverlap(plantedCrop);
            const hasConflict = conflictSet.has(plantedCrop.id);
            const maxSpacing = Math.max(cropData.spacing.plant, cropData.spacing.row);
            const rect = getCropRect(plantedCrop);
            const isHarvested = plantedCrop.status === "harvested";
            const growthDays = plantedCrop.customGrowthDays ?? cropData.growthDays;
            const expectedHarvestDate = format(addDays(new Date(plantedCrop.plantedDate), growthDays), "yyyy/MM/dd");
            const displayLabel = getPlantedCropDisplayLabel(plantedCrop, cropData.name, cropData.category);

            return (
              <Group key={plantedCrop.id}>
                {showSpacing && plantedCrop.status === "growing" && (
                  <Circle
                    x={rect.x + rect.w / 2}
                    y={rect.y + rect.h / 2}
                    radius={maxSpacing / 2}
                    stroke={hasOverlap ? "#ef4444" : "#3b82f6"}
                    strokeWidth={1}
                    dash={[5, 5]}
                    fill={hasOverlap ? "rgba(239,68,68,0.05)" : "rgba(59,130,246,0.05)"}
                  />
                )}
                {isPolygon ? (
                  <Line
                    points={flatPoints}
                    closed
                    fill={isHarvested ? "#9ca3af44" : `${cropData.color}40`}
                    stroke={hasConflict ? "#dc2626" : isSelected ? "#16a34a" : isHarvested ? "#6b7280" : cropData.color}
                    strokeWidth={hasConflict ? 2 : isSelected ? 2 : 1}
                    dash={hasConflict ? [5, 3] : isHarvested ? [4, 4] : undefined}
                    draggable={plantedCrop.status === "growing" && !resizeMode && !isCropResizing && !isPolygonEditing}
                    onDragEnd={(e) => handlePolygonDragEnd(plantedCrop, e)}
                    onClick={(e) => {
                      if (resizeMode) return;
                      e.cancelBubble = true;
                      onSelectCrop(plantedCrop.id);
                    }}
                    onMouseEnter={() => setHoveredCropId(plantedCrop.id)}
                    onMouseLeave={() => setHoveredCropId(null)}
                    shadowColor={isSelected ? "#16a34a" : "transparent"}
                    shadowBlur={isSelected ? 8 : 0}
                  />
                ) : (
                  <Rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    fill={isHarvested ? "#9ca3af44" : `${cropData.color}40`}
                    stroke={hasConflict ? "#dc2626" : isSelected ? "#16a34a" : isHarvested ? "#6b7280" : cropData.color}
                    strokeWidth={hasConflict ? 2 : isSelected ? 2 : 1}
                    dash={hasConflict ? [5, 3] : isHarvested ? [4, 4] : undefined}
                    cornerRadius={4}
                    draggable={plantedCrop.status === "growing" && !resizeMode && !isCropResizing}
                    onDragEnd={(e) => handleDragEnd(plantedCrop, e)}
                    onClick={(e) => {
                      if (resizeMode) return;
                      e.cancelBubble = true;
                      onSelectCrop(plantedCrop.id);
                    }}
                    onMouseEnter={() => setHoveredCropId(plantedCrop.id)}
                    onMouseLeave={() => setHoveredCropId(null)}
                    shadowColor={isSelected ? "#16a34a" : "transparent"}
                    shadowBlur={isSelected ? 8 : 0}
                  />
                )}
                <Text x={rect.x + 4} y={rect.y + 4} text={cropData.emoji} fontSize={16} listening={false} />
                <Text x={rect.x + 4} y={rect.y + 24} text={displayLabel} fontSize={10} fill="#374151" listening={false} />
                {isHarvested && (
                  <Text x={rect.x + 4} y={rect.y + 36} text="已收成" fontSize={9} fill="#4b5563" listening={false} />
                )}
                {isSelected && (
                  <Text
                    x={rect.x}
                    y={rect.y + rect.h + 4}
                    text={`${Math.round(rect.w)}×${Math.round(rect.h)} cm | ${format(new Date(plantedCrop.plantedDate), "yyyy/MM/dd")} -> ${expectedHarvestDate}`}
                    fontSize={9}
                    fill="#16a34a"
                    listening={false}
                  />
                )}

                {isSelected && !resizeMode && plantedCrop.status === "growing" &&
                  (isPolygon
                    ? polygonPoints.map((point, index) => (
                        <Circle
                          key={`${plantedCrop.id}-point-${index}`}
                          x={point.x}
                          y={point.y}
                          radius={CROP_HANDLE_SIZE / scale}
                          fill="#22c55e"
                          stroke="#166534"
                          strokeWidth={1}
                          draggable
                          onDragMove={(e) => handlePolygonVertexMove(plantedCrop, index, e)}
                          onDragEnd={() => handlePolygonVertexCommit(plantedCrop)}
                          onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = "pointer";
                          }}
                          onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = "default";
                          }}
                        />
                      ))
                    : getCropHandles(rect).map((ch) => {
                        const hs = CROP_HANDLE_SIZE / scale;
                        const isActiveCorner = cropResizeHandle === ch.id && cropResizeId === plantedCrop.id;
                        return (
                          <Rect
                            key={ch.id}
                            x={ch.x}
                            y={ch.y}
                            width={hs}
                            height={hs}
                            fill={isActiveCorner ? "#15803d" : "#22c55e"}
                            stroke="#166534"
                            strokeWidth={1}
                            cornerRadius={1}
                            onMouseDown={(e) => handleCropResizeStart(plantedCrop.id, ch.id, e)}
                            onMouseEnter={(e) => {
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = ch.cursor;
                            }}
                            onMouseLeave={(e) => {
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = "default";
                            }}
                          />
                        );
                      }))}
              </Group>
            );
          })}

          {isCropResizing && tempCropRect && (
            <Group>
              <Rect
                x={tempCropRect.x + tempCropRect.w / 2 - 40}
                y={tempCropRect.y + tempCropRect.h / 2 - 10}
                width={80}
                height={20}
                fill="rgba(22, 163, 74, 0.9)"
                cornerRadius={4}
                listening={false}
              />
              <Text
                x={tempCropRect.x + tempCropRect.w / 2 - 35}
                y={tempCropRect.y + tempCropRect.h / 2 - 6}
                text={`${Math.round(tempCropRect.w)}×${Math.round(tempCropRect.h)} cm`}
                fontSize={11}
                fontStyle="bold"
                fill="white"
                listening={false}
              />
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
