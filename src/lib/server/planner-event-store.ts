import { neon } from "@neondatabase/serverless";
import type { PlannerEvent } from "@/lib/planner/events";

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

export async function ensurePlannerEventTable() {
  const sql = getSqlClient();
  if (!sql) return false;

  await sql`
    CREATE TABLE IF NOT EXISTS planner_events (
      id UUID PRIMARY KEY,
      type TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      field_id UUID NULL,
      crop_id UUID NULL,
      payload JSONB NOT NULL
    );
  `;

  return true;
}

export async function appendPlannerEvent(event: PlannerEvent) {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensurePlannerEventTable();
  await sql`
    INSERT INTO planner_events (id, type, occurred_at, field_id, crop_id, payload)
    VALUES (${event.id}::uuid, ${event.type}, ${event.occurredAt}::timestamptz, ${event.fieldId ?? null}::uuid, ${event.cropId ?? null}::uuid, ${JSON.stringify(event.payload)}::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `;

  return true;
}

export async function getPlannerEvents(params?: { fieldId?: string; at?: string }) {
  const sql = getSqlClient();
  if (!sql) return [] as PlannerEvent[];

  await ensurePlannerEventTable();

  const fieldId = params?.fieldId;
  const at = params?.at;

  const rows = await sql`
    SELECT id, type, occurred_at, field_id, crop_id, payload
    FROM planner_events
    WHERE (${fieldId ?? null}::uuid IS NULL OR field_id = ${fieldId ?? null}::uuid)
      AND (${at ?? null}::timestamptz IS NULL OR occurred_at <= ${at ?? null}::timestamptz)
    ORDER BY occurred_at ASC, id ASC;
  `;

  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type) as PlannerEvent["type"],
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
    fieldId: row.field_id ? String(row.field_id) : undefined,
    cropId: row.crop_id ? String(row.crop_id) : undefined,
    payload: row.payload as unknown,
  }));
}

