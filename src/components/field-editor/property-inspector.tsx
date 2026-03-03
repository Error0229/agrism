"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CircleDot,
  Eye,
  EyeOff,
  Grid3X3,
  Magnet,
  MapPin,
  Move,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Sprout,
  Trash2,
  Wrench,
} from "lucide-react";

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
  useUpdateFacility,
} from "@/hooks/use-fields";
import {
  CROP_CATEGORY_LABELS,
  PLANTED_CROP_STATUS_LABELS,
  FACILITY_TYPE_LABELS,
  UTILITY_KIND_LABELS,
} from "@/lib/types/labels";
import type { CropCategory, PlantedCropStatus, FacilityType, UtilityKind } from "@/lib/types/enums";
import { Input } from "@/components/ui/input";

// Field data type derived from getFieldById()
type FieldData = NonNullable<
  Awaited<ReturnType<typeof import("@/server/actions/fields").getFieldById>>
>;

interface PropertyInspectorProps {
  field?: FieldData | null;
  fieldName?: string;
  fieldWidthM?: number;
  fieldHeightM?: number;
  growingCount?: number;
  harvestedCount?: number;
  facilityCount?: number;
  onDeleteSelected?: () => void;
  onChangeCrop?: (plantedCropId: string) => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  memo?: string | null;
  onMemoChange?: (memo: string) => void;
}

