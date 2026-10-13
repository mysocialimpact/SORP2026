BEGIN;
CREATE TABLE IF NOT EXISTS research_console.ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid REFERENCES research_console.runs(id),
 purpose text NOT NULL,
 model text NOT NULL,
 status text NOT NULL DEFAULT 'reserved',
 reserved_usd numeric(10,6) NOT NULL,
 estimated_usd numeric(10,6),
 input_tokens integer,
 output_tokens integer,
 search_calls integer,
 response_id text,
 error text,
 result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON research_console.ai_usage(created_at);
CREATE INDEX IF NOT EXISTS ai_usage_run_idx ON research_console.ai_usage(run_id);
CREATE TABLE IF NOT EXISTS research_console.discovery_cache (
 query_key text PRIMARY KEY,
 candidates jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN IF EXISTS(SELECT FROM pg_roles WHERE rolname='sorp_console_runtime') THEN GRANT SELECT,INSERT,UPDATE ON research_console.ai_usage,research_console.discovery_cache TO sorp_console_runtime; END IF; END $$;
INSERT INTO research_console.migrations(version) VALUES('004') ON CONFLICT DO NOTHING;
COMMIT;
