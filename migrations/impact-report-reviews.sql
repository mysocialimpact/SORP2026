-- Additive product records. Identity remains in the existing account service.
CREATE TABLE IF NOT EXISTS research_console.impact_report_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope text NOT NULL, account_id text NOT NULL,
 organisation_id text, organisation text NOT NULL, title text NOT NULL, source_url text,
 reporting_period text, sha256 text, file_bytes bytea, pages jsonb,
 confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scope,source_url), UNIQUE(scope,sha256)
);
CREATE TABLE IF NOT EXISTS research_console.impact_report_reviews (
 document_id uuid NOT NULL REFERENCES research_console.impact_report_documents(id),
 framework text NOT NULL CHECK(framework IN ('claims','excellence')), version text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','complete','failed')),
 result jsonb, error text, attempts integer NOT NULL DEFAULT 0, lease_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(document_id,framework,version)
);
CREATE INDEX IF NOT EXISTS impact_report_scope_idx ON research_console.impact_report_documents(scope,created_at DESC);
CREATE TABLE IF NOT EXISTS research_console.impact_report_searches(scope text PRIMARY KEY,checked_at timestamptz NOT NULL DEFAULT now(),message text NOT NULL);
GRANT SELECT,INSERT,UPDATE ON research_console.impact_report_documents,research_console.impact_report_reviews TO sorp_console_runtime;
GRANT SELECT,INSERT,UPDATE ON research_console.impact_report_searches TO sorp_console_runtime;
