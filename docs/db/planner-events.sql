CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farm_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (farm_id, user_id)
);

CREATE TABLE IF NOT EXISTS planner_events (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  field_id UUID NULL,
  crop_id UUID NULL,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_farm_members_user_id ON farm_members(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_members_farm_id ON farm_members(farm_id);

CREATE INDEX IF NOT EXISTS idx_planner_events_occurred_at ON planner_events (occurred_at ASC);
CREATE INDEX IF NOT EXISTS idx_planner_events_field_id ON planner_events (field_id);
CREATE INDEX IF NOT EXISTS idx_planner_events_crop_id ON planner_events (crop_id);
CREATE INDEX IF NOT EXISTS idx_planner_events_user_id ON planner_events (user_id);
CREATE INDEX IF NOT EXISTS idx_planner_events_farm_id ON planner_events (farm_id);

-- Optional RLS hardening (enable only when session-level app.user_id is wired):
-- ALTER TABLE planner_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE farm_members ENABLE ROW LEVEL SECURITY;
