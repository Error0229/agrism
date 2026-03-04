"use client";

import React from "react";

interface EditorMinimapProps {
  fieldWidthM: number;
  fieldHeightM: number;
  items: Array<{
    xM: number;
    yM: number;
    widthM: number;
    heightM: number;
    color: string;
    kind: string;
  }>;
  zoom: number;
  pan: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  onNavigate: (xM: number, yM: number) => void;
}

const MINIMAP_W = 160;
const MINIMAP_H = 120;
const PIXELS_PER_METER = 100;

export const EditorMinimap = React.memo(function EditorMinimap({
  fieldWidthM,
  fieldHeightM,
  items,
  zoom,
  pan,
  viewportWidth,
  viewportHeight,
  onNavigate,
}: EditorMinimapProps) {
  // Scale factor: fit field into minimap
  const scaleX = MINIMAP_W / fieldWidthM;
  const scaleY = MINIMAP_H / fieldHeightM;
  const scale = Math.min(scaleX, scaleY);

  // Offset to center field in minimap
  const offsetX = (MINIMAP_W - fieldWidthM * scale) / 2;
  const offsetY = (MINIMAP_H - fieldHeightM * scale) / 2;

  // Viewport rectangle (what's currently visible on screen)
  const vpXM = -pan.x / (zoom * PIXELS_PER_METER);
  const vpYM = -pan.y / (zoom * PIXELS_PER_METER);
  const vpWM = viewportWidth / (zoom * PIXELS_PER_METER);
  const vpHM = viewportHeight / (zoom * PIXELS_PER_METER);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - offsetX) / scale;
    const clickY = (e.clientY - rect.top - offsetY) / scale;
    onNavigate(clickX, clickY);
  };

  return (
    <div
      className="absolute bottom-2 left-2 z-10 cursor-pointer overflow-hidden rounded-md border bg-background/80 backdrop-blur-sm"
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
      onClick={handleClick}
    >
      {/* Field background */}
      <div
        className="absolute bg-green-100 dark:bg-green-950"
        style={{
          left: offsetX,
          top: offsetY,
          width: fieldWidthM * scale,
          height: fieldHeightM * scale,
        }}
      />

      {/* Items */}
      {items.map((item, i) => (
        <div
          key={i}
          className="absolute rounded-[1px]"
          style={{
            left: offsetX + item.xM * scale,
            top: offsetY + item.yM * scale,
            width: Math.max(2, item.widthM * scale),
            height: Math.max(2, item.heightM * scale),
            backgroundColor:
              item.kind === "facility" ? "#94a3b8" : item.color,
            opacity: 0.8,
          }}
        />
      ))}

      {/* Viewport rectangle */}
      <div
        className="absolute border-2 border-blue-500 bg-blue-500/10"
        style={{
          left: offsetX + vpXM * scale,
          top: offsetY + vpYM * scale,
          width: vpWM * scale,
          height: vpHM * scale,
        }}
      />
    </div>
  );
});
