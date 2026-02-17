import { neon } from "@neondatabase/serverless";
import type { PlannerEvent } from "@/lib/planner/events";
import { ensureAuthSchema } from "@/lib/server/auth-db";

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

export async function ensurePlannerEventTable() {
  const sql = getSqlClient();
  if (!sql) return false;
  await ensureAuthSchema();

  await sql`
    CREATE TABLE IF NOT EXISTS planner_events (
      id UUID PRIMARY KEY,
      type TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      field_id UUID NULL,
      crop_id UUID NULL,
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      payload JSONB NOT NULL
    );
  `;

  await sql`ALTER TABLE planner_events ADD COLUMN IF NOT EXISTS user_id UUID NULL;`;
  await sql`ALTER TABLE planner_events ADD COLUMN IF NOT EXISTS farm_id UUID NULL;`;
  await sql`ALTER TABLE planner_events ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`;
  await sql`ALTER TABLE planner_events ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'planner_events_user_id_fkey'
      ) THEN
        ALTER TABLE planner_events
          ADD CONSTRAINT planner_events_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'planner_events_farm_id_fkey'
      ) THEN
        ALTER TABLE planner_events
          ADD CONSTRAINT planner_events_farm_id_fkey
          FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_planner_events_user_id ON planner_events(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_planner_events_farm_id ON planner_events(farm_id);`;

  return true;
}

export async function appendPlannerEvent(
  event: PlannerEvent,
  scope: { userId: string; farmId: string }
) {
  const sql = getSqlClient();
  if (!sql) return false;

  await ensurePlannerEventTable();
  await sql`
    INSERT INTO planner_events (id, type, occurred_at, inserted_at, field_id, crop_id, user_id, farm_id, payload)
    VALUES (${event.id}::uuid, ${event.type}, ${event.occurredAt}::timestamptz, ${event.insertedAt ?? event.occurredAt}::timestamptz, ${event.fieldId ?? null}::uuid, ${event.cropId ?? null}::uuid, ${scope.userId}::uuid, ${scope.farmId}::uuid, ${JSON.stringify(event.payload)}::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `;

  return true;
}

export async function getPlannerEvents(params: {
  userId: string;
  farmId: string;
  fieldId?: string;
  at?: string;
  from?: string;
  to?: string;
}) {
  const sql = getSqlClient();
  if (!sql) return [] as PlannerEvent[];

  await ensurePlannerEventTable();

  const fieldId = params.fieldId;
  const at = params.at;
  const from = params.from;
  const to = params.to;

  const rows = await sql`
    SELECT id, type, occurred_at, inserted_at, field_id, crop_id, payload
    FROM planner_events
    WHERE user_id = ${params.userId}::uuid
      AND farm_id = ${params.farmId}::uuid
      AND (${fieldId ?? null}::uuid IS NULL OR field_id = ${fieldId ?? null}::uuid)
      AND (${from ?? null}::timestamptz IS NULL OR occurred_at >= ${from ?? null}::timestamptz)
      AND (${to ?? null}::timestamptz IS NULL OR occurred_at <= ${to ?? null}::timestamptz)
      AND (${at ?? null}::timestamptz IS NULL OR occurred_at <= ${at ?? null}::timestamptz)
    ORDER BY occurred_at ASC, id ASC;
  `;

  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type) as PlannerEvent["type"],
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
    insertedAt: new Date(String(row.inserted_at)).toISOString(),
    fieldId: row.field_id ? String(row.field_id) : undefined,
    cropId: row.crop_id ? String(row.crop_id) : undefined,
    payload: row.payload as unknown,
  }));
}
