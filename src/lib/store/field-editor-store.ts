import { create } from "zustand";

import type { Command } from "./editor-commands";

export type EditorTool = "select" | "draw_rect" | "draw_polygon" | "hand" | "eraser" | "measure" | "utility_node" | "utility_edge";

export interface ClipboardItem {
  kind: "crop" | "facility";
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  cropId?: string;
  facilityType?: string;
  name?: string;
}

const MAX_UNDO_STACK = 100;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

interface FieldEditorState {
  // Active field
  activeFieldId: string | null;

  // Tool
  activeTool: EditorTool;
  previousTool: EditorTool | null;

  // Selection (multi-select)
  selectedIds: string[];

  // Viewport
  zoom: number;
  pan: { x: number; y: number };

  // Grid & snap
  gridVisible: boolean;
  gridSpacing: number; // meters
  snapEnabled: boolean;

  // Inspector
  inspectorOpen: boolean;

  // Layer visibility
  layerVisibility: {
    crops: boolean;
    facilities: boolean;
    waterUtilities: boolean;
    electricUtilities: boolean;
  };

  // Harvested zone visibility
  showHarvested: boolean;

  // Timeline mode
  timelineMode: boolean;
  timelineDate: string | null; // "2026-03-03"

  // Cursor position (meters)
  cursorPosition: { xM: number; yM: number } | null;

  // Clipboard
  clipboard: ClipboardItem[];

  // Background image (map import)
  backgroundImage: string | null;
  backgroundOpacity: number;

  // Calibration
  calibrationMode: boolean;
  calibrationPoints: { xM: number; yM: number }[];
  calibrationDistanceM: number | null;

  // Utility node type for placement
  utilityNodeType: string;

  // Undo/Redo
  undoStack: Command[];
  redoStack: Command[];

  // Actions
  setActiveField(fieldId: string | null): void;
  setTool(tool: EditorTool): void;
  setUtilityNodeType(type: string): void;
  setTemporaryTool(tool: EditorTool): void;
  restoreTool(): void;

  select(id: string): void;
  deselect(id: string): void;
  toggleSelect(id: string): void;
  clearSelection(): void;
  selectMultiple(ids: string[]): void;

  setZoom(zoom: number): void;
  zoomIn(): void;
  zoomOut(): void;
  resetZoom(): void;
  zoomToFit(fieldWidthM: number, fieldHeightM: number, viewportWidth: number, viewportHeight: number): void;
  setPan(x: number, y: number): void;

  toggleGrid(): void;
  setGridSpacing(meters: number): void;
  toggleSnap(): void;
  toggleInspector(): void;

  toggleLayerVisibility(layer: keyof FieldEditorState['layerVisibility']): void;
  toggleShowHarvested(): void;
  zoomToSelection(itemBounds: { xM: number; yM: number; widthM: number; heightM: number }[], viewportWidth: number, viewportHeight: number): void;
  setCursorPosition(pos: { xM: number; yM: number } | null): void;
  setClipboard(items: ClipboardItem[]): void;

  setBackgroundImage(dataUrl: string | null): void;
  setBackgroundOpacity(opacity: number): void;

  enterCalibration(): void;
  exitCalibration(): void;
  addCalibrationPoint(point: { xM: number; yM: number }): void;
  setCalibrationDistance(meters: number): void;
  resetCalibration(): void;

  enterTimeline(date?: string): void;
  exitTimeline(): void;
  setTimelineDate(date: string): void;
  timelinePrevDay(): void;
  timelineNextDay(): void;
  timelinePrevMonth(): void;
  timelineNextMonth(): void;
  timelineToday(): void;

  initFromStorage(): void;

  executeCommand(command: Command): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  canUndo(): boolean;
  canRedo(): boolean;
}

const SETTINGS_STORAGE_KEY = 'field-editor-settings';

