export type TimelineShortcutAction =
  | { type: "days"; delta: number }
  | { type: "months"; delta: number }
  | { type: "reset" };

export function resolveTimelineShortcut(input: { key: string; shiftKey?: boolean }): TimelineShortcutAction | null {
  const shiftKey = input.shiftKey ?? false;
  if (input.key === "ArrowLeft") {
    return { type: "days", delta: shiftKey ? -7 : -1 };
  }
  if (input.key === "ArrowRight") {
    return { type: "days", delta: shiftKey ? 7 : 1 };
  }
  if (input.key === "PageUp") {
    return { type: "months", delta: -1 };
  }
  if (input.key === "PageDown") {
    return { type: "months", delta: 1 };
  }
  if (input.key === "Home") {
    return { type: "reset" };
  }
  return null;
}
