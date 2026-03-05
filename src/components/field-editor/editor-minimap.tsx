"use client";

import React, { useCallback, useRef } from "react";

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
    shapePoints?: { x: number; y: number }[] | null;
  }>;
  zoom: number;
  pan: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  onNavigate: (xM: number, yM: number) => void;
  onPan: (x: number, y: number) => void;
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
  onPan,
}: EditorMinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, vpX: 0, vpY: 0 });

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

  // Viewport in minimap pixel coords
  const vpLeft = offsetX + vpXM * scale;
  const vpTop = offsetY + vpYM * scale;
  const vpW = vpWM * scale;
  const vpH = vpHM * scale;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - offsetX) / scale;
    const clickY = (e.clientY - rect.top - offsetY) / scale;
    onNavigate(clickX, clickY);
  };

  const handleViewportMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      draggingRef.current = true;
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        vpX: vpLeft,
        vpY: vpTop,
      };

      const handleMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - dragStartRef.current.mouseX;
        const dy = me.clientY - dragStartRef.current.mouseY;

        // New viewport position in minimap pixels
        let newVpX = dragStartRef.current.vpX + dx;
        let newVpY = dragStartRef.current.vpY + dy;

        // Constrain within minimap field bounds
        const fieldLeft = offsetX;
        const fieldTop = offsetY;
        const fieldRight = offsetX + fieldWidthM * scale;
        const fieldBottom = offsetY + fieldHeightM * scale;
        newVpX = Math.max(fieldLeft - vpW * 0.5, Math.min(fieldRight - vpW * 0.5, newVpX));
        newVpY = Math.max(fieldTop - vpH * 0.5, Math.min(fieldBottom - vpH * 0.5, newVpY));

        // Convert minimap position back to pan coordinates
        const newXM = (newVpX - offsetX) / scale;
        const newYM = (newVpY - offsetY) / scale;
        const newPanX = -(newXM * PIXELS_PER_METER * zoom);
        const newPanY = -(newYM * PIXELS_PER_METER * zoom);
        onPan(newPanX, newPanY);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        // Delay reset so the click handler doesn't fire
        requestAnimationFrame(() => {
          draggingRef.current = false;
        });
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [vpLeft, vpTop, vpW, vpH, offsetX, offsetY, fieldWidthM, fieldHeightM, scale, zoom, onPan],
  );

  return (
    <div
      ref={containerRef}
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

      {/* Items - use SVG for polygon support */}
      <svg
        className="absolute inset-0"
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ pointerEvents: "none" }}
      >
        {items.map((item, i) => {
          const fillColor = item.kind === "facility" ? "#94a3b8" : item.color;

          // Render polygon if shapePoints exist
          if (item.shapePoints && item.shapePoints.length >= 3) {
            const points = item.shapePoints
              .map((p) => `${offsetX + p.x * scale},${offsetY + p.y * scale}`)
              .join(" ");
            return (
              <polygon
                key={i}
                points={points}
                fill={fillColor}
                opacity={0.8}
              />
            );
          }

          // Render rectangle
          return (
            <rect
              key={i}
              x={offsetX + item.xM * scale}
              y={offsetY + item.yM * scale}
              width={Math.max(2, item.widthM * scale)}
              height={Math.max(2, item.heightM * scale)}
              fill={fillColor}
              opacity={0.8}
              rx={1}
            />
          );
        })}
      </svg>

      {/* Viewport rectangle - draggable */}
      <div
        className="absolute border-2 border-blue-500 bg-blue-500/10"
        style={{
          left: vpLeft,
          top: vpTop,
          width: vpW,
          height: vpH,
          cursor: "grab",
        }}
        onMouseDown={handleViewportMouseDown}
      />
    </div>
  );
});
