"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/lib/store/tasks-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { taskTypeColors } from "@/lib/utils/calendar-helpers";
import { formatDate, getMonthName } from "@/lib/utils/date-helpers";
import { Check } from "lucide-react";
import type { TaskType } from "@/lib/types";

export function TaskTimeline() {
  const { tasks, completeTask } = useTasks();
  const allCrops = useAllCrops();

  const groupedTasks = useMemo(() => {
    const sorted = [...tasks].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    const groups: Record<string, typeof sorted> = {};
    sorted.forEach((task) => {
      const d = new Date(task.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        尚無任務。種植作物後將自動產生排程任務。
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedTasks).map(([key, monthTasks]) => {
        const [year, month] = key.split("-").map(Number);
        return (
          <div key={key}>
            <h3 className="font-semibold text-sm mb-3 sticky top-0 bg-background py-1">
              {year} 年 {getMonthName(month)}
            </h3>
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {monthTasks.map((task) => {
                const crop = allCrops.find((c) => c.id === task.cropId);
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${task.completed ? "opacity-50" : ""}`}
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      disabled={task.completed}
                      className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        task.completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-muted-foreground/30 hover:bg-green-100"
                      }`}
                    >
                      {task.completed && <Check className="size-3" />}
                    </button>
                    <div
                      className={`size-2 rounded-full shrink-0 ${taskTypeColors[task.type as TaskType]}`}
                    />
                    <span className="text-lg">{crop?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through" : ""}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(task.dueDate)} ・ {task.effortMinutes ?? 0} 分鐘
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{task.type}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
