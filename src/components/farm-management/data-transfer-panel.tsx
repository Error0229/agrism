"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { useCustomCrops } from "@/lib/store/custom-crops-context";
import { useFarmManagement } from "@/lib/store/farm-management-context";
import {
  applyFarmDataImport,
  buildFarmDataPackage,
  exportFinanceCsv,
  exportHarvestCsv,
  exportTasksCsv,
  parseFarmDataPackage,
  type FarmImportMode,
} from "@/lib/utils/farm-data-transfer";

const STORAGE_KEYS = {
  plannerEvents: "hualien-planner-events",
  tasks: "hualien-tasks",
  customCrops: "hualien-custom-crops",
  cropTemplates: "hualien-crop-templates",
  harvestLogs: "hualien-harvest-logs",
  financeRecords: "hualien-finance",
  soilNotes: "hualien-soil-notes",
  soilProfiles: "hualien-soil-profiles",
  soilAmendments: "hualien-soil-amendments",
  weatherLogs: "hualien-weather-logs",
} as const;

function downloadText(filename: string, content: string, mimeType = "application/json") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DataTransferPanel() {
  const { plannerEvents } = useFields();
  const { tasks } = useTasks();
  const { customCrops, cropTemplates } = useCustomCrops();
  const { harvestLogs, financeRecords, soilNotes, soilProfiles, soilAmendments, weatherLogs } = useFarmManagement();
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<FarmImportMode>("merge");
  const [status, setStatus] = useState<string | null>(null);

  const snapshot = useMemo(
    () => ({
      plannerEvents,
      tasks,
      customCrops,
      cropTemplates,
      harvestLogs,
      financeRecords,
      soilNotes,
      soilProfiles,
      soilAmendments,
      weatherLogs,
    }),
    [
      plannerEvents,
      tasks,
      customCrops,
      cropTemplates,
      harvestLogs,
      financeRecords,
      soilNotes,
      soilProfiles,
      soilAmendments,
      weatherLogs,
    ]
  );

  const handleExportJson = () => {
    const payload = buildFarmDataPackage(snapshot);
    downloadText(
      `farm-data-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    setStatus("已匯出完整 JSON。");
  };

  const handleImport = () => {
    try {
      if (importMode === "replace") {
        const confirmed = window.confirm("Replace 會覆蓋匯入中包含的資料集，確定要繼續嗎？");
        if (!confirmed) return;
      }

      const parsed = parseFarmDataPackage(importText);
      const next = applyFarmDataImport(snapshot, parsed.snapshot, importMode);

      window.localStorage.setItem(STORAGE_KEYS.plannerEvents, JSON.stringify(next.plannerEvents));
      window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(next.tasks));
      window.localStorage.setItem(STORAGE_KEYS.customCrops, JSON.stringify(next.customCrops));
      window.localStorage.setItem(STORAGE_KEYS.cropTemplates, JSON.stringify(next.cropTemplates));
      window.localStorage.setItem(STORAGE_KEYS.harvestLogs, JSON.stringify(next.harvestLogs));
      window.localStorage.setItem(STORAGE_KEYS.financeRecords, JSON.stringify(next.financeRecords));
      window.localStorage.setItem(STORAGE_KEYS.soilNotes, JSON.stringify(next.soilNotes));
      window.localStorage.setItem(STORAGE_KEYS.soilProfiles, JSON.stringify(next.soilProfiles));
      window.localStorage.setItem(STORAGE_KEYS.soilAmendments, JSON.stringify(next.soilAmendments));
      window.localStorage.setItem(STORAGE_KEYS.weatherLogs, JSON.stringify(next.weatherLogs));

      const warningText = parsed.warnings.length > 0 ? `（警告：${parsed.warnings.join("；")}）` : "";
      setStatus(`匯入成功，正在重新整理資料 ${warningText}`);
      window.setTimeout(() => window.location.reload(), 400);
    } catch {
      setStatus("匯入失敗：JSON 格式或資料內容不正確。");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">資料匯入匯出</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleExportJson}>
            匯出完整 JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadText("tasks.csv", exportTasksCsv(tasks), "text/csv")}>
            匯出 Tasks CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadText("harvest-logs.csv", exportHarvestCsv(harvestLogs), "text/csv")}
          >
            匯出 Harvest CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadText("finance-records.csv", exportFinanceCsv(financeRecords), "text/csv")}
          >
            匯出 Finance CSV
          </Button>
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium">匯入 JSON</p>
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              Merge（保留既有資料）
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              Replace（覆蓋匯入資料集）
            </label>
          </div>
          <Textarea
            rows={8}
            placeholder='貼上 farm-data JSON（支援舊版含 "fields" 的匯出）'
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
          <Button size="sm" onClick={handleImport} disabled={!importText.trim()}>
            套用匯入
          </Button>
          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
