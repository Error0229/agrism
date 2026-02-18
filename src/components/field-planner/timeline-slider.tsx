"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlannerEvent } from "@/lib/planner/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pruneTimelineDays } from "@/lib/utils/timeline-window";
import { History, ChevronLeft, ChevronRight } from "lucide-react";

interface TimelineSliderProps {
  anchors: string[];
  value: string;
  events: PlannerEvent[];
  onChange: (date: string) => void;
  onReset: () => void;
}

const INITIAL_RANGE_DAYS = 365;
const EXTEND_RANGE_DAYS = 180;
const EDGE_BUFFER_PX = 640;
const DAY_CELL_WIDTH = 92;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function addDaysToKey(key: string, delta: number) {
  const next = parseDateKey(key);
  next.setUTCDate(next.getUTCDate() + delta);
  return next.toISOString().slice(0, 10);
}

function addMonthsToKey(key: string, delta: number) {
  const next = parseDateKey(key);
  next.setUTCMonth(next.getUTCMonth() + delta);
  return next.toISOString().slice(0, 10);
}

function buildRange(center: string, beforeDays: number, afterDays: number) {
  const start = addDaysToKey(center, -beforeDays);
  const total = beforeDays + afterDays + 1;
  const days: string[] = [];
  for (let i = 0; i < total; i += 1) {
    days.push(addDaysToKey(start, i));
  }
  return days;
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

function isDateKey(input: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input);
}

export function TimelineSlider({ anchors, value, events, onChange, onReset }: TimelineSliderProps) {
  const activeDate = value || todayKey();
  const markerByDay = useMemo(() => {
    const map = new Map<string, PlannerEvent["type"][]>();
    for (const event of events) {
      const day = event.occurredAt.split("T")[0];
      const list = map.get(day) ?? [];
      list.push(event.type);
      map.set(day, list);
    }
    return map;
  }, [events]);

  const [days, setDays] = useState<string[]>(() => buildRange(activeDate, INITIAL_RANGE_DAYS, INITIAL_RANGE_DAYS));
  const [jumpDate, setJumpDate] = useState(activeDate);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const extendingRef = useRef(false);
  const pendingScrollShiftPxRef = useRef(0);

  const activeIndex = days.findIndex((day) => day === activeDate);

  useEffect(() => {
    setJumpDate(activeDate);
  }, [activeDate]);

  useEffect(() => {
    if (days.includes(activeDate)) return;
    setDays(buildRange(activeDate, INITIAL_RANGE_DAYS, INITIAL_RANGE_DAYS));
  }, [activeDate, days]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || activeIndex < 0) return;
    const left = Math.max(activeIndex * DAY_CELL_WIDTH - el.clientWidth / 2 + DAY_CELL_WIDTH / 2, 0);
    el.scrollTo({ left, behavior: "auto" });
  }, [activeIndex]);

  const moveByDays = (delta: number) => {
    onChange(addDaysToKey(activeDate, delta));
  };

  const moveByMonths = (delta: number) => {
    onChange(addMonthsToKey(activeDate, delta));
  };

  const jumpToDate = () => {
    if (!isDateKey(jumpDate)) return;
    onChange(jumpDate);
  };

  const ensureInfiniteRange = () => {
    const el = scrollerRef.current;
    if (!el || extendingRef.current) return;
    if (days.length === 0) return;

    if (el.scrollLeft < EDGE_BUFFER_PX) {
      extendingRef.current = true;
      const first = days[0];
      const prependStart = addDaysToKey(first, -EXTEND_RANGE_DAYS);
      const prependDays = Array.from({ length: EXTEND_RANGE_DAYS }, (_, index) => addDaysToKey(prependStart, index));
      setDays((prev) => {
        const next = [...prependDays, ...prev];
        const pruned = pruneTimelineDays(next, activeDate);
        pendingScrollShiftPxRef.current = (prependDays.length - pruned.trimmedLeft) * DAY_CELL_WIDTH;
        return pruned.days;
      });
      requestAnimationFrame(() => {
        const current = scrollerRef.current;
        if (current && pendingScrollShiftPxRef.current !== 0) {
          current.scrollLeft += pendingScrollShiftPxRef.current;
          pendingScrollShiftPxRef.current = 0;
        }
        extendingRef.current = false;
      });
      return;
    }

    const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);
    if (remaining < EDGE_BUFFER_PX) {
      extendingRef.current = true;
      const last = days[days.length - 1];
      const appendStart = addDaysToKey(last, 1);
      const appendDays = Array.from({ length: EXTEND_RANGE_DAYS }, (_, index) => addDaysToKey(appendStart, index));
      setDays((prev) => {
        const next = [...prev, ...appendDays];
        const pruned = pruneTimelineDays(next, activeDate);
        pendingScrollShiftPxRef.current = -pruned.trimmedLeft * DAY_CELL_WIDTH;
        return pruned.days;
      });
      requestAnimationFrame(() => {
        const current = scrollerRef.current;
        if (current && pendingScrollShiftPxRef.current !== 0) {
          current.scrollLeft += pendingScrollShiftPxRef.current;
          pendingScrollShiftPxRef.current = 0;
        }
        extendingRef.current = false;
      });
    }
  };

  const hasAnchorMarkers = anchors.length > 0;

  return (
    <div className="rounded-md border px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="size-4" />
          <span>時間軸</span>
          <span className="font-medium text-foreground">{activeDate}</span>
          {!hasAnchorMarkers && <span className="text-xs">（尚無事件）</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => moveByDays(-1)}>
            <ChevronLeft className="size-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveByDays(-7)}>
            -7 天
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveByMonths(-1)}>
            -1 月
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveByMonths(1)}>
            +1 月
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveByDays(7)}>
            +7 天
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={() => moveByDays(1)}>
            <ChevronRight className="size-3" />
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={onReset}>
              回到現在
            </Button>
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Input
          type="date"
          className="w-[180px]"
          value={jumpDate}
          onChange={(event) => setJumpDate(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") jumpToDate();
          }}
        />
        <Button size="sm" variant="outline" onClick={jumpToDate} disabled={!isDateKey(jumpDate)}>
          跳轉日期
        </Button>
      </div>

      <div
        ref={scrollerRef}
        className="overflow-x-auto rounded-md border bg-muted/10"
        onScroll={ensureInfiniteRange}
      >
        <div className="flex py-2">
          {days.map((day) => {
            const types = markerByDay.get(day);
            const type = types?.[types.length - 1];
            const isActive = day === activeDate;
            return (
              <button
                key={day}
                type="button"
                className={`shrink-0 px-2 text-center transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ width: DAY_CELL_WIDTH }}
                onClick={() => onChange(day)}
              >
                <div className={`text-sm font-medium ${isActive ? "underline underline-offset-4" : ""}`}>{day.slice(5)}</div>
                <div className="mt-1 flex h-3 items-center justify-center">
                  {type ? <span className={`block size-2 rounded-full ${markerClass(type)}`} /> : <span className="size-2" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">可左右捲動到任意日期；含事件日期會顯示彩色標記。</p>
    </div>
  );
}
