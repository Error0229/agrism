"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useFields } from "@/lib/store/fields-context";
import { FieldToolbar } from "@/components/field-planner/field-toolbar";
import { FieldSettingsDialog } from "@/components/field-planner/field-settings-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const FieldCanvas = dynamic(
  () => import("@/components/field-planner/field-canvas"),
  { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center text-muted-foreground border rounded-lg">載入畫布中...</div> }
);

export default function FieldPlannerPage() {
  const { fields, isLoaded, removeField } = useFields();
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">載入中...</div>;
  }

  // Set active tab to first field if not set
  const currentTab = activeTab || fields[0]?.id || "";

  const activeField = fields.find((f) => f.id === currentTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">田地規劃</h1>
          <p className="text-muted-foreground">在 2D 平面上規劃您的田地配置</p>
        </div>
        <FieldSettingsDialog />
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">尚未建立任何田地</p>
            <FieldSettingsDialog />
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={currentTab} onValueChange={(v) => { setActiveTab(v); setSelectedCropId(null); }}>
            <div className="flex items-center gap-2 overflow-x-auto">
              <TabsList>
                {fields.map((field) => (
                  <TabsTrigger key={field.id} value={field.id}>
                    {field.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {fields.map((field) => (
              <TabsContent key={field.id} value={field.id} className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FieldToolbar
                      field={field}
                      selectedCropId={selectedCropId}
                      onSelectCrop={setSelectedCropId}
                    />
                    <span className="text-sm text-muted-foreground">
                      {field.dimensions.width} x {field.dimensions.height} 公尺 &middot;{" "}
                      {field.plantedCrops.filter((c) => c.status === "growing").length} 種作物
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      removeField(field.id);
                      setActiveTab("");
                      setSelectedCropId(null);
                    }}
                  >
                    <Trash2 className="size-4 mr-1" />
                    刪除田地
                  </Button>
                </div>
                <FieldCanvas
                  field={field}
                  selectedCropId={selectedCropId}
                  onSelectCrop={setSelectedCropId}
                />
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
