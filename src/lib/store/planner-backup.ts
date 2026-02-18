export const PLANNER_BACKUP_SETTINGS_KEY = "hualien-planner-backup-settings";
export const PLANNER_BACKUP_SNAPSHOTS_KEY = "hualien-planner-backup-snapshots";
export const PLANNER_BACKUP_SCHEMA_VERSION = 1;

export const PLANNER_BACKUP_DATA_KEYS = [
  "hualien-planner-events",
  "hualien-show-harvested",
  "hualien-tasks",
  "hualien-custom-crops",
  "hualien-crop-templates",
  "hualien-harvest-logs",
  "hualien-finance",
  "hualien-soil-notes",
  "hualien-soil-profiles",
  "hualien-soil-amendments",
  "hualien-weather-logs",
] as const;

export type PlannerBackupSchedule = "off" | "weekly" | "monthly";
export type PlannerBackupReason = "manual" | "auto-weekly" | "auto-monthly";

export interface PlannerBackupSettings {
  schemaVersion: number;
  schedule: PlannerBackupSchedule;
  retentionCount: number;
  lastAutoBackupAt?: string;
}

export interface PlannerBackupSnapshot {
  id: string;
  schemaVersion: number;
  createdAt: string;
  reason: PlannerBackupReason;
  payloadByKey: Record<string, string | null>;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const DEFAULT_SETTINGS: PlannerBackupSettings = {
  schemaVersion: PLANNER_BACKUP_SCHEMA_VERSION,
  schedule: "off",
  retentionCount: 8,
};

function clampRetentionCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.retentionCount;
  return Math.max(1, Math.min(32, Math.round(parsed)));
}

function parseJson<T>(input: string | null): T | null {
  if (!input) return null;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function parseIsoDate(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function normalizePlannerBackupSettings(input: unknown): PlannerBackupSettings {
  if (!input || typeof input !== "object") return { ...DEFAULT_SETTINGS };
  const raw = input as Record<string, unknown>;

  const schedule: PlannerBackupSchedule =
    raw.schedule === "weekly" || raw.schedule === "monthly" || raw.schedule === "off" ? raw.schedule : "off";

  return {
    schemaVersion: PLANNER_BACKUP_SCHEMA_VERSION,
    schedule,
    retentionCount: clampRetentionCount(raw.retentionCount),
    lastAutoBackupAt: parseIsoDate(raw.lastAutoBackupAt),
  };
}

function normalizeSnapshot(input: unknown): PlannerBackupSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id : undefined;
  const createdAt = parseIsoDate(raw.createdAt);
  const reason: PlannerBackupReason =
    raw.reason === "auto-weekly" || raw.reason === "auto-monthly" || raw.reason === "manual" ? raw.reason : "manual";
  const payloadRaw = (raw.payloadByKey ?? raw.data) as unknown;

  if (!id || !createdAt || !payloadRaw || typeof payloadRaw !== "object") return null;

  const payloadByKey: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(payloadRaw as Record<string, unknown>)) {
    if (typeof value === "string" || value === null) {
      payloadByKey[key] = value;
    }
  }

  return {
    id,
    schemaVersion: PLANNER_BACKUP_SCHEMA_VERSION,
    createdAt,
    reason,
    payloadByKey,
  };
}

function buildSnapshotPayload(storage: StorageLike): Record<string, string | null> {
  const payload: Record<string, string | null> = {};
  for (const key of PLANNER_BACKUP_DATA_KEYS) {
    payload[key] = storage.getItem(key);
  }
  return payload;
}

export function readPlannerBackupSettings(storage: StorageLike): PlannerBackupSettings {
  return normalizePlannerBackupSettings(parseJson(storage.getItem(PLANNER_BACKUP_SETTINGS_KEY)));
}

export function writePlannerBackupSettings(storage: StorageLike, updates: Partial<PlannerBackupSettings>): PlannerBackupSettings {
  const current = readPlannerBackupSettings(storage);
  const next = normalizePlannerBackupSettings({ ...current, ...updates });
  storage.setItem(PLANNER_BACKUP_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function readPlannerBackupSnapshots(storage: StorageLike): PlannerBackupSnapshot[] {
  const parsed = parseJson<unknown[]>(storage.getItem(PLANNER_BACKUP_SNAPSHOTS_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => normalizeSnapshot(item))
    .filter((item): item is PlannerBackupSnapshot => item !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createPlannerBackup(
  storage: StorageLike,
  options?: { reason?: PlannerBackupReason; now?: Date; settings?: PlannerBackupSettings }
): PlannerBackupSnapshot {
  const settings = options?.settings ?? readPlannerBackupSettings(storage);
  const now = options?.now ?? new Date();
  const createdAt = now.toISOString();

  const snapshot: PlannerBackupSnapshot = {
    id: `backup-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: PLANNER_BACKUP_SCHEMA_VERSION,
    createdAt,
    reason: options?.reason ?? "manual",
    payloadByKey: buildSnapshotPayload(storage),
  };

  const snapshots = readPlannerBackupSnapshots(storage);
  const retained = [snapshot, ...snapshots]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, settings.retentionCount);
  storage.setItem(PLANNER_BACKUP_SNAPSHOTS_KEY, JSON.stringify(retained));

  if (snapshot.reason === "auto-weekly" || snapshot.reason === "auto-monthly") {
    writePlannerBackupSettings(storage, { ...settings, lastAutoBackupAt: snapshot.createdAt });
  }

  return snapshot;
}

export function restorePlannerBackup(storage: StorageLike, snapshotId: string): boolean {
  const snapshot = readPlannerBackupSnapshots(storage).find((item) => item.id === snapshotId);
  if (!snapshot) return false;

  for (const key of PLANNER_BACKUP_DATA_KEYS) {
    const value = snapshot.payloadByKey[key];
    if (typeof value === "string") {
      storage.setItem(key, value);
    } else {
      storage.removeItem(key);
    }
  }

  return true;
}

export function isPlannerBackupDue(settings: PlannerBackupSettings, now: Date): boolean {
  if (settings.schedule === "off") return false;
  if (!settings.lastAutoBackupAt) return true;

  const last = new Date(settings.lastAutoBackupAt);
  if (Number.isNaN(last.getTime())) return true;

  if (settings.schedule === "weekly") {
    const diffMs = now.getTime() - last.getTime();
    return diffMs >= 7 * 24 * 60 * 60 * 1000;
  }

  const nextMonthly = new Date(last);
  nextMonthly.setMonth(nextMonthly.getMonth() + 1);
  return now.getTime() >= nextMonthly.getTime();
}

export function runScheduledPlannerBackup(storage: StorageLike, now = new Date()): PlannerBackupSnapshot | null {
  const settings = readPlannerBackupSettings(storage);
  if (!isPlannerBackupDue(settings, now)) return null;

  const reason: PlannerBackupReason = settings.schedule === "weekly" ? "auto-weekly" : "auto-monthly";
  return createPlannerBackup(storage, { reason, now, settings });
}
