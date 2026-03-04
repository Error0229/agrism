"use client";

import React from "react";
import { useFieldEditor } from "@/lib/store/field-editor-store";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";

export const EditorTimelineBar = React.memo(function EditorTimelineBar() {
  const timelineDate = useFieldEditor((s) => s.timelineDate);
  const setTimelineDate = useFieldEditor((s) => s.setTimelineDate);
  const prevDay = useFieldEditor((s) => s.timelinePrevDay);
  const nextDay = useFieldEditor((s) => s.timelineNextDay);
  const prevMonth = useFieldEditor((s) => s.timelinePrevMonth);
  const nextMonth = useFieldEditor((s) => s.timelineNextMonth);
  const today = useFieldEditor((s) => s.timelineToday);
  const exit = useFieldEditor((s) => s.exitTimeline);

  if (!timelineDate) return null;

  return (
    <div className="flex h-9 items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <span className="font-medium text-amber-800 dark:text-amber-200">時間軸:</span>
      <input
        type="date"
        value={timelineDate}
        onChange={(e) => setTimelineDate(e.target.value)}
        className="h-7 rounded border bg-background px-2 text-xs"
      />
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="size-7" onClick={prevMonth}>
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={prevDay}>
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={nextDay}>
          <ChevronRight className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={nextMonth}>
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={today}>
        今天
      </Button>
      <div className="flex-1" />
      <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-700 dark:text-amber-300" onClick={exit}>
        <X className="mr-1 size-3" /> 結束
      </Button>
    </div>
  );
});
