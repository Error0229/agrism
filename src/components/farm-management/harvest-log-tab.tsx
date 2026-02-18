"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFarmManagement } from "@/lib/store/farm-management-context";
import { useFields } from "@/lib/store/fields-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { formatDate } from "@/lib/utils/date-helpers";
import { summarizeOutcomeLogs } from "@/lib/utils/outcome-logs";
import { Plus, Trash2 } from "lucide-react";

export function HarvestLogTab() {
  const { harvestLogs, addHarvestLog, removeHarvestLog } = useFarmManagement();
  const { fields } = useFields();
  const allCrops = useAllCrops();

  const [fieldId, setFieldId] = useState("");
  const [cropId, setCropId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("公斤");
  const [qualityGrade, setQualityGrade] = useState<"A" | "B" | "C" | "reject">("B");
  const [pestIncidentLevel, setPestIncidentLevel] = useState<"none" | "minor" | "moderate" | "severe">("none");
  const [weatherImpact, setWeatherImpact] = useState<"none" | "heat" | "rain" | "wind" | "cold" | "mixed">("none");
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (!fieldId || !cropId || !quantity) return;
    addHarvestLog({
      fieldId,
      cropId,
      date: new Date(date).toISOString(),
      quantity: parseFloat(quantity),
      unit,
      qualityGrade,
      pestIncidentLevel,
      weatherImpact,
      notes: notes || undefined,
    });
    setQuantity("");
    setNotes("");
  };

  const sorted = [...harvestLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const summary = summarizeOutcomeLogs(harvestLogs);
  const totalByUnit: Record<string, number> = {};
  harvestLogs.forEach((l) => {
    totalByUnit[l.unit] = (totalByUnit[l.unit] || 0) + l.quantity;
  });

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger><SelectValue placeholder="田地" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger><SelectValue placeholder="作物" /></SelectTrigger>
              <SelectContent>
                {allCrops.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input type="number" placeholder="數量" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="公斤">公斤</SelectItem>
                <SelectItem value="台斤">台斤</SelectItem>
                <SelectItem value="顆">顆</SelectItem>
                <SelectItem value="把">把</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!fieldId || !cropId || !quantity}>
              <Plus className="size-4 mr-1" />新增
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Select value={qualityGrade} onValueChange={(value) => setQualityGrade(value as "A" | "B" | "C" | "reject")}>
              <SelectTrigger><SelectValue placeholder="品質等級" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">品質 A</SelectItem>
                <SelectItem value="B">品質 B</SelectItem>
                <SelectItem value="C">品質 C</SelectItem>
                <SelectItem value="reject">不良品</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={pestIncidentLevel}
              onValueChange={(value) => setPestIncidentLevel(value as "none" | "minor" | "moderate" | "severe")}
            >
              <SelectTrigger><SelectValue placeholder="病蟲害事件" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">無病蟲害</SelectItem>
                <SelectItem value="minor">輕微</SelectItem>
                <SelectItem value="moderate">中等</SelectItem>
                <SelectItem value="severe">嚴重</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={weatherImpact}
              onValueChange={(value) => setWeatherImpact(value as "none" | "heat" | "rain" | "wind" | "cold" | "mixed")}
            >
              <SelectTrigger><SelectValue placeholder="天候影響" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">無</SelectItem>
                <SelectItem value="heat">高溫</SelectItem>
                <SelectItem value="rain">降雨</SelectItem>
                <SelectItem value="wind">強風</SelectItem>
                <SelectItem value="cold">低溫</SelectItem>
                <SelectItem value="mixed">複合</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input className="mt-2" placeholder="備註（選填）" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardContent>
      </Card>

      {Object.keys(totalByUnit).length > 0 && (
        <div className="grid gap-2 md:grid-cols-3 text-sm">
          <div className="rounded border p-2">
            <p className="font-medium">總量</p>
            <p className="text-muted-foreground">{Object.entries(totalByUnit).map(([u, total]) => `${total} ${u}`).join(" ・ ")}</p>
          </div>
          <div className="rounded border p-2">
            <p className="font-medium">品質分佈</p>
            <p className="text-muted-foreground">A {summary.qualityCounts.A} / B {summary.qualityCounts.B} / C {summary.qualityCounts.C} / 不良 {summary.qualityCounts.reject}</p>
          </div>
          <div className="rounded border p-2">
            <p className="font-medium">病蟲與天候</p>
            <p className="text-muted-foreground">
              病蟲：輕微 {summary.pestCounts.minor} / 中等 {summary.pestCounts.moderate} / 嚴重 {summary.pestCounts.severe}
            </p>
            <p className="text-muted-foreground">
              天候：雨 {summary.weatherImpactCounts.rain} / 熱 {summary.weatherImpactCounts.heat} / 風 {summary.weatherImpactCounts.wind}
            </p>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>田地</TableHead>
              <TableHead>作物</TableHead>
              <TableHead>數量</TableHead>
              <TableHead>品質</TableHead>
              <TableHead>病蟲害</TableHead>
              <TableHead>天候影響</TableHead>
              <TableHead>備註</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((log) => {
              const crop = allCrops.find((c) => c.id === log.cropId);
              const field = fields.find((f) => f.id === log.fieldId);
              return (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{formatDate(log.date)}</TableCell>
                  <TableCell className="text-sm">{field?.name || "-"}</TableCell>
                  <TableCell className="text-sm">{crop?.emoji} {crop?.name || log.cropId}</TableCell>
                  <TableCell className="text-sm">{log.quantity} {log.unit}</TableCell>
                  <TableCell className="text-sm">{log.qualityGrade || "-"}</TableCell>
                  <TableCell className="text-sm">{log.pestIncidentLevel || "-"}</TableCell>
                  <TableCell className="text-sm">{log.weatherImpact || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.notes || "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeHarvestLog(log.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {sorted.length === 0 && (
        <p className="text-center text-muted-foreground py-8">尚無收成紀錄</p>
      )}
    </div>
  );
}
