"use client";

import {
  Cable,
  CircleDot,
  Eraser,
  Hand,
  MousePointer,
  Pentagon,
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
  { id: "draw_polygon", label: "多邊形區域", shortcut: "P", icon: Pentagon },
  { id: "hand", label: "平移", shortcut: "H", icon: Hand },
  { id: "eraser", label: "橡皮擦", shortcut: "E", icon: Eraser },
  { id: "measure", label: "測量", shortcut: "M", icon: Ruler },
  { id: "utility_node", label: "設施節點", shortcut: "U", icon: CircleDot },
  { id: "utility_edge", label: "連接設施", shortcut: "C", icon: Cable },
];

const SELECTION_TOOLS: EditorTool[] = ["select", "draw_rect", "draw_polygon"];
const NAVIGATION_TOOLS: EditorTool[] = ["hand"];
const ACTION_TOOLS: EditorTool[] = ["eraser", "measure"];
const UTILITY_TOOLS: EditorTool[] = ["utility_node", "utility_edge"];

function getGroup(tool: EditorTool): number {
  if (SELECTION_TOOLS.includes(tool)) return 0;
  if (NAVIGATION_TOOLS.includes(tool)) return 1;
  if (ACTION_TOOLS.includes(tool)) return 2;
  if (UTILITY_TOOLS.includes(tool)) return 3;
  return 0;
}

interface EditorToolbarProps {
  orientation?: "vertical" | "horizontal";
}

export function EditorToolbar({ orientation = "vertical" }: EditorToolbarProps) {
  const activeTool = useFieldEditor((s) => s.activeTool);
  const setTool = useFieldEditor((s) => s.setTool);

  const isHorizontal = orientation === "horizontal";

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center gap-1 bg-background",
          isHorizontal
            ? "h-12 w-full flex-row justify-center border-t px-2 overflow-x-auto"
            : "h-full w-12 flex-col border-r py-2",
        )}
      >
        {TOOLS.map((tool, index) => {
          const group = getGroup(tool.id);
          const prevTool = index > 0 ? TOOLS[index - 1] : null;
          const showSep = prevTool !== null && getGroup(prevTool.id) !== group;
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <div
              key={tool.id}
              className={cn(
                "flex items-center",
                isHorizontal ? "flex-row" : "flex-col",
              )}
            >
              {showSep && (
                <Separator
                  orientation={isHorizontal ? "vertical" : "horizontal"}
                  className={cn(
                    isHorizontal ? "mx-1 h-6" : "my-1 w-8",
                  )}
                />
              )}
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
                <TooltipContent
                  side={isHorizontal ? "top" : "right"}
                  sideOffset={8}
                >
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
