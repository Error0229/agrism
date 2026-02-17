CREATE TABLE IF NOT EXISTS planner_events (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  field_id UUID NULL,
  crop_id UUID NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_planner_events_occurred_at
  ON planner_events (occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_planner_events_field_id
  ON planner_events (field_id);

CREATE INDEX IF NOT EXISTS idx_planner_events_crop_id
  ON planner_events (crop_id);

