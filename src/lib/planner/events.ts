import { v4 as uuidv4 } from "uuid";
import type { Field, PlantedCrop } from "@/lib/types";

export type PlannerEventType =
  | "field_created"
  | "field_updated"
  | "field_removed"
  | "crop_planted"
  | "crop_updated"
  | "crop_removed";

export interface PlannerEvent<TPayload = unknown> {
  id: string;
  type: PlannerEventType;
  occurredAt: string;
  fieldId?: string;
  cropId?: string;
  payload: TPayload;
}

interface ReplayOptions {
  at?: string | Date;
}

function asDateValue(dateLike: string | Date) {
  return dateLike instanceof Date ? dateLike.getTime() : new Date(dateLike).getTime();
}

export function replayPlannerEvents(events: PlannerEvent[], options?: ReplayOptions): Field[] {
  const at = options?.at ? asDateValue(options.at) : null;
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
        const payload = event.payload as { id: string; name: string; dimensions: Field["dimensions"] };
        fieldsMap.set(payload.id, {
          id: payload.id,
          name: payload.name,
          dimensions: payload.dimensions,
          plantedCrops: [],
        });
        break;
      }
      case "field_updated": {
        if (!event.fieldId) break;
        const field = fieldsMap.get(event.fieldId);
        if (!field) break;
        const payload = event.payload as Partial<Omit<Field, "id">>;
        fieldsMap.set(event.fieldId, { ...field, ...payload });
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
        fieldsMap.set(event.fieldId, { ...field, plantedCrops: [...field.plantedCrops, payload] });
        break;
      }
      case "crop_updated": {
        if (!event.fieldId || !event.cropId) break;
        const field = fieldsMap.get(event.fieldId);
        if (!field) break;
        const payload = event.payload as Partial<PlantedCrop>;
        fieldsMap.set(event.fieldId, {
          ...field,
          plantedCrops: field.plantedCrops.map((crop) => (crop.id === event.cropId ? { ...crop, ...payload } : crop)),
        });
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
    }
  }

  return Array.from(fieldsMap.values());
}

export function createPlannerEvent<TPayload>(input: {
  type: PlannerEventType;
  occurredAt?: string;
  fieldId?: string;
  cropId?: string;
  payload: TPayload;
}): PlannerEvent<TPayload> {
  return {
    id: uuidv4(),
    type: input.type,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
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

