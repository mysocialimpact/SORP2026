ALTER TABLE research_console.impact_report_documents ADD COLUMN IF NOT EXISTS understanding jsonb;
ALTER TABLE research_console.impact_report_reviews ADD COLUMN IF NOT EXISTS progress jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS research_console.impact_report_allowances (
 account_id text PRIMARY KEY, document_id uuid NOT NULL REFERENCES research_console.impact_report_documents(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON research_console.impact_report_allowances TO sorp_console_runtime;
