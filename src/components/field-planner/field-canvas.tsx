"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { Field, PlantedCrop } from "@/lib/types";
import { getCropById } from "@/lib/data/crops-database";
import { useFields } from "@/lib/store/fields-context";

const PIXELS_PER_METER = 100;

interface FieldCanvasProps {
  field: Field;
  selectedCropId: string | null;
  onSelectCrop: (cropId: string | null) => void;
}

export default function FieldCanvas({ field, selectedCropId, onSelectCrop }: FieldCanvasProps) {
  const { updatePlantedCrop } = useFields();
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [hoveredCropId, setHoveredCropId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const canvasWidth = field.dimensions.width * PIXELS_PER_METER;
  const canvasHeight = field.dimensions.height * PIXELS_PER_METER;

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? scale / scaleBy : scale * scaleBy;
    setScale(Math.max(0.2, Math.min(3.0, newScale)));
  }, [scale]);

  const handleDragEnd = useCallback(
    (plantedCrop: PlantedCrop, e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updatePlantedCrop(field.id, plantedCrop.id, {
        position: { x: node.x(), y: node.y() },
      });
    },
    [field.id, updatePlantedCrop]
  );

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        onSelectCrop(null);
      }
    },
    [onSelectCrop]
  );

  // Check spacing overlap
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

  // Grid lines
  const gridLines = [];
  for (let x = 0; x <= canvasWidth; x += PIXELS_PER_METER) {
    gridLines.push(
      <Line key={`v-${x}`} points={[x, 0, x, canvasHeight]} stroke="#e5e7eb" strokeWidth={1} />
    );
    gridLines.push(
      <Text key={`vl-${x}`} x={x + 2} y={-16} text={`${x / PIXELS_PER_METER}m`} fontSize={10} fill="#9ca3af" />
    );
  }
  for (let y = 0; y <= canvasHeight; y += PIXELS_PER_METER) {
    gridLines.push(
      <Line key={`h-${y}`} points={[0, y, canvasWidth, y]} stroke="#e5e7eb" strokeWidth={1} />
    );
    gridLines.push(
      <Text key={`hl-${y}`} x={-28} y={y + 2} text={`${y / PIXELS_PER_METER}m`} fontSize={10} fill="#9ca3af" />
    );
  }

  const growingCrops = field.plantedCrops.filter((c) => c.status === "growing");

  return (
    <div ref={containerRef} className="border rounded-lg overflow-hidden bg-white">
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setPosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onClick={handleStageClick}
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
          />
          {gridLines}

          {/* Crop blocks */}
          {growingCrops.map((plantedCrop) => {
            const cropData = getCropById(plantedCrop.cropId);
            if (!cropData) return null;
            const isSelected = selectedCropId === plantedCrop.id;
            const isHovered = hoveredCropId === plantedCrop.id;
            const showSpacing = isSelected || isHovered;
            const hasOverlap = checkOverlap(plantedCrop);
            const maxSpacing = Math.max(cropData.spacing.plant, cropData.spacing.row);

            return (
              <Group key={plantedCrop.id}>
                {/* Spacing circle */}
                {showSpacing && (
                  <Circle
                    x={plantedCrop.position.x + plantedCrop.size.width / 2}
                    y={plantedCrop.position.y + plantedCrop.size.height / 2}
                    radius={maxSpacing / 2}
                    stroke={hasOverlap ? "#ef4444" : "#3b82f6"}
                    strokeWidth={1}
                    dash={[5, 5]}
                    fill={hasOverlap ? "rgba(239,68,68,0.05)" : "rgba(59,130,246,0.05)"}
                  />
                )}
                {/* Crop block */}
                <Rect
                  x={plantedCrop.position.x}
                  y={plantedCrop.position.y}
                  width={plantedCrop.size.width}
                  height={plantedCrop.size.height}
                  fill={cropData.color + "40"}
                  stroke={isSelected ? "#2563eb" : cropData.color}
                  strokeWidth={isSelected ? 2 : 1}
                  cornerRadius={4}
                  draggable
                  onDragEnd={(e) => handleDragEnd(plantedCrop, e)}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelectCrop(plantedCrop.id);
                  }}
                  onMouseEnter={() => setHoveredCropId(plantedCrop.id)}
                  onMouseLeave={() => setHoveredCropId(null)}
                  shadowColor={isSelected ? "#2563eb" : "transparent"}
                  shadowBlur={isSelected ? 8 : 0}
                />
                {/* Emoji + name */}
                <Text
                  x={plantedCrop.position.x + 4}
                  y={plantedCrop.position.y + 4}
                  text={cropData.emoji}
                  fontSize={16}
                  listening={false}
                />
                <Text
                  x={plantedCrop.position.x + 4}
                  y={plantedCrop.position.y + 24}
                  text={cropData.name}
                  fontSize={10}
                  fill="#374151"
                  listening={false}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
