export interface Command {
  id: string;
  label: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
}

let commandCounter = 0;

function nextCommandId(): string {
  return `cmd-${++commandCounter}-${Date.now()}`;
}

export function createMoveCommand(params: {
  ids: string[];
  dx: number;
  dy: number;
  updateFn: (
    id: string,
    data: { xM: number; yM: number },
  ) => Promise<unknown>;
  positions: Map<string, { xM: number; yM: number }>;
}): Command {
  const { ids, dx, dy, updateFn, positions } = params;

  return {
    id: nextCommandId(),
    label: `Move ${ids.length} item(s)`,
    async execute() {
      for (const id of ids) {
        const orig = positions.get(id);
        if (!orig) continue;
        await updateFn(id, { xM: orig.xM + dx, yM: orig.yM + dy });
      }
    },
    async undo() {
      for (const id of ids) {
        const orig = positions.get(id);
        if (!orig) continue;
        await updateFn(id, { xM: orig.xM, yM: orig.yM });
      }
    },
  };
}

export function createResizeCommand(params: {
  id: string;
  oldBounds: { xM: number; yM: number; widthM: number; heightM: number };
  newBounds: { xM: number; yM: number; widthM: number; heightM: number };
  updateFn: (
    id: string,
    data: { xM: number; yM: number; widthM: number; heightM: number },
  ) => Promise<unknown>;
}): Command {
  const { id, oldBounds, newBounds, updateFn } = params;

  return {
    id: nextCommandId(),
    label: "Resize item",
    async execute() {
      await updateFn(id, newBounds);
    },
    async undo() {
      await updateFn(id, oldBounds);
    },
  };
}

export function createPlantCropCommand(params: {
  plantFn: () => Promise<{ plantedCropId: string }>;
  removeFn: (plantedCropId: string) => Promise<void>;
  restoreFn: (plantedCropId: string) => Promise<void>;
}): Command {
  const { plantFn, removeFn, restoreFn } = params;
  let plantedCropId: string | null = null;

  return {
    id: nextCommandId(),
    label: "Plant crop",
    async execute() {
      if (plantedCropId) {
        // Re-executing after undo (redo): restore the soft-deleted crop
        await restoreFn(plantedCropId);
      } else {
        // First execution: create the crop
        const result = await plantFn();
        plantedCropId = result.plantedCropId;
      }
    },
    async undo() {
      if (!plantedCropId) return;
      await removeFn(plantedCropId);
    },
  };
}

export function createDeleteCommand(params: {
  ids: string[];
  deleteFn: (id: string) => Promise<void>;
  restoreFn: (id: string) => Promise<void>;
}): Command {
  const { ids, deleteFn, restoreFn } = params;

  return {
    id: nextCommandId(),
    label: `Delete ${ids.length} item(s)`,
    async execute() {
      for (const id of ids) {
        await deleteFn(id);
      }
    },
    async undo() {
      for (const id of ids) {
        await restoreFn(id);
      }
    },
  };
}
