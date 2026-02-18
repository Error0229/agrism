import type {
  CropTemplate,
  CustomCrop,
  FinanceRecord,
  HarvestLog,
  SoilAmendment,
  SoilNote,
  SoilProfile,
  Task,
  WeatherLog,
} from "@/lib/types";
import { normalizeCustomCrop } from "@/lib/data/crop-schema";
import { normalizeTaskEffort } from "@/lib/utils/task-effort";
import { normalizeSoilAmendment, normalizeSoilProfile } from "@/lib/utils/soil-profile";
import { normalizeHarvestLog } from "@/lib/utils/outcome-logs";
import {
  bootstrapEventsFromFields,
  type PlannerEvent,
  type PlannerEventType,
} from "@/lib/planner/events";
import { normalizeField, type LegacyField } from "@/lib/utils/field-context";

export type FarmImportMode = "merge" | "replace";

export interface FarmDataSnapshot {
  plannerEvents: PlannerEvent[];
  tasks: Task[];
  customCrops: CustomCrop[];
  cropTemplates: CropTemplate[];
  harvestLogs: HarvestLog[];
  financeRecords: FinanceRecord[];
  soilNotes: SoilNote[];
  soilProfiles: SoilProfile[];
  soilAmendments: SoilAmendment[];
  weatherLogs: WeatherLog[];
}

export interface FarmDataPackage {
  version: 1;
  exportedAt: string;
  data: Partial<FarmDataSnapshot> & { fields?: LegacyField[] };
}

export interface ParsedFarmData {
  snapshot: Partial<FarmDataSnapshot>;
  warnings: string[];
}

const PLANNER_EVENT_TYPES = new Set<PlannerEventType>([
  "field_created",
  "field_updated",
  "field_removed",
  "crop_planted",
  "crop_updated",
  "crop_removed",
  "crop_harvested",
]);

function asIsoDate(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value !== "string") return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function normalizePlannerEvents(value: unknown): PlannerEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((event) => typeof event.id === "string" && PLANNER_EVENT_TYPES.has(event.type as PlannerEventType))
    .map((event) => ({
      id: String(event.id),
      type: event.type as PlannerEventType,
      occurredAt: asIsoDate(event.occurredAt),
      insertedAt: typeof event.insertedAt === "string" ? asIsoDate(event.insertedAt) : undefined,
      fieldId: typeof event.fieldId === "string" ? event.fieldId : undefined,
      cropId: typeof event.cropId === "string" ? event.cropId : undefined,
      payload: event.payload ?? {},
    }));
}

function normalizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((task) => typeof task.id === "string" && typeof task.title === "string" && typeof task.type === "string")
    .map((task) =>
      normalizeTaskEffort({
        id: String(task.id),
        type: task.type as Task["type"],
        title: String(task.title),
        cropId: String(task.cropId ?? ""),
        plantedCropId: typeof task.plantedCropId === "string" ? task.plantedCropId : undefined,
        fieldId: typeof task.fieldId === "string" ? task.fieldId : undefined,
        dueDate: asIsoDate(task.dueDate),
        completed: Boolean(task.completed),
        effortMinutes: typeof task.effortMinutes === "number" ? task.effortMinutes : undefined,
        difficulty:
          task.difficulty === "low" || task.difficulty === "medium" || task.difficulty === "high"
            ? task.difficulty
            : undefined,
        requiredTools: toStringArray(task.requiredTools),
        recurring:
          task.recurring && typeof task.recurring === "object"
            ? {
                intervalDays: Number((task.recurring as Record<string, unknown>).intervalDays ?? 0) || 0,
                endDate:
                  typeof (task.recurring as Record<string, unknown>).endDate === "string"
                    ? asIsoDate((task.recurring as Record<string, unknown>).endDate)
                    : undefined,
              }
            : undefined,
      })
    );
}

function normalizeCustomCrops(value: unknown): CustomCrop[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((crop) => typeof crop.id === "string" && typeof crop.name === "string" && typeof crop.category === "string")
    .map((crop) => normalizeCustomCrop(crop as Partial<CustomCrop> & { id: string; name: string; category: CustomCrop["category"] }));
}

function normalizeTemplates(value: unknown): CropTemplate[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((template) => typeof template.id === "string" && typeof template.name === "string")
    .map((template) => ({
      id: String(template.id),
      name: String(template.name),
      createdAt: asIsoDate(template.createdAt),
      crops: normalizeCustomCrops(template.crops),
    }));
}

