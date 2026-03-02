"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Redo2, Undo2 } from "lucide-react";

import { useFieldById, usePlantCrop } from "@/hooks/use-fields";
import { useFarmId } from "@/hooks/use-farm-id";
import { useFieldEditor } from "@/lib/store/field-editor-store";
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

  const plantCrop = usePlantCrop(farmId ?? "");

  // Draw rect completion state
  const [pendingRect, setPendingRect] = useState<{
    xM: number;
    yM: number;
    widthM: number;
    heightM: number;
  } | null>(null);

  useEffect(() => {
    setActiveField(fieldId);
  }, [fieldId, setActiveField]);

  const handleDrawRectComplete = useCallback(
    (rect: { xM: number; yM: number; widthM: number; heightM: number }) => {
      setPendingRect(rect);
    },
    [],
  );

  const handlePlantCrop = useCallback(
    async (cropId: string) => {
      if (!pendingRect) return;
      await plantCrop.mutateAsync({
        fieldId,
        data: {
          cropId,
          xM: pendingRect.xM,
          yM: pendingRect.yM,
          widthM: pendingRect.widthM,
          heightM: pendingRect.heightM,
        },
      });
      setPendingRect(null);
      setTool("select");
    },
    [pendingRect, plantCrop, fieldId, setTool],
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
        <div className="flex-1 bg-muted/30">
          <EditorCanvas
            field={field}
            onDrawRectComplete={handleDrawRectComplete}
          />
        </div>

        {/* Right: property inspector */}
        <PropertyInspector
          fieldName={field.name}
          fieldWidthM={Number(field.widthM)}
          fieldHeightM={Number(field.heightM)}
          growingCount={growingCount}
          harvestedCount={harvestedCount}
          facilityCount={facilityCount}
        />
      </div>

      {/* Bottom: status bar */}
      <EditorStatusBar
        fieldName={field.name}
        fieldWidthM={Number(field.widthM)}
        fieldHeightM={Number(field.heightM)}
      />

      {/* Plant crop dialog (opens after draw_rect completion) */}
      {farmId && (
        <PlantCropDialog
          farmId={farmId}
          open={pendingRect !== null}
          onOpenChange={(open) => {
            if (!open) setPendingRect(null);
          }}
          onSelect={handlePlantCrop}
          rectInfo={pendingRect}
        />
      )}
    </div>
  );
}
