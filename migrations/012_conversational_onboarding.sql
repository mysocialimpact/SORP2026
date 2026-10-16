-- Additive only. Apply in isolated staging first; no authentication or billing changes.
BEGIN;
CREATE TABLE research_console.onboarding_sessions (
 id text PRIMARY KEY, state jsonb NOT NULL DEFAULT '{}', messages jsonb NOT NULL DEFAULT '[]',
 candidates jsonb NOT NULL DEFAULT '[]', selected jsonb, attribution jsonb NOT NULL DEFAULT '{}',
 account_id text, requests integer NOT NULL DEFAULT 0, searches integer NOT NULL DEFAULT 0, transcriptions integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE TABLE research_console.charity_intelligence (
 identity text PRIMARY KEY, candidate jsonb NOT NULL, status text NOT NULL DEFAULT 'queued'
 CHECK(status IN ('queued','running','ready','partial','failed')),
 profile jsonb NOT NULL DEFAULT '{}', attempts integer NOT NULL DEFAULT 0,
 lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE research_console.charity_documents (
 charity_identity text NOT NULL REFERENCES research_console.charity_intelligence(identity),
 source_url text NOT NULL, kind text NOT NULL, title text NOT NULL, publication_date text,
 retrieved_at timestamptz, sha256 text, object_key text, bytes integer, status text NOT NULL,
 PRIMARY KEY(charity_identity,source_url)
);
CREATE TABLE research_console.onboarding_profiles (
 account_id text PRIMARY KEY, facts jsonb NOT NULL, messages jsonb NOT NULL,
 charity_identity text REFERENCES research_console.charity_intelligence(identity), attribution jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE research_console.onboarding_usage (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), reserved_usd numeric NOT NULL DEFAULT 0.02
);
CREATE TABLE research_console.onboarding_operations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, session_id text NOT NULL,
 action text NOT NULL CHECK(action IN ('search','transcription')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onboarding_operations_time ON research_console.onboarding_operations(action,created_at);
CREATE INDEX onboarding_usage_created ON research_console.onboarding_usage(created_at);
CREATE INDEX onboarding_expiry ON research_console.onboarding_sessions(expires_at);
CREATE INDEX charity_queue ON research_console.charity_intelligence(status,next_attempt_at);
-- These tables have no browser/public role grants. The existing server console role
-- needs explicit SELECT/INSERT/UPDATE/DELETE and sequence usage at deployment.
COMMIT;
