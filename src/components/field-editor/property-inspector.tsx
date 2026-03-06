"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Check,
  CircleDot,
  Eye,
  EyeOff,
  Grid3X3,
  Magnet,
  MapPin,
  Merge,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Sprout,
  Crosshair,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type AlignType = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';

import { cn } from "@/lib/utils";
import { useFieldEditor } from "@/lib/store/field-editor-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useUpdateUtilityNode,
  useDeleteUtilityNode,
  useDeleteUtilityEdge,
  useUpdateFacility,
} from "@/hooks/use-fields";
import {
  CROP_CATEGORY_LABELS,
  PLANTED_CROP_STATUS_LABELS,
  FACILITY_TYPE_LABELS,
  UTILITY_KIND_LABELS,
  UTILITY_NODE_TYPE_LABELS,
} from "@/lib/types/labels";
import type { CropCategory, PlantedCropStatus, FacilityType, UtilityKind } from "@/lib/types/enums";
import { deriveFacilityType } from "@/lib/utils/facility-helpers";
import { WATER_NODE_TYPES, ELECTRIC_NODE_TYPES } from "@/lib/types/enums";
import { Input } from "@/components/ui/input";
import { LifecycleInspector } from "./lifecycle-inspector";

// --- Sortable section helpers ---

const SECTION_ORDER_KEY = "agrism:inspector-section-order";

function loadSectionOrder(context: string, defaults: string[]): string[] {
  try {
    const raw = localStorage.getItem(`${SECTION_ORDER_KEY}:${context}`);
    if (!raw) return defaults;
    const saved: string[] = JSON.parse(raw);
    // Ensure all default IDs are present (handles new sections added later)
    const set = new Set(saved);
    const merged = saved.filter((id) => defaults.includes(id));
    for (const id of defaults) {
      if (!set.has(id)) merged.push(id);
    }
    return merged;
  } catch {
    return defaults;
  }
}

function saveSectionOrder(context: string, order: string[]) {
  try {
    localStorage.setItem(`${SECTION_ORDER_KEY}:${context}`, JSON.stringify(order));
  } catch {
    // ignore storage errors
  }
}

function useSectionOrder(context: string, defaults: string[]) {
  const [order, setOrder] = useState(() => loadSectionOrder(context, defaults));
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const next = arrayMove(prev, oldIndex, newIndex);
        saveSectionOrder(context, next);
        return next;
      });
    },
    [context],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return { order, activeId, handleDragStart, handleDragEnd, handleDragCancel };
}

function SortableSection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/section relative">
      <div className="flex justify-center pt-0.5 pb-0.5">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className="flex h-3 w-10 cursor-grab items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-accent/50 group-hover/section:opacity-100 active:cursor-grabbing"
          aria-label="拖曳排序"
        >
          <span className="block h-1 w-8 rounded-full bg-muted-foreground/30" />
        </button>
      </div>
      {children}
    </div>
  );
}

function SortableSectionOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background p-2 shadow-md">
      {children}
    </div>
  );
}

// Field data type — resolved from Convex at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FieldData = any;

interface PropertyInspectorProps {
  field?: FieldData | null;
  fieldName?: string;
  fieldWidthM?: number;
  fieldHeightM?: number;
  growingCount?: number;
  harvestedCount?: number;
  facilityCount?: number;
  onDeleteSelected?: () => void;
  onDeleteArea?: (plantedCropId: string) => void;
  onRemovePlant?: (plantedCropId: string) => void;
  onChangeCrop?: (plantedCropId: string) => void;
  onMarkHarvested?: (plantedCropId: string) => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  onMergeZones?: () => void;
  onAlign?: (type: AlignType) => void;
  memo?: string | null;
  onMemoChange?: (memo: string) => void;
  /** When true, skip collapse header and always show content (for use inside Sheet) */
  embedded?: boolean;
}