interface PersistedSettings {
  layerVisibility?: Record<string, boolean>;
  gridVisible?: boolean;
  gridSpacing?: number;
  snapEnabled?: boolean;
  showHarvested?: boolean;
  inspectorOpen?: boolean;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export const useFieldEditor = create<FieldEditorState>((set, get) => ({
  // --- Initial state ---
  activeFieldId: null,
  activeTool: "select",
  previousTool: null,
  selectedIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridVisible: true,
  gridSpacing: 1,
  snapEnabled: true,
  inspectorOpen: true,
  layerVisibility: { crops: true, facilities: true, waterUtilities: true, electricUtilities: true },
  showHarvested: true,
  timelineMode: false,
  timelineDate: null,
  cursorPosition: null,
  clipboard: [],
  backgroundImage: null,
  backgroundOpacity: 0.5,
  calibrationMode: false,
  calibrationPoints: [],
  calibrationDistanceM: null,
  utilityNodeType: "junction",
  undoStack: [],
  redoStack: [],

  // --- Active field ---
  setActiveField(fieldId) {
    set({
      activeFieldId: fieldId,
      selectedIds: [],
      undoStack: [],
      redoStack: [],
      zoom: 1,
      pan: { x: 0, y: 0 },
      activeTool: "select",
      previousTool: null,
    });
  },

  // --- Tool ---
  setTool(tool) {
    set({ activeTool: tool, previousTool: null });
  },

  setUtilityNodeType(type) {
    set({ utilityNodeType: type });
  },

  setTemporaryTool(tool) {
    const { activeTool, previousTool } = get();
    if (previousTool !== null) return; // already overridden
    set({ activeTool: tool, previousTool: activeTool });
  },

  restoreTool() {
    const { previousTool } = get();
    if (previousTool === null) return;
    set({ activeTool: previousTool, previousTool: null });
  },

  // --- Selection ---
  select(id) {
    set({ selectedIds: [id] });
  },

  deselect(id) {
    set((state) => ({
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    }));
  },

  toggleSelect(id) {
    set((state) => {
      const exists = state.selectedIds.includes(id);
      return {
        selectedIds: exists
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      };
    });
  },

  clearSelection() {
    set({ selectedIds: [] });
  },

  selectMultiple(ids) {
    set({ selectedIds: [...ids] });
  },

  // --- Viewport ---
  setZoom(zoom) {
    set({ zoom: clampZoom(zoom) });
  },

  zoomIn() {
    set((state) => ({ zoom: clampZoom(state.zoom + ZOOM_STEP) }));
  },

  zoomOut() {
    set((state) => ({ zoom: clampZoom(state.zoom - ZOOM_STEP) }));
  },

  resetZoom() {
    set({ zoom: 1, pan: { x: 0, y: 0 } });
  },

  zoomToFit(fieldWidthM, fieldHeightM, viewportWidth, viewportHeight) {
    const PIXELS_PER_METER = 100;
    const padding = 0.9; // use 90% of viewport
    const scaleX = (viewportWidth * padding) / (fieldWidthM * PIXELS_PER_METER);
    const scaleY = (viewportHeight * padding) / (fieldHeightM * PIXELS_PER_METER);
    const newZoom = clampZoom(Math.min(scaleX, scaleY));
    const panX = (viewportWidth - fieldWidthM * PIXELS_PER_METER * newZoom) / 2;
    const panY = (viewportHeight - fieldHeightM * PIXELS_PER_METER * newZoom) / 2;
    set({ zoom: newZoom, pan: { x: panX, y: panY } });
  },

  setPan(x, y) {
    set({ pan: { x, y } });
  },

  // --- Grid & Snap ---
  toggleGrid() {
    set((state) => ({ gridVisible: !state.gridVisible }));
  },

  setGridSpacing(meters) {
    set({ gridSpacing: Math.max(0.1, meters) });
  },

  toggleSnap() {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },

  // --- Inspector ---
  toggleInspector() {
    set((state) => ({ inspectorOpen: !state.inspectorOpen }));
  },

  // --- Layer visibility ---
  toggleLayerVisibility(layer) {
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    }));
  },

  // --- Harvested visibility ---
  toggleShowHarvested() {
    set((state) => ({ showHarvested: !state.showHarvested }));
  },

  // --- Zoom to selection ---
  zoomToSelection(itemBounds, viewportWidth, viewportHeight) {
    if (itemBounds.length === 0) return;
    const PIXELS_PER_METER = 100;
    const padding = 0.9; // 10% padding on each side
    const minX = Math.min(...itemBounds.map((b) => b.xM));
    const minY = Math.min(...itemBounds.map((b) => b.yM));
    const maxX = Math.max(...itemBounds.map((b) => b.xM + b.widthM));
    const maxY = Math.max(...itemBounds.map((b) => b.yM + b.heightM));
    const boundsW = maxX - minX;
    const boundsH = maxY - minY;
    const scaleX = (viewportWidth * padding) / (boundsW * PIXELS_PER_METER);
    const scaleY = (viewportHeight * padding) / (boundsH * PIXELS_PER_METER);
    const newZoom = clampZoom(Math.min(scaleX, scaleY));
    const centerXPx = ((minX + maxX) / 2) * PIXELS_PER_METER * newZoom;
    const centerYPx = ((minY + maxY) / 2) * PIXELS_PER_METER * newZoom;
    const panX = viewportWidth / 2 - centerXPx;
    const panY = viewportHeight / 2 - centerYPx;
    set({ zoom: newZoom, pan: { x: panX, y: panY } });
  },

