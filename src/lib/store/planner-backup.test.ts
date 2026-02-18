import { describe, expect, it } from "vitest";
import {
  PLANNER_BACKUP_DATA_KEYS,
  PLANNER_BACKUP_SETTINGS_KEY,
  PLANNER_BACKUP_SNAPSHOTS_KEY,
  createPlannerBackup,
  isPlannerBackupDue,
  normalizePlannerBackupSettings,
  readPlannerBackupSettings,
  readPlannerBackupSnapshots,
  restorePlannerBackup,
  runScheduledPlannerBackup,
  writePlannerBackupSettings,
  type PlannerBackupSettings,
  type StorageLike,
} from "@/lib/store/planner-backup";

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();

  getItem(key: string) {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.map.set(key, value);
  }

  removeItem(key: string) {
    this.map.delete(key);
  }
}

describe("planner backup settings", () => {
  it("normalizes invalid settings with defaults", () => {
    const normalized = normalizePlannerBackupSettings({ schedule: "invalid", retentionCount: -5 });
    expect(normalized.schedule).toBe("off");
    expect(normalized.retentionCount).toBe(1);
  });

  it("writes and reads settings with schema migration", () => {
    const storage = new MemoryStorage();
    writePlannerBackupSettings(storage, { schedule: "weekly", retentionCount: 12, lastAutoBackupAt: "2026-02-01" });
    const settings = readPlannerBackupSettings(storage);
    expect(settings.schedule).toBe("weekly");
    expect(settings.retentionCount).toBe(12);
    expect(settings.lastAutoBackupAt).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("planner backup snapshots", () => {
  it("keeps retention count when creating snapshots", () => {
    const storage = new MemoryStorage();
    writePlannerBackupSettings(storage, { schedule: "off", retentionCount: 2 });
    storage.setItem("hualien-planner-events", JSON.stringify([{ id: "evt-1" }]));

    createPlannerBackup(storage, { now: new Date("2026-02-01T00:00:00.000Z") });
    createPlannerBackup(storage, { now: new Date("2026-02-02T00:00:00.000Z") });
    createPlannerBackup(storage, { now: new Date("2026-02-03T00:00:00.000Z") });

    const snapshots = readPlannerBackupSnapshots(storage);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].createdAt).toBe("2026-02-03T00:00:00.000Z");
  });

  it("restores tracked localStorage keys from selected snapshot", () => {
    const storage = new MemoryStorage();
    storage.setItem("hualien-planner-events", JSON.stringify([{ id: "before" }]));
    const snapshot = createPlannerBackup(storage, { now: new Date("2026-02-04T00:00:00.000Z") });

    storage.setItem("hualien-planner-events", JSON.stringify([{ id: "after" }]));
    storage.setItem("hualien-tasks", JSON.stringify([{ id: "task-1" }]));

    const restored = restorePlannerBackup(storage, snapshot.id);
    expect(restored).toBe(true);
    expect(storage.getItem("hualien-planner-events")).toBe(JSON.stringify([{ id: "before" }]));
    expect(storage.getItem("hualien-tasks")).toBe(null);
  });

  it("reads legacy snapshot payload shape for compatibility", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PLANNER_BACKUP_SNAPSHOTS_KEY,
      JSON.stringify([
        {
          id: "legacy-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          data: {
            "hualien-planner-events": "[]",
          },
        },
      ])
    );

    const snapshots = readPlannerBackupSnapshots(storage);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].payloadByKey["hualien-planner-events"]).toBe("[]");
  });
});

describe("planner backup schedule", () => {
  const weeklySettings: PlannerBackupSettings = {
    schemaVersion: 1,
    schedule: "weekly",
    retentionCount: 8,
    lastAutoBackupAt: "2026-02-01T00:00:00.000Z",
  };

  it("marks weekly schedule due only after 7 days", () => {
    expect(isPlannerBackupDue(weeklySettings, new Date("2026-02-06T23:59:59.000Z"))).toBe(false);
    expect(isPlannerBackupDue(weeklySettings, new Date("2026-02-08T00:00:00.000Z"))).toBe(true);
  });

  it("runs scheduled backup and updates last auto timestamp", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PLANNER_BACKUP_SETTINGS_KEY,
      JSON.stringify({
        schedule: "monthly",
        retentionCount: 8,
        lastAutoBackupAt: "2026-01-01T00:00:00.000Z",
      })
    );
    storage.setItem("hualien-planner-events", "[]");

    const snapshot = runScheduledPlannerBackup(storage, new Date("2026-02-02T00:00:00.000Z"));
    expect(snapshot?.reason).toBe("auto-monthly");

    const updatedSettings = readPlannerBackupSettings(storage);
    expect(updatedSettings.lastAutoBackupAt).toBe("2026-02-02T00:00:00.000Z");
  });

  it("captures all tracked keys in payload", () => {
    const storage = new MemoryStorage();
    PLANNER_BACKUP_DATA_KEYS.forEach((key, index) => {
      storage.setItem(key, JSON.stringify({ index }));
    });

    const snapshot = createPlannerBackup(storage, { now: new Date("2026-02-10T00:00:00.000Z") });
    expect(Object.keys(snapshot.payloadByKey).sort()).toEqual([...PLANNER_BACKUP_DATA_KEYS].sort());
  });
});
