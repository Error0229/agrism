"use client";

import {
  Eraser,
  Hand,
  MousePointer,
  Ruler,
  Square,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { type EditorTool, useFieldEditor } from "@/lib/store/field-editor-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface ToolDef {
  id: EditorTool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "選取", shortcut: "V", icon: MousePointer },
  { id: "draw_rect", label: "繪製區域", shortcut: "R", icon: Square },
  { id: "hand", label: "平移", shortcut: "H", icon: Hand },
  { id: "eraser", label: "橡皮擦", shortcut: "E", icon: Eraser },
  { id: "measure", label: "測量", shortcut: "M", icon: Ruler },
];

const SELECTION_TOOLS: EditorTool[] = ["select", "draw_rect"];
const NAVIGATION_TOOLS: EditorTool[] = ["hand"];
const ACTION_TOOLS: EditorTool[] = ["eraser", "measure"];

function getGroup(tool: EditorTool): number {
  if (SELECTION_TOOLS.includes(tool)) return 0;
  if (NAVIGATION_TOOLS.includes(tool)) return 1;
  if (ACTION_TOOLS.includes(tool)) return 2;
  return 0;
}

export function EditorToolbar() {
  const activeTool = useFieldEditor((s) => s.activeTool);
  const setTool = useFieldEditor((s) => s.setTool);

  return (
    <TooltipProvider>
      <div className="flex h-full w-12 flex-col items-center gap-1 border-r bg-background py-2">
        {TOOLS.map((tool, index) => {
          const group = getGroup(tool.id);
          const prevTool = index > 0 ? TOOLS[index - 1] : null;
          const showSep = prevTool !== null && getGroup(prevTool.id) !== group;
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <div key={tool.id} className="flex flex-col items-center">
              {showSep && <Separator className="my-1 w-8" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setTool(tool.id)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {tool.label} ({tool.shortcut})
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
