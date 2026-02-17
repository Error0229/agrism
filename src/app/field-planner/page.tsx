"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { useFields } from "@/lib/store/fields-context";
import { FieldToolbar } from "@/components/field-planner/field-toolbar";
import { FieldSettingsDialog } from "@/components/field-planner/field-settings-dialog";
import { TimelineSlider } from "@/components/field-planner/timeline-slider";
import { Button } from "@/components/ui/button";
import { evaluateFieldPlanningRules } from "@/lib/utils/rotation-companion-checker";
import { detectSpatialConflictsAt, replayPlannerEvents, type PlannerEvent } from "@/lib/planner/events";
import { Trash2, Move, MousePointer, AlertTriangle } from "lucide-react";

const FieldCanvas = dynamic(() => import("@/components/field-planner/field-canvas"), {
  ssr: false,
  loading: () => <div className="h-[500px] flex items-center justify-center text-muted-foreground border rounded-lg">載入畫布中...</div>,
});

function dateOnly(dateLike: string) {
  return dateLike.split("T")[0];
}

function toTimelineOccurredAt(date: string) {
  return `${date}T12:00:00.000Z`;
}

function getEventPlantedDate(event: PlannerEvent) {
  if (event.type !== "crop_planted" && event.type !== "crop_updated") return null;
  const payload = event.payload as { plantedDate?: unknown };
  if (typeof payload?.plantedDate !== "string") return null;
  return payload.plantedDate;
}

function describeEvent(event: PlannerEvent, cropNameById: Map<string, string>, fieldNameById: Map<string, string>) {
  const fieldName = (event.fieldId ? fieldNameById.get(event.fieldId) : undefined) ?? "田地";

  switch (event.type) {
    case "field_created": {
      const payload = event.payload as { name?: string };
      return `建立田地 ${payload.name ?? fieldName}`;
    }
    case "field_updated":
      return `更新田地設定 ${fieldName}`;
    case "field_removed":
      return `刪除田地 ${fieldName}`;
    case "crop_planted": {
      const payload = event.payload as { cropId?: string; plantedDate?: string };
      const cropName = (payload.cropId ? cropNameById.get(payload.cropId) : undefined) ?? "作物";
      const planDate = payload.plantedDate ? `（播種日 ${dateOnly(payload.plantedDate)}）` : "";
      return `新增種植 ${cropName}${planDate}`;
    }
    case "crop_updated": {
      const payload = event.payload as { cropId?: string; plantedDate?: string };
      const cropName = (payload.cropId ? cropNameById.get(payload.cropId) : undefined) ?? "作物";
      const planDate = payload.plantedDate ? `（播種日 ${dateOnly(payload.plantedDate)}）` : "";
      return `更新作物 ${cropName}${planDate}`;
    }
    case "crop_harvested":
      return "標記收成";
    case "crop_removed":
      return "移除作物";
    default:
      return "事件";
  }
}

