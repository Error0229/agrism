"use client";

import { Grid3X3, Magnet } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFieldEditor } from "@/lib/store/field-editor-store";

const TOOL_LABELS: Record<string, string> = {
  select: "選取",
  draw_rect: "繪製區域",
  hand: "平移",
  eraser: "橡皮擦",
  measure: "測量",
};

interface EditorStatusBarProps {
  fieldName?: string;
  fieldWidthM?: number;
  fieldHeightM?: number;
}

export function EditorStatusBar({
  fieldName,
  fieldWidthM,
  fieldHeightM,
}: EditorStatusBarProps) {
  const activeTool = useFieldEditor((s) => s.activeTool);
  const gridSpacing = useFieldEditor((s) => s.gridSpacing);
  const gridVisible = useFieldEditor((s) => s.gridVisible);
  const snapEnabled = useFieldEditor((s) => s.snapEnabled);
  const zoom = useFieldEditor((s) => s.zoom);
  const selectedIds = useFieldEditor((s) => s.selectedIds);
  const cursorPosition = useFieldEditor((s) => s.cursorPosition);

  return (
    <div className="flex h-7 items-center gap-4 border-t bg-background px-3 text-xs text-muted-foreground">
      {/* Active tool */}
      <span className="font-medium text-foreground">
        {TOOL_LABELS[activeTool] ?? activeTool}
      </span>

      <Separator />

      {/* Grid */}
      <span className={cn("flex items-center gap-1", !gridVisible && "opacity-50")}>
        <Grid3X3 className="size-3" />
        {gridSpacing}m
      </span>

      {/* Snap */}
      <span className={cn("flex items-center gap-1", !snapEnabled && "opacity-50")}>
        <Magnet className="size-3" />
        {snapEnabled ? "吸附" : "關"}
      </span>

      <Separator />

      {/* Field dimensions */}
      {fieldName && (
        <span>
          {fieldName}
          {fieldWidthM != null && fieldHeightM != null && (
            <> &mdash; {fieldWidthM} &times; {fieldHeightM} m</>
          )}
        </span>
      )}

      <div className="flex-1" />

      {/* Cursor position */}
      {cursorPosition && (
        <span>
          X: {cursorPosition.xM.toFixed(1)}m &nbsp; Y: {cursorPosition.yM.toFixed(1)}m
        </span>
      )}

      {/* Selection */}
      {selectedIds.length > 0 && (
        <>
          <Separator />
          <span>已選取 {selectedIds.length} 項</span>
        </>
      )}

      {/* Zoom */}
      <span>{Math.round(zoom * 100)}%</span>
    </div>
  );
}

function Separator() {
  return <span className="text-border">|</span>;
}