export function PropertyInspector({
  field,
  fieldName,
  fieldWidthM,
  fieldHeightM,
  growingCount = 0,
  harvestedCount = 0,
  facilityCount = 0,
  onDeleteSelected,
  onChangeCrop,
  onSplitHorizontal,
  onSplitVertical,
  memo,
  onMemoChange,
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

  // Resolve a single selected item into crop, facility, or utility node data
  const selectedItem = useMemo(() => {
    if (selectedIds.length !== 1 || !field) return null;
    const id = selectedIds[0];

    // Check placements (crops)
    const placement = field.placements.find((p) => p.id === id);
    if (placement) {
      const pcRow = field.plantedCrops.find(
        (row) => row.plantedCrop.id === placement.plantedCropId,
      );
      if (pcRow) {
        return {
          kind: "crop" as const,
          placement,
          plantedCrop: pcRow.plantedCrop,
          crop: pcRow.crop,
        };
      }
    }

    // Check facilities
    const facility = field.facilities.find((f) => f.id === id);
    if (facility) {
      return { kind: "facility" as const, facility };
    }

    // Check utility nodes
    const utilityNode = field.utilityNodes.find((n) => n.id === id);
    if (utilityNode) {
      return { kind: "utility_node" as const, utilityNode };
    }

    return null;
  }, [selectedIds, field]);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-l bg-background transition-[width] duration-200",
        inspectorOpen ? "w-[280px]" : "w-10",
      )}
    >
      {/* Collapse / expand button */}
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

      {inspectorOpen && (
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            {selectedIds.length === 0 && (
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
              />
            )}

            {selectedIds.length === 1 && selectedItem?.kind === "crop" && (
              <CropSelectionSection
                item={selectedItem}
                onDelete={onDeleteSelected}
                onDeselect={clearSelection}
                onChangeCrop={onChangeCrop ? () => onChangeCrop(selectedItem.plantedCrop.id) : undefined}
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
              />
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
}

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

function FieldInfoSection({
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
}) {
  const area =
    fieldWidthM != null && fieldHeightM != null
      ? (fieldWidthM * fieldHeightM).toFixed(1)
      : null;

  return (
    <>
      {/* Field properties */}
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

      {/* Grid & snap toggles */}
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

      {/* Layer visibility */}
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
      </div>

      {/* Quick stats */}
      <div className="space-y-2">
        <SectionHeading>統計</SectionHeading>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatCard label="種植中" value={growingCount} />
          <StatCard label="已收成" value={harvestedCount} />
          <StatCard label="設施" value={facilityCount} />
        </div>
      </div>
    </>
  );
}

// --- Crop selection ---

function CropSelectionSection({
  item,
  onDelete,
  onDeselect,
  onChangeCrop,
  onSplitHorizontal,
  onSplitVertical,
}: {
  item: {
    placement: FieldData["placements"][number];
    plantedCrop: FieldData["plantedCrops"][number]["plantedCrop"];
    crop: FieldData["plantedCrops"][number]["crop"];
  };
  onDelete?: () => void;
  onDeselect: () => void;
  onChangeCrop?: () => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
}) {
  const { placement, plantedCrop, crop } = item;

  const statusLabel =
    PLANTED_CROP_STATUS_LABELS[plantedCrop.status as PlantedCropStatus] ??
    plantedCrop.status;

  const categoryLabel = crop
    ? (CROP_CATEGORY_LABELS[crop.category as CropCategory] ?? crop.category)
    : null;

  const growthDays = plantedCrop.customGrowthDays ?? crop?.growthDays;

  const area = (Number(placement.widthM) * Number(placement.heightM)).toFixed(
    1,
  );

  return (
    <>
      {/* Header */}
      <div className="space-y-2">
        <SectionHeading>{crop ? "作物屬性" : "區域屬性"}</SectionHeading>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{crop?.emoji ?? ""}</span>
          <div>
            <p className="text-sm font-medium">{crop?.name ?? "未指定作物"}</p>
            {categoryLabel && (
              <p className="text-[10px] text-muted-foreground">{categoryLabel}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Status */}
      <div className="space-y-1.5">
        <SectionHeading>狀態</SectionHeading>
        <div className="flex items-center gap-1.5 text-xs">
          <Sprout className="size-3 text-muted-foreground" />
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
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

      <Separator />

      {/* Geometry */}
      <div className="space-y-1.5">
        <SectionHeading>位置與尺寸</SectionHeading>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            <span>位置</span>
          </div>
          <PropRow
            label="X"
            value={`${Number(placement.xM).toFixed(1)} m`}
          />
          <PropRow
            label="Y"
            value={`${Number(placement.yM).toFixed(1)} m`}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Move className="size-3" />
            <span>尺寸</span>
          </div>
          <PropRow
            label="寬"
            value={`${Number(placement.widthM).toFixed(1)} m`}
          />
          <PropRow
            label="高"
            value={`${Number(placement.heightM).toFixed(1)} m`}
          />
          <PropRow label="面積" value={<>{area} m&sup2;</>} />
        </div>
      </div>

      <Separator />

      {/* Dates */}
      <div className="space-y-1.5">
        <SectionHeading>種植資訊</SectionHeading>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          <span>日期</span>
        </div>
        {plantedCrop.plantedDate && (
          <PropRow label="種植日" value={plantedCrop.plantedDate} />
        )}
        {plantedCrop.harvestedDate && (
          <PropRow label="收成日" value={plantedCrop.harvestedDate} />
        )}
        {growthDays != null && (
          <PropRow label="生長天數" value={`${growthDays} 天`} />
        )}
        {plantedCrop.notes && (
          <div className="mt-1.5">
            <p className="text-[10px] text-muted-foreground">備註</p>
            <p className="text-xs">{plantedCrop.notes}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
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

        {/* Split operations */}
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
      </div>
    </>
  );
}

// --- Facility selection ---

function FacilitySelectionSection({
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
              updateFacility.mutate({
                id: facility.id,
                fieldId: field.id,
                data: { facilityType: e.target.value as FacilityType },
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
                updateFacility.mutate({
                  id: facility.id,
                  fieldId: field.id,
                  data: { name: val },
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
}

// --- Utility node selection ---

function UtilityNodeSelectionSection({
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

  const kindLabel =
    UTILITY_KIND_LABELS[utilityNode.kind as UtilityKind] ?? utilityNode.kind;

  // Find connected nodes via edges
  const connectedNodes = useMemo(() => {
    const connected: { id: string; label: string }[] = [];
    for (const edge of field.utilityEdges) {
      if (edge.fromNodeId === utilityNode.id) {
        const toNode = field.utilityNodes.find((n) => n.id === edge.toNodeId);
        if (toNode) connected.push({ id: toNode.id, label: toNode.label });
      } else if (edge.toNodeId === utilityNode.id) {
        const fromNode = field.utilityNodes.find((n) => n.id === edge.fromNodeId);
        if (fromNode) connected.push({ id: fromNode.id, label: fromNode.label });
      }
    }
    return connected;
  }, [field.utilityEdges, field.utilityNodes, utilityNode.id]);

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
            <p className="text-[10px] text-muted-foreground">{kindLabel}</p>
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
              updateNode.mutate({
                id: utilityNode.id,
                fieldId: field.id,
                data: { kind: e.target.value as UtilityKind },
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
          <label className="text-xs text-muted-foreground">子類型</label>
          <Input
            defaultValue={utilityNode.nodeType ?? ""}
            placeholder="general"
            className="h-7 text-xs"
            onBlur={(e) => {
              const val = e.target.value.trim();
              updateNode.mutate({
                id: utilityNode.id,
                fieldId: field.id,
                data: { nodeType: val || null },
              });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">標籤</label>
          <Input
            defaultValue={utilityNode.label}
            className="h-7 text-xs"
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== utilityNode.label) {
                updateNode.mutate({
                  id: utilityNode.id,
                  fieldId: field.id,
                  data: { label: val },
                });
              }
            }}
          />
        </div>
      </div>

      <Separator />

      {/* Connected nodes */}
      <div className="space-y-1.5">
        <SectionHeading>連接</SectionHeading>
        {connectedNodes.length === 0 ? (
          <p className="text-xs text-muted-foreground">無連接</p>
        ) : (
          <div className="space-y-1">
            {connectedNodes.map((cn) => (
              <div key={cn.id} className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">&rarr;</span>
                <span>{cn.label}</span>
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
              deleteNode.mutate({ id: utilityNode.id, fieldId: field.id });
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
}

// --- Multi selection ---

function MultiSelectionSection({
  count,
  onDelete,
  onDeselect,
}: {
  count: number;
  onDelete?: () => void;
  onDeselect: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <SectionHeading>多重選取</SectionHeading>
        <p className="text-sm font-medium">
          已選取 {count} 個項目
        </p>
      </div>

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
}

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

function MemoSection({
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
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