  // --- Cursor position ---
  setCursorPosition(pos) {
    set({ cursorPosition: pos });
  },

  // --- Clipboard ---
  setClipboard(items) {
    set({ clipboard: items });
  },

  // --- Background image ---
  setBackgroundImage(dataUrl) {
    set({ backgroundImage: dataUrl });
  },

  setBackgroundOpacity(opacity) {
    set({ backgroundOpacity: Math.max(0, Math.min(1, opacity)) });
  },

  // --- Calibration ---
  enterCalibration() {
    set({ calibrationMode: true, calibrationPoints: [], calibrationDistanceM: null });
  },
  exitCalibration() {
    set({ calibrationMode: false });
  },
  addCalibrationPoint(point) {
    set((state) => ({
      calibrationPoints: [...state.calibrationPoints, point].slice(0, 2),
    }));
  },
  setCalibrationDistance(meters) {
    set({ calibrationDistanceM: meters });
  },
  resetCalibration() {
    set({ calibrationPoints: [], calibrationDistanceM: null });
  },

  // --- Timeline mode ---
  enterTimeline(date) {
    set({ timelineMode: true, timelineDate: date ?? new Date().toISOString().split('T')[0] });
  },
  exitTimeline() {
    set({ timelineMode: false, timelineDate: null });
  },
  setTimelineDate(date) {
    set({ timelineDate: date });
  },
  timelinePrevDay() {
    const { timelineDate } = get();
    if (!timelineDate) return;
    const d = new Date(timelineDate);
    d.setDate(d.getDate() - 1);
    set({ timelineDate: d.toISOString().split('T')[0] });
  },
  timelineNextDay() {
    const { timelineDate } = get();
    if (!timelineDate) return;
    const d = new Date(timelineDate);
    d.setDate(d.getDate() + 1);
    set({ timelineDate: d.toISOString().split('T')[0] });
  },
  timelinePrevMonth() {
    const { timelineDate } = get();
    if (!timelineDate) return;
    const d = new Date(timelineDate);
    d.setMonth(d.getMonth() - 1);
    set({ timelineDate: d.toISOString().split('T')[0] });
  },
  timelineNextMonth() {
    const { timelineDate } = get();
    if (!timelineDate) return;
    const d = new Date(timelineDate);
    d.setMonth(d.getMonth() + 1);
    set({ timelineDate: d.toISOString().split('T')[0] });
  },
  timelineToday() {
    set({ timelineDate: new Date().toISOString().split('T')[0] });
  },

  // --- Persistence ---
  initFromStorage() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const settings: PersistedSettings = JSON.parse(raw);
      set({
        ...(settings.layerVisibility && { layerVisibility: { ...get().layerVisibility, ...settings.layerVisibility } }),
        ...(settings.gridVisible !== undefined && { gridVisible: settings.gridVisible }),
        ...(settings.gridSpacing !== undefined && { gridSpacing: settings.gridSpacing }),
        ...(settings.snapEnabled !== undefined && { snapEnabled: settings.snapEnabled }),
        ...(settings.showHarvested !== undefined && { showHarvested: settings.showHarvested }),
        ...(settings.inspectorOpen !== undefined && { inspectorOpen: settings.inspectorOpen }),
      });
    } catch { /* ignore corrupt data */ }
  },

  // --- Undo / Redo ---
  async executeCommand(command) {
    await command.execute();
    set((state) => ({
      undoStack: [command, ...state.undoStack].slice(0, MAX_UNDO_STACK),
      redoStack: [],
    }));
  },

  async undo() {
    const { undoStack } = get();
    const command = undoStack[0];
    if (!command) return;
    await command.undo();
    set((state) => ({
      undoStack: state.undoStack.slice(1),
      redoStack: [command, ...state.redoStack],
    }));
  },

  async redo() {
    const { redoStack } = get();
    const command = redoStack[0];
    if (!command) return;
    await command.execute();
    set((state) => ({
      redoStack: state.redoStack.slice(1),
      undoStack: [command, ...state.undoStack].slice(0, MAX_UNDO_STACK),
    }));
  },

  canUndo() {
    return get().undoStack.length > 0;
  },

  canRedo() {
    return get().redoStack.length > 0;
  },
}));

// Persist settings to localStorage (debounced)
let persistTimeout: ReturnType<typeof setTimeout> | null = null;

useFieldEditor.subscribe((state) => {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    try {
      const settings: PersistedSettings = {
        layerVisibility: state.layerVisibility,
        gridVisible: state.gridVisible,
        gridSpacing: state.gridSpacing,
        snapEnabled: state.snapEnabled,
        showHarvested: state.showHarvested,
        inspectorOpen: state.inspectorOpen,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore storage errors */ }
  }, 500);
});
