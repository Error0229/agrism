import { v4 as uuidv4 } from "uuid";
import type { Field, FieldContext, PlantedCrop } from "@/lib/types";
import { normalizeFieldContext } from "@/lib/utils/field-context";
import { getCropPolygon, polygonsOverlap } from "@/lib/utils/crop-shape";

export type PlannerEventType =
  | "field_created"
  | "field_updated"
  | "field_removed"
  | "crop_planted"
  | "crop_updated"
  | "crop_removed"
  | "crop_harvested";

export interface PlannerEvent<TPayload = unknown> {
  id: string;
  type: PlannerEventType;
  occurredAt: string;
  insertedAt?: string;
  fieldId?: string;
  cropId?: string;
  payload: TPayload;
}

export interface PlannerConflict {
  type: "spatial_overlap";
  fieldId: string;
  cropId: string;
  conflictingCropId: string;
  occurredAt: string;
  message: string;
}

interface ReplayOptions {
  at?: string | Date;
  respectPlantedDate?: boolean;
}

function asDateValue(dateLike: string | Date) {
  return dateLike instanceof Date ? dateLike.getTime() : new Date(dateLike).getTime();
}

export function replayPlannerEvents(events: PlannerEvent[], options?: ReplayOptions): Field[] {
  const at = options?.at ? asDateValue(options.at) : null;
  const respectPlantedDate = options?.respectPlantedDate ?? false;
  const sorted = [...events].sort((a, b) => {
    const timeDiff = asDateValue(a.occurredAt) - asDateValue(b.occurredAt);
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
  const fieldsMap = new Map<string, Field>();

  for (const event of sorted) {
    if (at !== null && asDateValue(event.occurredAt) > at) continue;

    switch (event.type) {
      case "field_created": {
        const payload = event.payload as {
          id: string;
          name: string;
          dimensions: Field["dimensions"];
          context?: Partial<FieldContext>;
          utilityNodes?: Field["utilityNodes"];
          utilityEdges?: Field["utilityEdges"];
        };
        fieldsMap.set(payload.id, {
          id: payload.id,
          name: payload.name,
          dimensions: payload.dimensions,
          context: normalizeFieldContext(payload.context),
          utilityNodes: Array.isArray(payload.utilityNodes) ? payload.utilityNodes : [],
          utilityEdges: Array.isArray(payload.utilityEdges) ? payload.utilityEdges : [],
          plantedCrops: [],
        });
        break;
      }
      case "field_updated": {
        if (!event.fieldId) break;
        const field = fieldsMap.get(event.fieldId);
        if (!field) break;
        const payload = event.payload as Partial<Omit<Field, "id">> & { context?: Partial<FieldContext> };
        fieldsMap.set(event.fieldId, {
          ...field,
          ...payload,
          context: payload.context ? normalizeFieldContext({ ...field.context, ...payload.context }) : field.context,
        });
        break;
      }
      case "field_removed": {
        if (!event.fieldId) break;
        fieldsMap.delete(event.fieldId);
        break;
      }
      case "crop_planted": {
        if (!event.fieldId) break;
        const field = fieldsMap.get(event.fieldId);
        if (!field) break;
        const payload = event.payload as PlantedCrop;
        if (respectPlantedDate && at !== null && asDateValue(payload.plantedDate) > at) break;
        fieldsMap.set(event.fieldId, { ...field, plantedCrops: [...field.plantedCrops, payload] });
        break;
      }
      case "crop_updated": {
        if (!event.fieldId || !event.cropId) break;
        const field = fieldsMap.get(event.fieldId);
        if (!field) break;
        const payload = event.payload as Partial<PlantedCrop>;
        const updatedField = {
          ...field,
          plantedCrops: field.plantedCrops.map((crop) => (crop.id === event.cropId ? { ...crop, ...payload } : crop)),
        };
        if (respectPlantedDate && at !== null) {
          updatedField.plantedCrops = updatedField.plantedCrops.filter((crop) => asDateValue(crop.plantedDate) <= at);
        }
        fieldsMap.set(event.fieldId, updatedField);
        break;
      }
      case "crop_removed": {
        if (!event.fieldId || !event.cropId) break;
        const field = fieldsMap.get(event.fieldId);
        if (!field) break;
        fieldsMap.set(event.fieldId, {
          ...field,
          plantedCrops: field.plantedCrops.filter((crop) => crop.id !== event.cropId),
        });
        break;
      }
      case "crop_harvested": {
        if (!event.fieldId || !event.cropId) break;
        const field = fieldsMap.get(event.fieldId);
        if (!field) break;
        const payload = event.payload as { harvestedDate?: string };
        fieldsMap.set(event.fieldId, {
          ...field,
          plantedCrops: field.plantedCrops.map((crop) =>
            crop.id === event.cropId
              ? {
                  ...crop,
                  status: "harvested",
                  harvestedDate: payload.harvestedDate ?? event.occurredAt,
                }
              : crop
          ),
        });
        break;
      }
    }
  }

  return Array.from(fieldsMap.values());
}

export function createPlannerEvent<TPayload>(input: {
  type: PlannerEventType;
  occurredAt?: string;
  insertedAt?: string;
  fieldId?: string;
  cropId?: string;
  payload: TPayload;
}): PlannerEvent<TPayload> {
  return {
    id: uuidv4(),
    type: input.type,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    insertedAt: input.insertedAt ?? new Date().toISOString(),
    fieldId: input.fieldId,
    cropId: input.cropId,
    payload: input.payload,
  };
}

export function bootstrapEventsFromFields(fields: Field[]): PlannerEvent[] {
  const events: PlannerEvent[] = [];

  for (const field of fields) {
    events.push(
      createPlannerEvent({
        type: "field_created",
        fieldId: field.id,
        payload: {
          id: field.id,
          name: field.name,
          dimensions: field.dimensions,
          context: normalizeFieldContext(field.context),
          utilityNodes: field.utilityNodes ?? [],
          utilityEdges: field.utilityEdges ?? [],
        },
      })
    );

    for (const planted of field.plantedCrops) {
      events.push(
        createPlannerEvent({
          type: "crop_planted",
          fieldId: field.id,
          cropId: planted.id,
          payload: planted,
        })
      );
    }
  }

  return events;
}

export function detectSpatialConflictsAt(events: PlannerEvent[], at: string | Date): PlannerConflict[] {
  const fields = replayPlannerEvents(events, { at, respectPlantedDate: true });
  const occurredAt = at instanceof Date ? at.toISOString() : new Date(at).toISOString();
  const conflicts: PlannerConflict[] = [];

  for (const field of fields) {
    const activeCrops = field.plantedCrops.filter((crop) => crop.status === "growing");
    for (let i = 0; i < activeCrops.length; i += 1) {
      for (let j = i + 1; j < activeCrops.length; j += 1) {
        const a = activeCrops[i];
        const b = activeCrops[j];
        if (polygonsOverlap(getCropPolygon(a), getCropPolygon(b))) {
          conflicts.push({
            type: "spatial_overlap",
            fieldId: field.id,
            cropId: a.id,
            conflictingCropId: b.id,
            occurredAt,
            message: `作物區塊重疊：${field.name} 中兩筆種植區域在同一時間有空間衝突。`,
          });
        }
      }
    }
  }

  return conflicts;
}
