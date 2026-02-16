"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlantingCalendar } from "@/components/calendar/planting-calendar";
import { TaskTimeline } from "@/components/calendar/task-timeline";
import { AddTaskDialog } from "@/components/calendar/add-task-dialog";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">種植月曆</h1>
          <p className="text-muted-foreground">管理種植排程與任務</p>
        </div>
        <AddTaskDialog />
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">月曆</TabsTrigger>
          <TabsTrigger value="timeline">時間軸</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          <PlantingCalendar />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <TaskTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