export default function FieldPlannerPage() {
  const { fields, plannerEvents, showHarvestedCrops, isLoaded, removeField } = useFields();
  const allCrops = useAllCrops();
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [resizeMode, setResizeMode] = useState(false);
  const [timelineDate, setTimelineDate] = useState("");
  const [remoteTimelineEvents, setRemoteTimelineEvents] = useState<PlannerEvent[] | null>(null);
  const [remoteAnchors, setRemoteAnchors] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/planner/timeline")
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ events?: PlannerEvent[]; anchors?: string[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.events)) setRemoteTimelineEvents(data.events);
        if (Array.isArray(data?.anchors)) setRemoteAnchors(data.anchors);
      })
      .catch(() => {
        // Fall back to local timeline events when remote timeline is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const mergedEvents = useMemo(() => {
    const byId = new Map<string, PlannerEvent>();
    for (const event of remoteTimelineEvents ?? []) byId.set(event.id, event);
    for (const event of plannerEvents) byId.set(event.id, event);
    return Array.from(byId.values()).sort((a, b) => {
      const diff = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
  }, [plannerEvents, remoteTimelineEvents]);

  const timelineAnchors = useMemo(() => {
    if (remoteAnchors && remoteAnchors.length > 0) return remoteAnchors;
    const anchors = new Set<string>();
    for (const event of mergedEvents) {
      anchors.add(dateOnly(event.occurredAt));
      const plantedDate = getEventPlantedDate(event);
      if (plantedDate) anchors.add(dateOnly(plantedDate));
    }
    return Array.from(anchors).sort((a, b) => a.localeCompare(b));
  }, [mergedEvents, remoteAnchors]);

  const isTimelineMode = timelineDate.length > 0;
  const currentOccurredAt = isTimelineMode ? toTimelineOccurredAt(timelineDate) : undefined;

  const replayedCurrent = useMemo(() => {
    if (mergedEvents.length === 0) return fields;
    if (!isTimelineMode) return replayPlannerEvents(mergedEvents, { respectPlantedDate: true });
    return replayPlannerEvents(mergedEvents, { at: currentOccurredAt, respectPlantedDate: true });
  }, [mergedEvents, isTimelineMode, currentOccurredAt, fields]);

  const currentTab = (() => {
    const activeExists = replayedCurrent.some((field) => field.id === activeTab);
    if (activeExists) return activeTab;
    return replayedCurrent[0]?.id ?? "";
  })();

  const cropNameById = useMemo(() => new Map(allCrops.map((crop) => [crop.id, crop.name])), [allCrops]);

  const fieldNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of mergedEvents) {
      if (event.type === "field_created") {
        const payload = event.payload as { id?: string; name?: string };
        if (typeof payload.id === "string" && typeof payload.name === "string") {
          map.set(payload.id, payload.name);
        }
      }
    }
    for (const field of replayedCurrent) map.set(field.id, field.name);
    return map;
  }, [mergedEvents, replayedCurrent]);

  const timelineEventsForField = useMemo(() => {
    if (!isTimelineMode || !currentTab) return [];
    const selectedAt = new Date(currentOccurredAt ?? new Date().toISOString()).getTime();

    return [...mergedEvents]
      .filter((event) => event.fieldId === currentTab)
      .map((event) => {
        const eventAt = new Date(event.occurredAt).getTime();
        return {
          event,
          eventDate: dateOnly(event.occurredAt),
          isAfterSelectedDate: eventAt > selectedAt,
          description: describeEvent(event, cropNameById, fieldNameById),
        };
      })
      .sort((a, b) => {
        const diff = new Date(b.event.occurredAt).getTime() - new Date(a.event.occurredAt).getTime();
        if (diff !== 0) return diff;
        return b.event.id.localeCompare(a.event.id);
      });
  }, [isTimelineMode, currentTab, mergedEvents, currentOccurredAt, cropNameById, fieldNameById]);

  const futurePlantingPlans = useMemo(() => {
    if (!isTimelineMode || !currentTab) return [];
    const selectedAt = new Date(currentOccurredAt ?? new Date().toISOString()).getTime();

    return mergedEvents
      .filter((event) => event.fieldId === currentTab && (event.type === "crop_planted" || event.type === "crop_updated"))
      .map((event) => {
        const payload = event.payload as { cropId?: string; plantedDate?: string };
        if (!payload.plantedDate) return null;
        const plantedAt = new Date(payload.plantedDate).getTime();
        if (plantedAt <= selectedAt) return null;
        return {
          id: `${event.id}-${payload.plantedDate}`,
          cropName: (payload.cropId ? cropNameById.get(payload.cropId) : undefined) ?? "作物",
          plantedDate: dateOnly(payload.plantedDate),
        };
      })
      .filter((item): item is { id: string; cropName: string; plantedDate: string } => item !== null)
      .sort((a, b) => a.plantedDate.localeCompare(b.plantedDate));
  }, [isTimelineMode, currentTab, mergedEvents, currentOccurredAt, cropNameById]);

  const conflictsAtView = useMemo(() => {
    const at = currentOccurredAt ?? new Date().toISOString();
    return detectSpatialConflictsAt(mergedEvents, at);
  }, [mergedEvents, currentOccurredAt]);

  const conflictedByField = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const conflict of conflictsAtView) {
      const set = map.get(conflict.fieldId) ?? new Set<string>();
      set.add(conflict.cropId);
      set.add(conflict.conflictingCropId);
      map.set(conflict.fieldId, set);
    }
    return map;
  }, [conflictsAtView]);

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">載入中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">田地規劃</h1>
          <p className="text-muted-foreground">在 2D 平面上規劃您的田地配置</p>
        </div>
        <FieldSettingsDialog occurredAt={currentOccurredAt} />
      </div>

      <TimelineSlider
        anchors={timelineAnchors}
        value={timelineDate}
        events={mergedEvents}
        onChange={setTimelineDate}
        onReset={() => setTimelineDate("")}
      />

      {conflictsAtView.length > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-700">偵測到空間衝突（不阻擋操作）</p>
                {conflictsAtView.slice(0, 3).map((conflict) => (
                  <p key={`${conflict.fieldId}-${conflict.cropId}-${conflict.conflictingCropId}`} className="text-xs text-red-700/90">
                    {conflict.message}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={isTimelineMode ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]" : "space-y-4"}>
        <div>
          {replayedCurrent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">{isTimelineMode ? "所選日期尚無田地資料" : "尚未建立任何田地"}</p>
                {!isTimelineMode && <FieldSettingsDialog occurredAt={currentOccurredAt} />}
              </CardContent>
            </Card>
          ) : (
            <Tabs
              value={currentTab}
              onValueChange={(v) => {
                setActiveTab(v);
                setSelectedCropId(null);
              }}
            >
              <div className="flex items-center gap-2 overflow-x-auto">
                <TabsList>
                  {replayedCurrent.map((field) => (
                    <TabsTrigger key={field.id} value={field.id}>
                      {field.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {replayedCurrent.map((field) => (
                <TabsContent key={field.id} value={field.id} className="mt-4 space-y-3">
                  {(() => {
                    const warnings = evaluateFieldPlanningRules(field, allCrops);
                    if (warnings.length === 0) return null;
                    return (
                      <Card className="border-amber-200 bg-amber-50/40">
                        <CardContent className="pt-4 space-y-2">
                          <p className="text-sm font-medium text-amber-700">輪作與相伴風險提醒</p>
                          {warnings.slice(0, 4).map((warning) => (
                            <div key={warning.id} className="text-sm">
                              <p className="text-foreground">{warning.message}</p>
                              <p className="text-xs text-muted-foreground">建議替代：{warning.suggestions.join("、")}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FieldToolbar
                        field={field}
                        selectedCropId={selectedCropId}
                        onSelectCrop={setSelectedCropId}
                        occurredAt={currentOccurredAt}
                      />
                      <Button size="sm" variant={resizeMode ? "default" : "outline"} onClick={() => setResizeMode(!resizeMode)}>
                        {resizeMode ? (
                          <>
                            <MousePointer className="size-4 mr-1" />
                            完成調整
                          </>
                        ) : (
                          <>
                            <Move className="size-4 mr-1" />
                            調整大小
                          </>
                        )}
                      </Button>
                      {isTimelineMode && <span className="rounded bg-muted px-2 py-1 text-xs">正在編輯 {timelineDate}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">
                        {field.dimensions.width} x {field.dimensions.height} 公尺 &middot; {field.plantedCrops.filter((c) => c.status === "growing").length} 種作物
                        {!showHarvestedCrops && "（已隱藏收成）"}
                      </span>
                      <FieldSettingsDialog editField={field} occurredAt={currentOccurredAt} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          removeField(field.id, { occurredAt: currentOccurredAt });
                          setActiveTab("");
                          setSelectedCropId(null);
                        }}
                      >
                        <Trash2 className="size-4 mr-1" />
                        刪除田地
                      </Button>
                    </div>
                  </div>

                  <FieldCanvas
                    field={field}
                    selectedCropId={selectedCropId}
                    onSelectCrop={setSelectedCropId}
                    resizeMode={resizeMode}
                    occurredAt={currentOccurredAt}
                    showHarvestedCrops={showHarvestedCrops}
                    conflictedCropIds={Array.from(conflictedByField.get(field.id) ?? [])}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        {isTimelineMode && (
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">時間軸追溯</CardTitle>
              <p className="text-xs text-muted-foreground">{timelineDate} 的田區事件與後續規劃</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">後續規劃播種</p>
                {futurePlantingPlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">目前沒有晚於所選日期的播種計畫。</p>
                ) : (
                  <div className="space-y-2">
                    {futurePlantingPlans.slice(0, 6).map((plan) => (
                      <div key={plan.id} className="rounded-md border p-2 text-sm">
                        <p className="font-medium">{plan.cropName}</p>
                        <p className="text-xs text-muted-foreground">預計播種：{plan.plantedDate}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">操作事件</p>
                {timelineEventsForField.length === 0 ? (
                  <p className="text-sm text-muted-foreground">此田區尚無事件紀錄。</p>
                ) : (
                  <ScrollArea className="h-80 pr-2">
                    <div className="space-y-2">
                      {timelineEventsForField.slice(0, 20).map((item) => (
                        <div key={item.event.id} className="rounded-md border p-2">
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.eventDate}
                            {item.isAfterSelectedDate ? " ・ 選擇日期之後" : " ・ 選擇日期之前"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
