-- Authenticated contact, beta feedback and founder-approved improvement records.
-- This is deliberately separate from assessment answers and product progress.
BEGIN;

CREATE TABLE IF NOT EXISTS research_console.founder_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text NOT NULL UNIQUE,
  account_id text NOT NULL,
  user_name text NOT NULL,
  email text NOT NULL,
  organisation_id text,
  organisation_name text,
  account_type text NOT NULL,
  page_path text NOT NULL,
  category text NOT NULL CHECK (category IN ('general','suggestion','problem')),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  comment text,
  source_type text NOT NULL DEFAULT 'user' CHECK (source_type IN ('user','automatic')),
  error_type text,
  technical_context jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','actioning','resolved')),
  theme text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rating IS NOT NULL OR nullif(btrim(comment), '') IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS research_console.founder_contact_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text NOT NULL UNIQUE,
  account_id text NOT NULL,
  user_name text NOT NULL,
  email text NOT NULL,
  organisation_id text,
  organisation_name text,
  account_type text NOT NULL,
  page_path text NOT NULL,
  enquiry_type text NOT NULL CHECK (enquiry_type IN ('question','advice','meeting')),
  message text NOT NULL CHECK (length(btrim(message)) > 0),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','actioning','resolved')),
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_console.founder_improvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid REFERENCES research_console.founder_feedback(id) ON DELETE SET NULL,
  said text NOT NULL CHECK (length(btrim(said)) > 0),
  did text NOT NULL CHECK (length(btrim(did)) > 0),
  link_url text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_feedback_created_idx ON research_console.founder_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS founder_feedback_account_created_idx ON research_console.founder_feedback(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS founder_feedback_open_idx ON research_console.founder_feedback(created_at DESC) WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS founder_feedback_category_idx ON research_console.founder_feedback(category, created_at DESC);
CREATE INDEX IF NOT EXISTS founder_contact_created_idx ON research_console.founder_contact_enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS founder_contact_account_created_idx ON research_console.founder_contact_enquiries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS founder_contact_open_idx ON research_console.founder_contact_enquiries(created_at DESC) WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS founder_improvements_published_idx ON research_console.founder_improvements(published_at DESC) WHERE published;

REVOKE ALL ON research_console.founder_feedback, research_console.founder_contact_enquiries, research_console.founder_improvements FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON research_console.founder_feedback, research_console.founder_contact_enquiries, research_console.founder_improvements TO sorp_console_runtime;

INSERT INTO research_console.migrations(version) VALUES('006-founder-feedback') ON CONFLICT DO NOTHING;
COMMIT;