export const PropertyInspector = React.memo(function PropertyInspector({
  field,
  fieldName,
  fieldWidthM,
  fieldHeightM,
  growingCount = 0,
  harvestedCount = 0,
  facilityCount = 0,
  onDeleteSelected,
  onDeleteArea,
  onRemovePlant,
  onChangeCrop,
  onMarkHarvested,
  onSplitHorizontal,
  onSplitVertical,
  onMergeZones,
  onAlign,
  memo,
  onMemoChange,
  embedded = false,
}: PropertyInspectorProps) {
  const inspectorOpen = useFieldEditor((s) => s.inspectorOpen);
  const toggleInspector = useFieldEditor((s) => s.toggleInspector);
  const selectedIds = useFieldEditor((s) => s.selectedIds);
  const clearSelection = useFieldEditor((s) => s.clearSelection);
  const gridVisible = useFieldEditor((s) => s.gridVisible);
  const toggleGrid = useFieldEditor((s) => s.toggleGrid);
  const snapEnabled = useFieldEditor((s) => s.snapEnabled);
  const toggleSnap = useFieldEditor((s) => s.toggleSnap);
  const gridSpacing = useFieldEditor((s) => s.gridSpacing);
  const setGridSpacing = useFieldEditor((s) => s.setGridSpacing);
  const layerVisibility = useFieldEditor((s) => s.layerVisibility);
  const toggleLayerVisibility = useFieldEditor((s) => s.toggleLayerVisibility);
  const showHarvested = useFieldEditor((s) => s.showHarvested);
  const toggleShowHarvested = useFieldEditor((s) => s.toggleShowHarvested);
  const activeFieldId = useFieldEditor((s) => s.activeFieldId);
  const bgEntry = useFieldEditor((s) => activeFieldId ? s.backgroundImages[activeFieldId] : undefined);
  const backgroundImage = bgEntry?.dataUrl ?? null;
  const backgroundOpacity = bgEntry?.opacity ?? 0.5;
  const setBackgroundOpacity = useFieldEditor((s) => s.setBackgroundOpacity);
  const setBackgroundImage = useFieldEditor((s) => s.setBackgroundImage);
  const timelineMode = useFieldEditor((s) => s.timelineMode);
  const timelineDate = useFieldEditor((s) => s.timelineDate);
  const calibrationMode = useFieldEditor((s) => s.calibrationMode);
  const calibrationPoints = useFieldEditor((s) => s.calibrationPoints);
  const calibrationDistanceM = useFieldEditor((s) => s.calibrationDistanceM);
  const enterCalibration = useFieldEditor((s) => s.enterCalibration);
  const exitCalibration = useFieldEditor((s) => s.exitCalibration);
  const setCalibrationDistance = useFieldEditor((s) => s.setCalibrationDistance);
  const resetCalibration = useFieldEditor((s) => s.resetCalibration);

  // Timeline stats
  const timelineStats = useMemo(() => {
    if (!timelineMode || !timelineDate || !field) return null;
    let growingAtDate = 0;
    let harvestedAtDate = 0;
    for (const pc of field.plantedCrops) {
      // Skip crops not yet planted at timeline date
      if (pc.plantedDate && pc.plantedDate > timelineDate) continue;
      // Count harvested
      if (pc.harvestedDate && pc.harvestedDate <= timelineDate) {
        harvestedAtDate++;
      } else {
        // Planted on or before date and not yet harvested
        growingAtDate++;
      }
    }
    return { growingAtDate, harvestedAtDate };
  }, [timelineMode, timelineDate, field]);

  // Resolve a single selected item into crop, facility, or utility node data
  const selectedItem = useMemo(() => {
    if (selectedIds.length !== 1 || !field) return null;
    const id = selectedIds[0];

    // Check planted crops (placements are inlined in Convex)
    const pc = field.plantedCrops.find((p: any) => p._id === id);
    if (pc) {
      return {
        kind: "crop" as const,
        plantedCrop: pc,
        crop: pc.crop,
      };
    }

    // Check facilities
    const facility = field.facilities.find((f: any) => f._id === id);
    if (facility) {
      return { kind: "facility" as const, facility };
    }

    // Check utility nodes
    const utilityNode = field.utilityNodes.find((n: any) => n._id === id);
    if (utilityNode) {
      return { kind: "utility_node" as const, utilityNode };
    }

    return null;
  }, [selectedIds, field]);

  const showContent = embedded || inspectorOpen;

  return (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col overflow-x-hidden",
        embedded
          ? ""
          : cn("border-l bg-background transition-[width] duration-200", inspectorOpen ? "w-[280px]" : "w-10"),
      )}
    >
      {/* Collapse / expand button — desktop only, hidden in embedded (mobile sheet) mode */}
      {!embedded && (
        <div className="flex h-10 items-center justify-center border-b">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleInspector}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                >
                  {inspectorOpen ? (
                    <PanelRightClose className="size-4" />
                  ) : (
                    <PanelRightOpen className="size-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={4}>
                {inspectorOpen ? "收起面板" : "展開面板"} (])
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {showContent && (
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            {selectedIds.length === 0 && (
              <>
                {timelineMode && timelineDate && timelineStats && (
                  <>
                    <div className="space-y-2">
                      <SectionHeading>時間軸</SectionHeading>
                      <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                        {timelineDate}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <StatCard label="種植中" value={timelineStats.growingAtDate} />
                        <StatCard label="已收成" value={timelineStats.harvestedAtDate} />
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                <FieldInfoSection
                  fieldName={fieldName}
                  fieldWidthM={fieldWidthM}
                  fieldHeightM={fieldHeightM}
                  growingCount={growingCount}
                  harvestedCount={harvestedCount}
                  facilityCount={facilityCount}
                  gridVisible={gridVisible}
                  toggleGrid={toggleGrid}
                  snapEnabled={snapEnabled}
                  toggleSnap={toggleSnap}
                  gridSpacing={gridSpacing}
                  setGridSpacing={setGridSpacing}
                  layerVisibility={layerVisibility}
                  toggleLayerVisibility={toggleLayerVisibility}
                  showHarvested={showHarvested}
                  toggleShowHarvested={toggleShowHarvested}
                />
              </>
            )}

            {selectedIds.length === 1 && selectedItem?.kind === "crop" && (
              <CropSelectionSection
                item={selectedItem}
                onDelete={onDeleteSelected}
                onDeleteArea={onDeleteArea ? () => onDeleteArea(selectedItem.plantedCrop._id) : undefined}
                onRemovePlant={onRemovePlant && selectedItem.plantedCrop.cropId ? () => onRemovePlant(selectedItem.plantedCrop._id) : undefined}
                onDeselect={clearSelection}
                onChangeCrop={onChangeCrop ? () => onChangeCrop(selectedItem.plantedCrop._id) : undefined}
                onMarkHarvested={onMarkHarvested && selectedItem.plantedCrop.status === "growing" ? () => onMarkHarvested(selectedItem.plantedCrop._id) : undefined}
                onSplitHorizontal={onSplitHorizontal}
                onSplitVertical={onSplitVertical}
              />
            )}

            {selectedIds.length === 1 && selectedItem?.kind === "facility" && field && (
              <FacilitySelectionSection
                item={selectedItem}
                field={field}
                onDelete={onDeleteSelected}
                onDeselect={clearSelection}
              />
            )}

            {selectedIds.length === 1 && selectedItem?.kind === "utility_node" && field && (
              <UtilityNodeSelectionSection
                item={selectedItem}
                field={field}
                onDelete={onDeleteSelected}
                onDeselect={clearSelection}
              />
            )}

            {selectedIds.length === 1 && !selectedItem && (
              <div className="space-y-2">
                <SectionHeading>選取項目</SectionHeading>
                <p className="text-xs text-muted-foreground">
                  找不到項目資料
                </p>
              </div>
            )}

            {selectedIds.length > 1 && (
              <MultiSelectionSection
                count={selectedIds.length}
                onDelete={onDeleteSelected}
                onDeselect={clearSelection}
                onAlign={onAlign}
                onMergeZones={selectedIds.length === 2 ? onMergeZones : undefined}
              />
            )}

            {/* Background image section */}
            {backgroundImage && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>背景圖片</SectionHeading>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">透明度</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(backgroundOpacity * 100)}
                      onChange={(e) => { if (activeFieldId) setBackgroundOpacity(activeFieldId, Number(e.target.value) / 100); }}
                      className="flex-1"
                    />
                    <span className="w-8 text-right text-xs">{Math.round(backgroundOpacity * 100)}%</span>
                  </div>

                  {/* Calibration */}
                  {!calibrationMode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={enterCalibration}
                    >
                      <Crosshair className="mr-1 size-3" />
                      校準比例
                    </Button>
                  ) : (
                    <CalibrationPanel
                      calibrationPoints={calibrationPoints}
                      calibrationDistanceM={calibrationDistanceM}
                      onSetDistance={setCalibrationDistance}
                      onApply={() => {
                        if (calibrationPoints.length === 2 && calibrationDistanceM && calibrationDistanceM > 0) {
                          const dx = calibrationPoints[1].xM - calibrationPoints[0].xM;
                          const dy = calibrationPoints[1].yM - calibrationPoints[0].yM;
                          const pixelDistM = Math.sqrt(dx * dx + dy * dy);
                          if (pixelDistM > 0) {
                            const metersPerUnit = calibrationDistanceM / pixelDistM;
                            toast.success(`校準完成：1 單位 = ${metersPerUnit.toFixed(2)} 公尺`);
                          }
                        }
                        exitCalibration();
                      }}
                      onCancel={() => {
                        resetCalibration();
                        exitCalibration();
                      }}
                    />
                  )}

                  <Button variant="outline" size="sm" className="w-full" onClick={() => { if (activeFieldId) setBackgroundImage(activeFieldId, null); }}>
                    移除圖片
                  </Button>
                </div>
              </>
            )}

            {/* Memo section — always visible at bottom */}
            {onMemoChange && (
              <>
                <Separator />
                <MemoSection memo={memo ?? ""} onMemoChange={onMemoChange} />
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
});

// --- Sub-sections ---

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function PropRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

const FieldInfoSection = React.memo(function FieldInfoSection({
  fieldName,
  fieldWidthM,
  fieldHeightM,
  growingCount,
  harvestedCount,
  facilityCount,
  gridVisible,
  toggleGrid,
  snapEnabled,
  toggleSnap,
  gridSpacing,
  setGridSpacing,
  layerVisibility,
  toggleLayerVisibility,
  showHarvested,
  toggleShowHarvested,
}: {
  fieldName?: string;
  fieldWidthM?: number;
  fieldHeightM?: number;
  growingCount: number;
  harvestedCount: number;
  facilityCount: number;
  gridVisible: boolean;
  toggleGrid: () => void;
  snapEnabled: boolean;
  toggleSnap: () => void;
  gridSpacing: number;
  setGridSpacing: (m: number) => void;
  layerVisibility: {
    crops: boolean;
    facilities: boolean;
    waterUtilities: boolean;
    electricUtilities: boolean;
  };
  toggleLayerVisibility: (layer: "crops" | "facilities" | "waterUtilities" | "electricUtilities") => void;
  showHarvested: boolean;
  toggleShowHarvested: () => void;
}) {
  const area =
    fieldWidthM != null && fieldHeightM != null
      ? (fieldWidthM * fieldHeightM).toFixed(1)
      : null;

  const FIELD_DEFAULTS = ["grid-snap", "layers", "stats"];
  const { order, activeId, handleDragStart, handleDragEnd, handleDragCancel } = useSectionOrder("field-info", FIELD_DEFAULTS);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sectionMap: Record<string, React.ReactNode> = {
    "grid-snap": (
      <div className="space-y-2">
        <SectionHeading>格線與吸附</SectionHeading>
        <ToggleRow
          icon={<Grid3X3 className="size-3.5" />}
          label="格線"
          enabled={gridVisible}
          onToggle={toggleGrid}
        />
        <ToggleRow
          icon={<Magnet className="size-3.5" />}
          label="吸附"
          enabled={snapEnabled}
          onToggle={toggleSnap}
        />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">間距</span>
          <select
            value={gridSpacing}
            onChange={(e) => setGridSpacing(Number(e.target.value))}
            className="h-6 rounded border bg-background px-1 text-xs"
          >
            <option value={0.5}>0.5m</option>
            <option value={1}>1m</option>
            <option value={2}>2m</option>
            <option value={5}>5m</option>
          </select>
        </div>
      </div>
    ),
    "layers": (
      <div className="space-y-2">
        <SectionHeading>圖層</SectionHeading>
        <ToggleRow
          icon={layerVisibility.crops ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          label="作物區域"
          enabled={layerVisibility.crops}
          onToggle={() => toggleLayerVisibility("crops")}
        />
        <ToggleRow
          icon={layerVisibility.facilities ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          label="設施"
          enabled={layerVisibility.facilities}
          onToggle={() => toggleLayerVisibility("facilities")}
        />
        <ToggleRow
          icon={layerVisibility.waterUtilities ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          label="水利設施"
          enabled={layerVisibility.waterUtilities}
          onToggle={() => toggleLayerVisibility("waterUtilities")}
        />
        <ToggleRow
          icon={layerVisibility.electricUtilities ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          label="電力設施"
          enabled={layerVisibility.electricUtilities}
          onToggle={() => toggleLayerVisibility("electricUtilities")}
        />
        <ToggleRow
          icon={showHarvested ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          label="已收成區域"
          enabled={showHarvested}
          onToggle={toggleShowHarvested}
        />
      </div>
    ),
    "stats": (
      <div className="space-y-2">
        <SectionHeading>統計</SectionHeading>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatCard label="種植中" value={growingCount} />
          <StatCard label="已收成" value={harvestedCount} />
          <StatCard label="設施" value={facilityCount} />
        </div>
      </div>
    ),
  };

  return (
    <>
      {/* Field properties — pinned top */}
      <div className="space-y-2">
        <SectionHeading>田地資訊</SectionHeading>
        {fieldName && (
          <p className="text-sm font-medium">{fieldName}</p>
        )}
        {fieldWidthM != null && fieldHeightM != null && (
          <p className="text-xs text-muted-foreground">
            {fieldWidthM} &times; {fieldHeightM} m
            {area && <> &mdash; {area} m&sup2;</>}
          </p>
        )}
      </div>

      {/* Sortable sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id) => (
            <SortableSection key={id} id={id}>
              {sectionMap[id]}
            </SortableSection>
          ))}
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <SortableSectionOverlay>
              {sectionMap[activeId]}
            </SortableSectionOverlay>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
});

// --- Crop selection ---

const CropSelectionSection = React.memo(function CropSelectionSection({
  item,
  onDelete: _onDelete,
  onDeleteArea,
  onRemovePlant,
  onDeselect,
  onChangeCrop,
  onMarkHarvested,
  onSplitHorizontal,
  onSplitVertical,
}: {
  item: {
    plantedCrop: FieldData["plantedCrops"][number];
    crop: FieldData["plantedCrops"][number]["crop"];
  };
  onDelete?: () => void;
  onDeleteArea?: () => void;
  onRemovePlant?: () => void;
  onDeselect: () => void;
  onChangeCrop?: () => void;
  onMarkHarvested?: () => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
}) {
  // In Convex, placement data (xM, yM, widthM, heightM) is inlined into plantedCrop
  const { plantedCrop, crop } = item;

  const statusLabel =
    PLANTED_CROP_STATUS_LABELS[plantedCrop.status as PlantedCropStatus] ??
    plantedCrop.status;

  const categoryLabel = crop
    ? (CROP_CATEGORY_LABELS[crop.category as CropCategory] ?? crop.category)
    : null;

  const area = (Number(plantedCrop.widthM ?? 1) * Number(plantedCrop.heightM ?? 1)).toFixed(
    1,
  );

  const CROP_DEFAULTS = ["area-info", "lifecycle", "notes", "actions"];
  const { order, activeId, handleDragStart, handleDragEnd, handleDragCancel } = useSectionOrder("crop-selection", CROP_DEFAULTS);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sectionMap: Record<string, React.ReactNode> = {
    "area-info": (
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-0.5">
          <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
            <MapPin className="size-3" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">
            區域資訊
          </h3>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-muted/20 px-2.5 py-2">
          <PropRow label="X" value={`${Number(plantedCrop.xM).toFixed(1)} m`} />
          <PropRow label="Y" value={`${Number(plantedCrop.yM).toFixed(1)} m`} />
          <PropRow label="寬" value={`${Number(plantedCrop.widthM ?? 1).toFixed(1)} m`} />
          <PropRow label="高" value={`${Number(plantedCrop.heightM ?? 1).toFixed(1)} m`} />
        </div>
        <div className="px-0.5">
          <PropRow label="面積" value={<>{area} m&sup2;</>} />
        </div>
      </div>
    ),
    "lifecycle": (
      <LifecycleInspector plantedCrop={plantedCrop} cropGrowthDays={crop?.growthDays} />
    ),
    "notes": plantedCrop.notes ? (
      <div className="rounded-md border border-dashed border-border/40 bg-muted/10 px-2.5 py-2">
        <p className="text-[10px] font-medium text-muted-foreground">備註</p>
        <p className="mt-0.5 text-xs leading-relaxed">{plantedCrop.notes}</p>
      </div>
    ) : null,
    "actions": (
      <div className="space-y-2">
        {onChangeCrop && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={onChangeCrop}
          >
            <RefreshCw className="mr-1 size-3" />
            變更作物
          </Button>
        )}

        {onMarkHarvested && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={onMarkHarvested}
          >
            <Check className="mr-1 size-3" />
            標記為已收成
          </Button>
        )}

        {(onSplitHorizontal || onSplitVertical) && (
          <>
            <SectionHeading>動作</SectionHeading>
            <div className="flex gap-2">
              {onSplitHorizontal && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={onSplitHorizontal}
                >
                  <SplitSquareHorizontal className="mr-1 size-3" />
                  水平分割
                </Button>
              )}
              {onSplitVertical && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={onSplitVertical}
                >
                  <SplitSquareVertical className="mr-1 size-3" />
                  垂直分割
                </Button>
              )}
            </div>
          </>
        )}

        {onRemovePlant && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={onRemovePlant}
          >
            <Sprout className="mr-1 size-3" />
            移除作物
          </Button>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={onDeselect}
          >
            取消選取
          </Button>
          {onDeleteArea && (
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={onDeleteArea}
            >
              <Trash2 className="mr-1 size-3" />
              刪除區域
            </Button>
          )}
        </div>
      </div>
    ),
  };

  return (
    <>
      {/* Header — crop identity (pinned, not draggable) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/5 text-xl">
            {crop?.emoji ?? ""}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{crop?.name ?? "未指定作物"}</p>
            <div className="flex items-center gap-1.5">
              {categoryLabel && (
                <span className="text-[10px] text-muted-foreground">{categoryLabel}</span>
              )}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-medium",
                  plantedCrop.status === "growing" &&
                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  plantedCrop.status === "harvested" &&
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  plantedCrop.status === "removed" &&
                    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sortable sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id) => {
            const content = sectionMap[id];
            if (content === null || content === undefined) return null;
            return (
              <SortableSection key={id} id={id}>
                {content}
              </SortableSection>
            );
          })}
        </SortableContext>
        <DragOverlay>
          {activeId && sectionMap[activeId] != null ? (
            <SortableSectionOverlay>
              {sectionMap[activeId]}
            </SortableSectionOverlay>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
});

// --- Facility selection ---

const FacilitySelectionSection = React.memo(function FacilitySelectionSection({
  item,
  field,
  onDelete,
  onDeselect,
}: {
  item: { facility: FieldData["facilities"][number] };
  field: FieldData;
  onDelete?: () => void;
  onDeselect: () => void;
}) {
  const { facility } = item;
  const updateFacility = useUpdateFacility();

  const typeLabel =
    FACILITY_TYPE_LABELS[facility.facilityType as FacilityType] ??
    facility.facilityType;

  const area = (Number(facility.widthM) * Number(facility.heightM)).toFixed(1);

  return (
    <>
      {/* Header */}
      <div className="space-y-2">
        <SectionHeading>設施屬性</SectionHeading>
        <div className="flex items-center gap-2">
          <Wrench className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{facility.name}</p>
            <p className="text-[10px] text-muted-foreground">{typeLabel}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Editable fields */}
      <div className="space-y-2">
        <SectionHeading>設定</SectionHeading>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">設施類型</label>
          <select
            value={facility.facilityType}
            onChange={(e) => {
              updateFacility({
                facilityId: facility._id as any,
                fieldId: field._id,
                facilityType: e.target.value as FacilityType,
              });
            }}
            className="h-7 w-full rounded border bg-background px-2 text-xs"
          >
            {Object.entries(FACILITY_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">顯示名稱</label>
          <Input
            defaultValue={facility.name}
            className="h-7 text-xs"
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== facility.name) {
                const derived = deriveFacilityType(val);
                const data: { name: string; facilityType?: FacilityType } = { name: val };
                // Auto-derive facility type from name when type is currently 'custom'
                if (facility.facilityType === "custom" && derived !== "custom") {
                  data.facilityType = derived as FacilityType;
                }
                updateFacility({
                  facilityId: facility._id as any,
                  fieldId: field._id,
                  ...data,
                });
              }
            }}
          />
        </div>
      </div>

      <Separator />

      {/* Geometry */}
      <div className="space-y-1.5">
        <SectionHeading>位置與尺寸</SectionHeading>
        <PropRow label="X" value={`${Number(facility.xM).toFixed(1)} m`} />
        <PropRow label="Y" value={`${Number(facility.yM).toFixed(1)} m`} />
        <PropRow
          label="寬"
          value={`${Number(facility.widthM).toFixed(1)} m`}
        />
        <PropRow
          label="高"
          value={`${Number(facility.heightM).toFixed(1)} m`}
        />
        <PropRow label="面積" value={<>{area} m&sup2;</>} />
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={onDeselect}
        >
          取消選取
        </Button>
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 size-3" />
            刪除
          </Button>
        )}
      </div>
    </>
  );
});

// --- Utility node selection ---

const UtilityNodeSelectionSection = React.memo(function UtilityNodeSelectionSection({
  item,
  field,
  onDelete,
  onDeselect,
}: {
  item: { utilityNode: FieldData["utilityNodes"][number] };
  field: FieldData;
  onDelete?: () => void;
  onDeselect: () => void;
}) {
  const { utilityNode } = item;
  const updateNode = useUpdateUtilityNode();
  const deleteNode = useDeleteUtilityNode();
  const deleteEdge = useDeleteUtilityEdge();

  const kindLabel =
    UTILITY_KIND_LABELS[utilityNode.kind as UtilityKind] ?? utilityNode.kind;

  const nodeTypeLabel = utilityNode.nodeType
    ? (UTILITY_NODE_TYPE_LABELS[utilityNode.nodeType] ?? utilityNode.nodeType)
    : null;

  // Node types for current kind
  const nodeTypesForKind = utilityNode.kind === "water" ? WATER_NODE_TYPES : ELECTRIC_NODE_TYPES;

  // Find connected edges with node info
  const connectedEdges = useMemo(() => {
    const edges: { edgeId: string; nodeId: string; nodeLabel: string }[] = [];
    for (const edge of field.utilityEdges) {
      if (edge.fromNodeId === utilityNode._id) {
        const toNode = field.utilityNodes.find((n: any) => n._id === edge.toNodeId);
        if (toNode) edges.push({ edgeId: edge._id, nodeId: toNode._id, nodeLabel: toNode.label });
      } else if (edge.toNodeId === utilityNode._id) {
        const fromNode = field.utilityNodes.find((n: any) => n._id === edge.fromNodeId);
        if (fromNode) edges.push({ edgeId: edge._id, nodeId: fromNode._id, nodeLabel: fromNode.label });
      }
    }
    return edges;
  }, [field.utilityEdges, field.utilityNodes, utilityNode._id]);

  return (
    <>
      {/* Header */}
      <div className="space-y-2">
        <SectionHeading>設施節點</SectionHeading>
        <div className="flex items-center gap-2">
          <CircleDot
            className="size-5"
            style={{ color: utilityNode.kind === "water" ? "#0ea5e9" : "#fb923c" }}
          />
          <div>
            <p className="text-sm font-medium">{utilityNode.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {kindLabel}{nodeTypeLabel ? ` / ${nodeTypeLabel}` : ""}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Editable fields */}
      <div className="space-y-2">
        <SectionHeading>設定</SectionHeading>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">類型</label>
          <select
            value={utilityNode.kind}
            onChange={(e) => {
              updateNode({
                nodeId: utilityNode._id as any,
                fieldId: field._id,
                kind: e.target.value as UtilityKind,
              });
            }}
            className="h-7 w-full rounded border bg-background px-2 text-xs"
          >
            {Object.entries(UTILITY_KIND_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">節點類型</label>
          <select
            value={utilityNode.nodeType ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              updateNode({
                nodeId: utilityNode._id as any,
                fieldId: field._id,
                nodeType: val || undefined,
              });
            }}
            className="h-7 w-full rounded border bg-background px-2 text-xs"
          >
            <option value="">未指定</option>
            {nodeTypesForKind.map((nt) => (
              <option key={nt} value={nt}>
                {UTILITY_NODE_TYPE_LABELS[nt] ?? nt}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">標籤</label>
          <Input
            defaultValue={utilityNode.label}
            className="h-7 text-xs"
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== utilityNode.label) {
                updateNode({
                  nodeId: utilityNode._id as any,
                  fieldId: field._id,
                  label: val,
                });
              }
            }}
          />
        </div>
      </div>

      <Separator />

      {/* Connected edges with delete */}
      <div className="space-y-1.5">
        <SectionHeading>連接 ({connectedEdges.length})</SectionHeading>
        {connectedEdges.length === 0 ? (
          <p className="text-xs text-muted-foreground">無連接</p>
        ) : (
          <div className="space-y-1">
            {connectedEdges.map((ce) => (
              <div key={ce.edgeId} className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">&rarr;</span>
                <span className="flex-1">{ce.nodeLabel}</span>
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80"
                  onClick={() => {
                    deleteEdge({ edgeId: ce.edgeId as any });
                  }}
                  title="刪除連線"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={onDeselect}
          >
            取消選取
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={() => {
              deleteNode({ nodeId: utilityNode._id as any });
              onDelete?.();
            }}
          >
            <Trash2 className="mr-1 size-3" />
            刪除節點
          </Button>
        </div>
      </div>
    </>
  );
});

// --- Multi selection ---

const MultiSelectionSection = React.memo(function MultiSelectionSection({
  count,
  onDelete,
  onDeselect,
  onAlign,
  onMergeZones,
}: {
  count: number;
  onDelete?: () => void;
  onDeselect: () => void;
  onAlign?: (type: AlignType) => void;
  onMergeZones?: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <SectionHeading>多重選取</SectionHeading>
        <p className="text-sm font-medium">
          已選取 {count} 個項目
        </p>
      </div>

      {onAlign && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">對齊</h4>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => onAlign('left')}>
                      <AlignStartVertical className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>靠左對齊</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => onAlign('centerH')}>
                      <AlignCenterHorizontal className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>水平置中</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => onAlign('right')}>
                      <AlignEndVertical className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>靠右對齊</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => onAlign('top')}>
                      <AlignStartHorizontal className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>靠上對齊</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => onAlign('centerV')}>
                      <AlignCenterVertical className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>垂直置中</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => onAlign('bottom')}>
                      <AlignEndHorizontal className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>靠下對齊</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </>
      )}

      {onMergeZones && (
        <>
          <Separator />
          <div className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              onClick={onMergeZones}
            >
              <Merge className="mr-1 size-3" />
              合併區域
            </Button>
          </div>
        </>
      )}

      <Separator />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={onDeselect}
        >
          取消選取
        </Button>
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 size-3" />
            刪除全部
          </Button>
        )}
      </div>
    </>
  );
});

// --- Shared sub-components ---

function ToggleRow({
  icon,
  label,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent/50"
    >
      <span className={cn(enabled ? "text-foreground" : "text-muted-foreground/50")}>
        {icon}
      </span>
      <span className={cn(enabled ? "text-foreground" : "text-muted-foreground/50")}>
        {label}
      </span>
      <span className="ml-auto text-[10px] text-muted-foreground">
        {enabled ? "開" : "關"}
      </span>
    </button>
  );
}

const MemoSection = React.memo(function MemoSection({
  memo,
  onMemoChange,
}: {
  memo: string;
  onMemoChange: (memo: string) => void;
}) {
  const [localMemo, setLocalMemo] = useState(memo);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when field data updates externally
  useEffect(() => {
    setLocalMemo(memo);
  }, [memo]);

  const handleChange = useCallback(
    (value: string) => {
      setLocalMemo(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onMemoChange(value);
      }, 1000);
    },
    [onMemoChange],
  );

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onMemoChange(localMemo);
  }, [localMemo, onMemoChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <NotebookPen className="size-3 text-muted-foreground" />
        <SectionHeading>備忘錄</SectionHeading>
      </div>
      <Textarea
        value={localMemo}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="在此輸入備忘錄..."
        className="min-h-[80px] resize-y text-xs"
      />
      <p className="text-right text-[10px] text-muted-foreground">
        {localMemo.length} 字
      </p>
    </div>
  );
});

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

// --- Calibration panel ---

const CalibrationPanel = React.memo(function CalibrationPanel({
  calibrationPoints,
  calibrationDistanceM,
  onSetDistance,
  onApply,
  onCancel,
}: {
  calibrationPoints: { xM: number; yM: number }[];
  calibrationDistanceM: number | null;
  onSetDistance: (meters: number) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const hasBothPoints = calibrationPoints.length === 2;

  return (
    <div className="space-y-2 rounded border border-red-200 bg-red-50/50 p-2 dark:border-red-900 dark:bg-red-950/20">
      <p className="text-xs font-medium text-red-700 dark:text-red-400">
        校準模式
      </p>
      <p className="text-[10px] text-muted-foreground">
        點擊地圖上兩個已知距離的點
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">點 1:</span>
          {calibrationPoints[0] ? (
            <span className="text-green-600 dark:text-green-400">
              ✓ ({calibrationPoints[0].xM.toFixed(1)}, {calibrationPoints[0].yM.toFixed(1)})
            </span>
          ) : (
            <span className="text-muted-foreground">等待中...</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">點 2:</span>
          {calibrationPoints[1] ? (
            <span className="text-green-600 dark:text-green-400">
              ✓ ({calibrationPoints[1].xM.toFixed(1)}, {calibrationPoints[1].yM.toFixed(1)})
            </span>
          ) : (
            <span className="text-muted-foreground">等待中...</span>
          )}
        </div>
      </div>
      {hasBothPoints && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            實際距離 (公尺):
          </label>
          <Input
            type="number"
            min={0.01}
            step={0.1}
            placeholder="例如: 10"
            className="h-7 text-xs"
            value={calibrationDistanceM ?? ""}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val > 0) onSetDistance(val);
            }}
          />
        </div>
      )}
      <div className="flex gap-2">
        {hasBothPoints && calibrationDistanceM && calibrationDistanceM > 0 && (
          <Button
            variant="default"
            size="sm"
            className="flex-1 text-xs"
            onClick={onApply}
          >
            套用
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={onCancel}
        >
          取消
        </Button>
      </div>
    </div>
  );
});
