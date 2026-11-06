BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS research_console.growth_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('accountants','charities')),
  firm_id uuid UNIQUE REFERENCES research_console.firms(id),
  name text CHECK (length(name) BETWEEN 2 AND 200),
  website text,
  charity_number text,
  organisation_id uuid UNIQUE REFERENCES research_console.founder_organisations(id),
  referred_by uuid REFERENCES research_console.growth_relationships(id),
  referral_evidence text,
  stage text NOT NULL,
  priority text NOT NULL DEFAULT 'Normal' CHECK (priority IN ('High','Normal','Low')),
  owner_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_review text NOT NULL DEFAULT 'Review needed' CHECK (contact_review IN ('Review needed','Reviewed for outreach','Do not contact')),
  contact_basis text,
  next_action text,
  follow_up date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind='accountants' AND firm_id IS NOT NULL AND name IS NULL AND referred_by IS NULL)
    OR (kind='charities' AND firm_id IS NULL AND name IS NOT NULL)),
  CHECK (referred_by IS NULL OR (organisation_id IS NOT NULL AND length(btrim(referral_evidence)) > 0 AND referral_evidence IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS growth_charity_number_uq ON research_console.growth_relationships(charity_number) WHERE kind='charities' AND charity_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS growth_charity_name_uq ON research_console.growth_relationships(lower(regexp_replace(name,'[^[:alnum:]]+','','g'))) WHERE kind='charities';
CREATE INDEX IF NOT EXISTS growth_pipeline_idx ON research_console.growth_relationships(kind,stage,follow_up);
CREATE INDEX IF NOT EXISTS growth_referral_idx ON research_console.growth_relationships(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS growth_contact_idx ON research_console.growth_relationships(lower(contact_email)) WHERE contact_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS research_console.growth_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES research_console.growth_relationships(id),
  action text NOT NULL CHECK (action IN ('created','updated','note','meeting','email-draft','email-sent','report-draft','report-approved','report-shared')),
  details jsonb NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS growth_activity_relationship_idx ON research_console.growth_activity(relationship_id,created_at DESC);
CREATE INDEX IF NOT EXISTS growth_activity_action_idx ON research_console.growth_activity(action,relationship_id);
REVOKE ALL ON research_console.growth_relationships, research_console.growth_activity FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON research_console.growth_relationships TO sorp_console_runtime;
GRANT SELECT, INSERT ON research_console.growth_activity TO sorp_console_runtime;
-- The application backup reads all research_console tables with this role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sorp_backup_reader') THEN
    GRANT SELECT ON research_console.growth_relationships, research_console.growth_activity TO sorp_backup_reader;
  END IF;
END $$;
INSERT INTO research_console.migrations(version) VALUES ('014-founder-growth') ON CONFLICT DO NOTHING;
COMMIT;
