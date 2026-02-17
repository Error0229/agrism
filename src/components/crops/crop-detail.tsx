"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Crop } from "@/lib/types";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { generateTasksForPlantedCrop } from "@/lib/utils/calendar-helpers";
import { getMonthName } from "@/lib/utils/date-helpers";
import { parsePestEntry, getPestImageSearchUrl } from "@/lib/utils/pest-helpers";
import { Droplets, Sun, Thermometer, Ruler, Bug, Wind, Plus, Beaker, BarChart3 } from "lucide-react";

export function CropDetail({ crop }: { crop: Crop }) {
  const { fields, addPlantedCrop } = useFields();
  const { addTasks } = useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [plantDate, setPlantDate] = useState(new Date().toISOString().split("T")[0]);
  const [customGrowthDays, setCustomGrowthDays] = useState("");
  const [showCustomTiming, setShowCustomTiming] = useState(false);

  const handleAddToField = () => {
    if (!selectedFieldId) return;
    const plantedCrop = addPlantedCrop(selectedFieldId, {
      cropId: crop.id,
      fieldId: selectedFieldId,
      plantedDate: new Date(plantDate).toISOString(),
      status: "growing",
      position: { x: 50, y: 50 },
      size: { width: crop.spacing.plant, height: crop.spacing.row },
      customGrowthDays: customGrowthDays ? parseInt(customGrowthDays) : undefined,
    });
    const tasks = generateTasksForPlantedCrop(crop, plantedCrop);
    addTasks(tasks);
    setDialogOpen(false);
    setCustomGrowthDays("");
    setShowCustomTiming(false);
  };

  const typhoonBadge = {
    低: "bg-red-100 text-red-700",
    中: "bg-amber-100 text-amber-700",
    高: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-6">
      {/* 標題區域 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{crop.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold">{crop.name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge>{crop.category}</Badge>
              <Badge className={typhoonBadge[crop.typhoonResistance]}>
                颱風耐受：{crop.typhoonResistance}
              </Badge>
            </div>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" />
              加入田地
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>種植 {crop.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">請先前往「田地規劃」建立田地。</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">選擇田地</label>
                    <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇田地" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.dimensions.width}x{f.dimensions.height}m)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">種植日期</label>
                    <Input type="date" value={plantDate} onChange={(e) => setPlantDate(e.target.value)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomTiming(!showCustomTiming)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showCustomTiming ? "隱藏自訂時程" : "自訂時程（進階）"}
                  </button>
                  {showCustomTiming && (
                    <div className="space-y-2 rounded-lg border p-3">
                      <label className="text-sm font-medium">自訂生長天數（預設 {crop.growthDays} 天）</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder={String(crop.growthDays)}
                        value={customGrowthDays}
                        onChange={(e) => setCustomGrowthDays(e.target.value)}
                      />
                    </div>
                  )}
                  <Button onClick={handleAddToField} disabled={!selectedFieldId} className="w-full">
                    確認種植並自動排程
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 播種/收成月份 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">適合月份</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const isPlanting = crop.plantingMonths.includes(month);
              const isHarvest = crop.harvestMonths.includes(month);
              return (
                <div key={month} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{month}月</div>
                  <div
                    className={`h-6 rounded text-xs flex items-center justify-center font-medium ${
                      isPlanting && isHarvest
                        ? "bg-gradient-to-b from-green-400 to-amber-400 text-white"
                        : isPlanting
                        ? "bg-green-500 text-white"
                        : isHarvest
                        ? "bg-amber-500 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {isPlanting && isHarvest ? "播/收" : isPlanting ? "播" : isHarvest ? "收" : ""}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="size-3 rounded bg-green-500" /> 播種期
            </div>
            <div className="flex items-center gap-1">
              <div className="size-3 rounded bg-amber-500" /> 收成期
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 種植資訊格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Ruler className="size-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">間距</p>
            <p className="text-xs text-muted-foreground">株距 {crop.spacing.plant}cm</p>
            <p className="text-xs text-muted-foreground">行距 {crop.spacing.row}cm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Droplets className="size-5 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium">水分需求</p>
            <p className="text-xs text-muted-foreground">{crop.water}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Sun className="size-5 mx-auto mb-2 text-amber-500" />
            <p className="text-sm font-medium">日照需求</p>
            <p className="text-xs text-muted-foreground">{crop.sunlight}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Thermometer className="size-5 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium">適溫範圍</p>
            <p className="text-xs text-muted-foreground">{crop.temperatureRange.min}°C ~ {crop.temperatureRange.max}°C</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Beaker className="size-5 mx-auto mb-2 text-violet-500" />
            <p className="text-sm font-medium">土壤 pH</p>
            <p className="text-xs text-muted-foreground">{crop.soilPhRange.min} - {crop.soilPhRange.max}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="size-5 mx-auto mb-2 text-emerald-600" />
            <p className="text-sm font-medium">預估產量</p>
            <p className="text-xs text-muted-foreground">{crop.yieldEstimateKgPerSqm} kg/m²</p>
          </CardContent>
        </Card>
      </div>

      {/* 病蟲害防治 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="size-4" />
            病蟲害防治
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {crop.pestControl.map((pest, idx) => {
              const { name, method } = parsePestEntry(pest);
              return (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>
                    <a
                      href={getPestImageSearchUrl(name, crop.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 font-medium"
                    >
                      {name}
                    </a>
                    {method && `：${method}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* 花蓮注意事項 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wind className="size-4" />
            花蓮種植注意事項
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{crop.hualienNotes}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-medium">颱風耐受度：</span>
            <Badge className={typhoonBadge[crop.typhoonResistance]}>{crop.typhoonResistance}</Badge>
          </div>
          <div className="mt-2">
            <span className="text-sm font-medium">施肥間隔：</span>
            <span className="text-sm text-muted-foreground">每 {crop.fertilizerIntervalDays} 天</span>
          </div>
          <div className="mt-1">
            <span className="text-sm font-medium">生長天數：</span>
            <span className="text-sm text-muted-foreground">{crop.growthDays} 天</span>
          </div>
          <div className="mt-1">
            <span className="text-sm font-medium">病蟲害敏感度：</span>
            <span className="text-sm text-muted-foreground">{crop.pestSusceptibility}</span>
          </div>
          {crop.needsPruning && crop.pruningMonths && (
            <div className="mt-1">
              <span className="text-sm font-medium">剪枝月份：</span>
              <span className="text-sm text-muted-foreground">
                {crop.pruningMonths.map((m) => getMonthName(m)).join("、")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