function normalizeHarvestLogs(value: unknown): HarvestLog[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((log) => typeof log.id === "string" && typeof log.fieldId === "string" && typeof log.cropId === "string")
    .map((log) => ({
      id: String(log.id),
      plantedCropId: typeof log.plantedCropId === "string" ? log.plantedCropId : undefined,
      fieldId: String(log.fieldId),
      cropId: String(log.cropId),
      date: asIsoDate(log.date),
      quantity: Number(log.quantity ?? 0) || 0,
      unit: String(log.unit ?? "kg"),
      qualityGrade: typeof log.qualityGrade === "string" ? (log.qualityGrade as HarvestLog["qualityGrade"]) : undefined,
      pestIncidentLevel:
        typeof log.pestIncidentLevel === "string" ? (log.pestIncidentLevel as HarvestLog["pestIncidentLevel"]) : undefined,
      weatherImpact: typeof log.weatherImpact === "string" ? (log.weatherImpact as HarvestLog["weatherImpact"]) : undefined,
      notes: typeof log.notes === "string" ? log.notes : undefined,
    }))
    .map((log) => normalizeHarvestLog(log));
}

function normalizeFinanceRecords(value: unknown): FinanceRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((record) => typeof record.id === "string" && typeof record.type === "string")
    .map((record) => ({
      id: String(record.id),
      type: record.type === "income" ? "income" : "expense",
      category: String(record.category ?? "其他"),
      amount: Number(record.amount ?? 0) || 0,
      date: asIsoDate(record.date),
      description: String(record.description ?? ""),
      relatedFieldId: typeof record.relatedFieldId === "string" ? record.relatedFieldId : undefined,
      relatedCropId: typeof record.relatedCropId === "string" ? record.relatedCropId : undefined,
    }));
}

function normalizeSoilNotes(value: unknown): SoilNote[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((note) => typeof note.id === "string" && typeof note.fieldId === "string")
    .map((note) => ({
      id: String(note.id),
      fieldId: String(note.fieldId),
      date: asIsoDate(note.date),
      ph: typeof note.ph === "number" ? note.ph : undefined,
      content: String(note.content ?? ""),
    }));
}

function normalizeSoilProfiles(value: unknown): SoilProfile[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((profile) => typeof profile.fieldId === "string")
    .map((profile) => normalizeSoilProfile(profile as Partial<SoilProfile> & { fieldId: string }));
}

function normalizeSoilAmendments(value: unknown): SoilAmendment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((amendment) => typeof amendment.id === "string" && typeof amendment.fieldId === "string")
    .map((amendment) =>
      normalizeSoilAmendment(amendment as Partial<SoilAmendment> & { id: string; fieldId: string })
    );
}

function normalizeWeatherLogs(value: unknown): WeatherLog[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item as Record<string, unknown>)
    .filter((log) => typeof log.id === "string")
    .map((log) => ({
      id: String(log.id),
      date: asIsoDate(log.date),
      temperature: typeof log.temperature === "number" ? log.temperature : undefined,
      rainfall: typeof log.rainfall === "number" ? log.rainfall : undefined,
      condition: typeof log.condition === "string" ? log.condition : undefined,
      notes: typeof log.notes === "string" ? log.notes : undefined,
    }));
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[], mode: FarmImportMode): T[] {
  if (mode === "replace") return incoming;
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values());
}

function mergeByFieldId<T extends { fieldId: string }>(current: T[], incoming: T[], mode: FarmImportMode): T[] {
  if (mode === "replace") return incoming;
  const byField = new Map(current.map((item) => [item.fieldId, item]));
  for (const item of incoming) byField.set(item.fieldId, item);
  return Array.from(byField.values());
}

export function buildFarmDataPackage(snapshot: FarmDataSnapshot): FarmDataPackage {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: snapshot,
  };
}

