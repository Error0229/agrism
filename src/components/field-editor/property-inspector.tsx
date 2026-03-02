"use client";

import {
  Grid3X3,
  Magnet,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useFieldEditor } from "@/lib/store/field-editor-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PropertyInspectorProps {
  fieldName?: string;
  fieldWidthM?: number;
  fieldHeightM?: number;
  growingCount?: number;
  harvestedCount?: number;
  facilityCount?: number;
}

export function PropertyInspector({
  fieldName,
  fieldWidthM,
  fieldHeightM,
  growingCount = 0,
  harvestedCount = 0,
  facilityCount = 0,
}: PropertyInspectorProps) {
  const inspectorOpen = useFieldEditor((s) => s.inspectorOpen);
  const toggleInspector = useFieldEditor((s) => s.toggleInspector);
  const selectedIds = useFieldEditor((s) => s.selectedIds);
  const gridVisible = useFieldEditor((s) => s.gridVisible);
  const toggleGrid = useFieldEditor((s) => s.toggleGrid);
  const snapEnabled = useFieldEditor((s) => s.snapEnabled);
  const toggleSnap = useFieldEditor((s) => s.toggleSnap);
  const gridSpacing = useFieldEditor((s) => s.gridSpacing);
  const setGridSpacing = useFieldEditor((s) => s.setGridSpacing);

  return (
    <div
      className={cn(
        "flex flex-col border-l bg-background transition-[width] duration-200",
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
              />
            )}

            {selectedIds.length === 1 && (
              <SingleSelectionSection selectedId={selectedIds[0]} />
            )}

            {selectedIds.length > 1 && (
              <MultiSelectionSection count={selectedIds.length} />
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

      {/* Quick stats */}
      <div className="space-y-2">
        <SectionHeading>快速統計</SectionHeading>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatCard label="種植中" value={growingCount} />
          <StatCard label="已收成" value={harvestedCount} />
          <StatCard label="設施" value={facilityCount} />
        </div>
      </div>
    </>
  );
}

function SingleSelectionSection({ selectedId }: { selectedId: string }) {
  return (
    <div className="space-y-2">
      <SectionHeading>選取項目</SectionHeading>
      <p className="text-xs text-muted-foreground">
        ID: {selectedId.slice(0, 8)}...
      </p>
      <p className="text-xs text-muted-foreground">
        屬性面板將在畫布整合後顯示完整內容。
      </p>
    </div>
  );
}

function MultiSelectionSection({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      <SectionHeading>多重選取</SectionHeading>
      <p className="text-xs text-muted-foreground">
        已選取 {count} 個項目
      </p>
      <p className="text-xs text-muted-foreground">
        批量操作將在畫布整合後啟用。
      </p>
    </div>
  );
}

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
