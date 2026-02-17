"use client";

import type { PlannerEvent } from "@/lib/planner/events";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { History, ChevronLeft, ChevronRight } from "lucide-react";

interface TimelineSliderProps {
  anchors: string[];
  value: string;
  events: PlannerEvent[];
  onChange: (date: string) => void;
  onReset: () => void;
}

function markerClass(type: PlannerEvent["type"]) {
  switch (type) {
    case "crop_planted":
      return "bg-green-500";
    case "crop_harvested":
      return "bg-amber-500";
    case "crop_removed":
      return "bg-red-500";
    case "crop_updated":
      return "bg-blue-500";
    default:
      return "bg-muted-foreground";
  }
}

export function TimelineSlider({ anchors, value, events, onChange, onReset }: TimelineSliderProps) {
  const valueIndex = value ? anchors.findIndex((d) => d === value) : -1;
  const currentIndex = valueIndex >= 0 ? valueIndex : Math.max(anchors.length - 1, 0);
  const prevDate = currentIndex > 0 ? anchors[currentIndex - 1] : "";
  const nextDate = currentIndex < anchors.length - 1 ? anchors[currentIndex + 1] : "";

  const markerByDay = new Map<string, PlannerEvent["type"][]>();
  for (const event of events) {
    const day = event.occurredAt.split("T")[0];
    const list = markerByDay.get(day) ?? [];
    list.push(event.type);
    markerByDay.set(day, list);
  }

  if (anchors.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
        <History className="size-4" />
        尚無時間軸資料
      </div>
    );
  }

  return (
    <div className="rounded-md border px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="size-4" />
          <span>時間軸</span>
          <span className="font-medium text-foreground">{anchors[currentIndex]}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" disabled={!prevDate} onClick={() => onChange(prevDate)}>
            <ChevronLeft className="size-3" />
          </Button>
          <Button size="icon-xs" variant="ghost" disabled={!nextDate} onClick={() => onChange(nextDate)}>
            <ChevronRight className="size-3" />
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={onReset}>
              回到現在
            </Button>
          )}
        </div>
      </div>

      <div className="relative px-1">
        <Slider
          min={0}
          max={anchors.length - 1}
          value={[currentIndex]}
          step={1}
          onValueChange={(next) => {
            const idx = next[0] ?? 0;
            const nextDateValue = anchors[idx];
            if (nextDateValue) onChange(nextDateValue);
          }}
        />

        <div className="pointer-events-none relative mt-2 h-3">
          {anchors.map((date, idx) => {
            const types = markerByDay.get(date);
            if (!types || types.length === 0) return null;
            const type = types[types.length - 1];
            const left = anchors.length === 1 ? 0 : (idx / (anchors.length - 1)) * 100;
            return (
              <span
                key={date}
                className={`absolute top-0 block size-2 -translate-x-1/2 rounded-full ${markerClass(type)}`}
                style={{ left: `${left}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