export function parseFarmDataPackage(jsonText: string): ParsedFarmData {
  const raw = JSON.parse(jsonText) as Partial<FarmDataPackage> & { data?: Record<string, unknown> };
  const data = raw.data ?? {};
  const warnings: string[] = [];
  const snapshot: Partial<FarmDataSnapshot> = {};

  const plannerEvents = normalizePlannerEvents(data.plannerEvents);
  if (plannerEvents.length > 0) {
    snapshot.plannerEvents = plannerEvents;
  } else if (Array.isArray(data.fields)) {
    snapshot.plannerEvents = bootstrapEventsFromFields(data.fields.map((field) => normalizeField(field as LegacyField)));
    warnings.push("使用相容模式：由 legacy fields 轉換為 plannerEvents。");
  }

  if ("tasks" in data) snapshot.tasks = normalizeTasks(data.tasks);
  if ("customCrops" in data) snapshot.customCrops = normalizeCustomCrops(data.customCrops);
  if ("cropTemplates" in data) snapshot.cropTemplates = normalizeTemplates(data.cropTemplates);
  if ("harvestLogs" in data) snapshot.harvestLogs = normalizeHarvestLogs(data.harvestLogs);
  if ("financeRecords" in data) snapshot.financeRecords = normalizeFinanceRecords(data.financeRecords);
  if ("soilNotes" in data) snapshot.soilNotes = normalizeSoilNotes(data.soilNotes);
  if ("soilProfiles" in data) snapshot.soilProfiles = normalizeSoilProfiles(data.soilProfiles);
  if ("soilAmendments" in data) snapshot.soilAmendments = normalizeSoilAmendments(data.soilAmendments);
  if ("weatherLogs" in data) snapshot.weatherLogs = normalizeWeatherLogs(data.weatherLogs);

  return { snapshot, warnings };
}

export function applyFarmDataImport(
  current: FarmDataSnapshot,
  incoming: Partial<FarmDataSnapshot>,
  mode: FarmImportMode
): FarmDataSnapshot {
  return {
    plannerEvents: incoming.plannerEvents ? mergeById(current.plannerEvents, incoming.plannerEvents, mode) : current.plannerEvents,
    tasks: incoming.tasks ? mergeById(current.tasks, incoming.tasks, mode) : current.tasks,
    customCrops: incoming.customCrops ? mergeById(current.customCrops, incoming.customCrops, mode) : current.customCrops,
    cropTemplates: incoming.cropTemplates ? mergeById(current.cropTemplates, incoming.cropTemplates, mode) : current.cropTemplates,
    harvestLogs: incoming.harvestLogs ? mergeById(current.harvestLogs, incoming.harvestLogs, mode) : current.harvestLogs,
    financeRecords: incoming.financeRecords
      ? mergeById(current.financeRecords, incoming.financeRecords, mode)
      : current.financeRecords,
    soilNotes: incoming.soilNotes ? mergeById(current.soilNotes, incoming.soilNotes, mode) : current.soilNotes,
    soilProfiles: incoming.soilProfiles
      ? mergeByFieldId(current.soilProfiles, incoming.soilProfiles, mode)
      : current.soilProfiles,
    soilAmendments: incoming.soilAmendments
      ? mergeById(current.soilAmendments, incoming.soilAmendments, mode)
      : current.soilAmendments,
    weatherLogs: incoming.weatherLogs ? mergeById(current.weatherLogs, incoming.weatherLogs, mode) : current.weatherLogs,
  };
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers.join(","), ...rows.map((row) => row.map((value) => escapeCsv(value)).join(","))].join("\n");
}

export function exportTasksCsv(tasks: Task[]): string {
  return toCsv(
    ["id", "type", "title", "cropId", "dueDate", "completed", "effortMinutes", "difficulty", "requiredTools"],
    tasks.map((task) => [
      task.id,
      task.type,
      task.title,
      task.cropId,
      task.dueDate,
      String(task.completed),
      String(task.effortMinutes ?? ""),
      String(task.difficulty ?? ""),
      (task.requiredTools ?? []).join("|"),
    ])
  );
}

export function exportHarvestCsv(harvestLogs: HarvestLog[]): string {
  return toCsv(
    ["id", "fieldId", "cropId", "date", "quantity", "unit", "qualityGrade", "pestIncidentLevel", "weatherImpact", "notes"],
    harvestLogs.map((log) => [
      log.id,
      log.fieldId,
      log.cropId,
      log.date,
      String(log.quantity),
      log.unit,
      String(log.qualityGrade ?? ""),
      String(log.pestIncidentLevel ?? ""),
      String(log.weatherImpact ?? ""),
      log.notes ?? "",
    ])
  );
}

export function exportFinanceCsv(financeRecords: FinanceRecord[]): string {
  return toCsv(
    ["id", "type", "category", "amount", "date", "description", "relatedFieldId", "relatedCropId"],
    financeRecords.map((record) => [
      record.id,
      record.type,
      record.category,
      String(record.amount),
      record.date,
      record.description,
      record.relatedFieldId ?? "",
      record.relatedCropId ?? "",
    ])
  );
}
