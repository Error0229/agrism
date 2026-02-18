"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createPlannerBackup,
  normalizePlannerBackupSettings,
  readPlannerBackupSettings,
  readPlannerBackupSnapshots,
  restorePlannerBackup,
  writePlannerBackupSettings,
  type PlannerBackupSchedule,
  type PlannerBackupSettings,
  type PlannerBackupSnapshot,
} from "@/lib/store/planner-backup";

function formatTimestamp(value?: string) {
  if (!value) return "尚未執行";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未執行";
  return format(date, "yyyy/MM/dd HH:mm");
}

export function BackupSettingsPanel() {
  const [settings, setSettings] = useState<PlannerBackupSettings>(() => {
    if (typeof window === "undefined") return normalizePlannerBackupSettings(null);
    return readPlannerBackupSettings(window.localStorage);
  });
  const [snapshots, setSnapshots] = useState<PlannerBackupSnapshot[]>(() => {
    if (typeof window === "undefined") return [];
    return readPlannerBackupSnapshots(window.localStorage);
  });
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const nextSettings = readPlannerBackupSettings(window.localStorage);
    const nextSnapshots = readPlannerBackupSnapshots(window.localStorage);
    setSettings(nextSettings);
    setSnapshots(nextSnapshots);
  }, []);

  const updateSchedule = (schedule: PlannerBackupSchedule) => {
    const next = writePlannerBackupSettings(window.localStorage, { schedule });
    setSettings(next);
    setStatus("已更新自動備份頻率。");
  };

  const updateRetention = (input: string) => {
    const retentionCount = Number(input);
    if (!Number.isFinite(retentionCount)) return;
    const next = writePlannerBackupSettings(window.localStorage, { retentionCount });
    setSettings(next);
    setStatus("已更新備份保留份數。");
    refresh();
  };

  const handleManualBackup = () => {
    const snapshot = createPlannerBackup(window.localStorage, { reason: "manual" });
    setStatus(`已建立備份：${formatTimestamp(snapshot.createdAt)}`);
    refresh();
  };

  const handleRestore = (snapshotId: string) => {
    const confirmed = window.confirm("還原後將以備份內容覆蓋目前資料，確定繼續？");
    if (!confirmed) return;
    const restored = restorePlannerBackup(window.localStorage, snapshotId);
    if (!restored) {
      setStatus("找不到指定備份，請重新整理後再試。");
      return;
    }
    setStatus("已還原備份，正在重新載入資料。");
    window.setTimeout(() => window.location.reload(), 300);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">庭園規劃備份設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">自動備份頻率</p>
            <Select value={settings.schedule} onValueChange={(value) => updateSchedule(value as PlannerBackupSchedule)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">關閉</SelectItem>
                <SelectItem value="weekly">每週</SelectItem>
                <SelectItem value="monthly">每月</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">保留備份份數（1-32）</p>
            <Input
              type="number"
              min={1}
              max={32}
              value={settings.retentionCount}
              onChange={(event) => updateRetention(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleManualBackup}>
            立即備份
          </Button>
          <span className="text-xs text-muted-foreground">最近自動備份：{formatTimestamp(settings.lastAutoBackupAt)}</span>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">備份清單（最新在前）</p>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚無備份。</p>
          ) : (
            <div className="space-y-2">
              {snapshots.slice(0, 8).map((snapshot) => (
                <div key={snapshot.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm">{formatTimestamp(snapshot.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">來源：{snapshot.reason}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleRestore(snapshot.id)}>
                    還原
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {status && <p className="text-xs text-muted-foreground">{status}</p>}
      </CardContent>
    </Card>
  );
}
