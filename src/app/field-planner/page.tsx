"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { useFields } from "@/lib/store/fields-context";
import { FieldToolbar } from "@/components/field-planner/field-toolbar";
import { FieldSettingsDialog } from "@/components/field-planner/field-settings-dialog";
import { Button } from "@/components/ui/button";
import { evaluateFieldPlanningRules } from "@/lib/utils/rotation-companion-checker";
import { Trash2, Move, MousePointer } from "lucide-react";

const FieldCanvas = dynamic(
  () => import("@/components/field-planner/field-canvas"),
  { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center text-muted-foreground border rounded-lg">載入畫布中...</div> }
);

export default function FieldPlannerPage() {
  const { fields, isLoaded, removeField } = useFields();
  const allCrops = useAllCrops();
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [resizeMode, setResizeMode] = useState(false);

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">載入中...</div>;
  }

  // Set active tab to first field if not set
  const currentTab = activeTab || fields[0]?.id || "";

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
                    />
                    <Button
                      size="sm"
                      variant={resizeMode ? "default" : "outline"}
                      onClick={() => setResizeMode(!resizeMode)}
                    >
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
                    <span className="text-sm text-muted-foreground">
                      {field.dimensions.width} x {field.dimensions.height} 公尺 &middot;{" "}
                      {field.plantedCrops.filter((c) => c.status === "growing").length} 種作物
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FieldSettingsDialog editField={field} />
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
                </div>
                <FieldCanvas
                  field={field}
                  selectedCropId={selectedCropId}
                  onSelectCrop={setSelectedCropId}
                  resizeMode={resizeMode}
                />
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
