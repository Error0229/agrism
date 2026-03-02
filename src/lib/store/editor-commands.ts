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
