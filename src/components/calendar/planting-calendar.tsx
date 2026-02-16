"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/lib/store/tasks-context";
import { getCropById } from "@/lib/data/crops-database";
import { isSameDay, formatDate } from "@/lib/utils/date-helpers";
import { Check } from "lucide-react";
import { zhTW } from "date-fns/locale";

export function PlantingCalendar() {
  const { tasks, completeTask } = useTasks();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const incompleteTasks = tasks.filter((t) => !t.completed);

  const tasksForDate = selectedDate
    ? tasks.filter((t) => isSameDay(t.dueDate, selectedDate))
    : [];

  // collect dates that have tasks
  const taskDates = incompleteTasks.map((t) => new Date(t.dueDate));

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <Card>
        <CardContent className="pt-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={zhTW}
            className="rounded-md"
            modifiers={{
              hasTask: taskDates,
            }}
            modifiersClassNames={{
              hasTask: "font-bold text-primary",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">
            {selectedDate ? formatDate(selectedDate) : "選擇日期"}
          </h3>
          {tasksForDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">此日期無排定任務</p>
          ) : (
            <div className="space-y-3">
              {tasksForDate.map((task) => {
                const crop = getCropById(task.cropId);
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${task.completed ? "opacity-50" : ""}`}
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
                    <span className="text-lg">{crop?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? "line-through" : ""}`}>{task.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{task.type}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
