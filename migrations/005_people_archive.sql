BEGIN;
ALTER TABLE research_console.people ADD COLUMN IF NOT EXISTS archived_at timestamptz;
INSERT INTO research_console.migrations(version) VALUES('005') ON CONFLICT DO NOTHING;
COMMIT;
