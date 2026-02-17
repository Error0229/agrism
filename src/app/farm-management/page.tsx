"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HarvestLogTab } from "@/components/farm-management/harvest-log-tab";
import { FinanceTab } from "@/components/farm-management/finance-tab";
import { SoilNotesTab } from "@/components/farm-management/soil-notes-tab";
import { WeatherTab } from "@/components/farm-management/weather-tab";
import { RotationTab } from "@/components/farm-management/rotation-tab";

function FarmManagementContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "harvest";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="harvest">收成紀錄</TabsTrigger>
        <TabsTrigger value="finance">財務管理</TabsTrigger>
        <TabsTrigger value="soil">土壤筆記</TabsTrigger>
        <TabsTrigger value="weather">天氣紀錄</TabsTrigger>
        <TabsTrigger value="rotation">輪作建議</TabsTrigger>
      </TabsList>
      <TabsContent value="harvest"><HarvestLogTab /></TabsContent>
      <TabsContent value="finance"><FinanceTab /></TabsContent>
      <TabsContent value="soil"><SoilNotesTab /></TabsContent>
      <TabsContent value="weather"><WeatherTab /></TabsContent>
      <TabsContent value="rotation"><RotationTab /></TabsContent>
    </Tabs>
  );
}

export default function FarmManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">農場管理</h1>
        <p className="text-muted-foreground">收成、財務、土壤、天氣與輪作管理</p>
      </div>

      <Suspense fallback={<div className="text-center py-8 text-muted-foreground">載入中...</div>}>
        <FarmManagementContent />
      </Suspense>
    </div>
  );
}
