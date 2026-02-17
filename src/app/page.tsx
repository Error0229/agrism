"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { formatRelativeDate } from "@/lib/utils/date-helpers";
import { PlantingSuggestionsCard } from "@/components/dashboard/planting-suggestions";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { HarvestCountdown } from "@/components/dashboard/harvest-countdown";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { prioritizeWeeklyTasks } from "@/lib/utils/task-prioritizer";
import { Sprout, Map, CalendarDays, CheckCircle2, Check } from "lucide-react";
import { isToday, isThisWeek, isBefore, addDays } from "date-fns";

export default function HomePage() {
  const { fields, isLoaded: fieldsLoaded } = useFields();
  const { tasks, isLoaded: tasksLoaded, completeTask } = useTasks();
  const allCrops = useAllCrops();

  if (!fieldsLoaded || !tasksLoaded) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">載入中...</div>;
  }

  const allPlantedCrops = fields.flatMap((f) => f.plantedCrops);
  const growingCrops = allPlantedCrops.filter((c) => c.status === "growing");

  const todayTasks = tasks
    .filter((t) => !t.completed && isToday(new Date(t.dueDate)))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const prioritizedWeeklyTasks = prioritizeWeeklyTasks(tasks, allCrops).filter((entry) => !isToday(new Date(entry.task.dueDate)));
  const upcomingTasks = prioritizedWeeklyTasks.slice(0, 5);

  const thisWeekTasks = tasks.filter((t) => !t.completed && isThisWeek(new Date(t.dueDate)));
  const harvestable = tasks.filter(
    (t) => !t.completed && t.type === "收成" && isBefore(new Date(t.dueDate), addDays(new Date(), 7))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">花蓮蔬果種植指南</h1>
        <p className="text-muted-foreground">管理您的花蓮在地蔬果種植計畫</p>
      </div>

      {/* 快速操作列 */}
      <QuickActions />

      {/* 今日任務 */}
      {todayTasks.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-lg">今日任務</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayTasks.map((task) => {
                const crop = allCrops.find((c) => c.id === task.cropId);
                return (
                  <div key={task.id} className="flex items-center gap-3">
                    <button
                      onClick={() => completeTask(task.id)}
                      className="flex size-6 shrink-0 items-center justify-center rounded border-2 border-green-500 hover:bg-green-100 transition-colors"
                    >
                      {task.completed && <Check className="size-4" />}
                    </button>
                    <span className="text-lg">{crop?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{task.type}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快速統計 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-100 p-2">
              <Sprout className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{growingCrops.length}</p>
              <p className="text-xs text-muted-foreground">已種作物</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-2">
              <Map className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{fields.length}</p>
              <p className="text-xs text-muted-foreground">田地數量</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-100 p-2">
              <CalendarDays className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{thisWeekTasks.length}</p>
              <p className="text-xs text-muted-foreground">本週任務</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-red-100 p-2">
              <CheckCircle2 className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{harvestable.length}</p>
              <p className="text-xs text-muted-foreground">可收成作物</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 即將到來的任務 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">即將到來的任務</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                尚無排程任務。前往<Link href="/crops" className="text-primary underline mx-1">作物資料庫</Link>種植作物以自動產生任務。
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map(({ task, reasons }) => {
                  const crop = allCrops.find((c) => c.id === task.cropId);
                  return (
                    <div key={task.id} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => completeTask(task.id)}
                          className="flex size-5 shrink-0 items-center justify-center rounded border border-muted-foreground/30 hover:bg-green-100 transition-colors"
                        >
                          {task.completed && <Check className="size-3" />}
                        </button>
                        <span className="text-lg">{crop?.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeDate(task.dueDate)}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">{task.type}</Badge>
                      </div>
                      {reasons.length > 0 && (
                        <p className="text-xs text-muted-foreground pl-8">優先原因：{reasons.join("、")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 田地概覽 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">田地概覽</CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">尚未建立田地</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/field-planner">建立田地</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => (
                  <Link key={field.id} href="/field-planner" className="block">
                    <div className="rounded-lg border p-3 hover:bg-accent transition-colors">
                      <p className="font-medium text-sm">{field.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {field.dimensions.width} x {field.dimensions.height} 公尺 &middot;{" "}
                        {field.plantedCrops.filter((c) => c.status === "growing").length} 種作物
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 播種建議 + 收成倒數 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlantingSuggestionsCard />
        <HarvestCountdown />
      </div>

      {/* 即時天氣 */}
      <WeatherWidget />
    </div>
  );
}
