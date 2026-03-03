import { create } from "zustand";

import type { Command } from "./editor-commands";

export type EditorTool = "select" | "draw_rect" | "draw_polygon" | "hand" | "eraser" | "measure";

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

  // Cursor position (meters)
  cursorPosition: { xM: number; yM: number } | null;

  // Clipboard
  clipboard: ClipboardItem[];

  // Undo/Redo
  undoStack: Command[];
  redoStack: Command[];

  // Actions
  setActiveField(fieldId: string | null): void;
  setTool(tool: EditorTool): void;
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
  setCursorPosition(pos: { xM: number; yM: number } | null): void;
  setClipboard(items: ClipboardItem[]): void;

  executeCommand(command: Command): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  canUndo(): boolean;
  canRedo(): boolean;
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
  cursorPosition: null,
  clipboard: [],
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

  // --- Cursor position ---
  setCursorPosition(pos) {
    set({ cursorPosition: pos });
  },

  // --- Clipboard ---
  setClipboard(items) {
    set({ clipboard: items });
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
