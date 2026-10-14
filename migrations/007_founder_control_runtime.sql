-- Repair the founder-control migration that previously shared version 004.
-- Runtime requests must query pre-migrated tables and never create schema objects.
BEGIN;

CREATE TABLE IF NOT EXISTS research_console.founder_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Charity','Adviser','Other')),
  platform_organisation_id text,
  plan text NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free','Plus','Adviser','Enterprise')),
  published_price numeric(10,2) NOT NULL DEFAULT 0,
  payable_price numeric(10,2) NOT NULL DEFAULT 0,
  complimentary boolean NOT NULL DEFAULT false,
  complimentary_start timestamptz,
  complimentary_end timestamptz,
  complimentary_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_console.founder_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  account_id text,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,email)
);

CREATE TABLE IF NOT EXISTS research_console.founder_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'recorded',
  created_at timestamptz NOT NULL DEFAULT now(),
  invited_by text NOT NULL
);

CREATE TABLE IF NOT EXISTS research_console.founder_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adviser_organisation_id uuid NOT NULL REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  charity_organisation_id uuid NOT NULL REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{"progress":true,"answers":false,"edit":false,"invitations":false}',
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(adviser_organisation_id,charity_organisation_id)
);

CREATE TABLE IF NOT EXISTS research_console.founder_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_org_name_idx ON research_console.founder_organisations(name);
CREATE INDEX IF NOT EXISTS founder_membership_email_idx ON research_console.founder_memberships(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS founder_org_platform_id_idx
  ON research_console.founder_organisations(platform_organisation_id)
  WHERE platform_organisation_id IS NOT NULL;

INSERT INTO research_console.founder_organisations
  (name,type,platform_organisation_id,plan,published_price,payable_price,complimentary,complimentary_start,complimentary_reason)
SELECT 'FLUID','Adviser','fluid-adviser','Adviser',99,0,true,now(),'Complimentary Partner'
WHERE NOT EXISTS (
  SELECT 1 FROM research_console.founder_organisations WHERE lower(name)=lower('FLUID')
);

UPDATE research_console.founder_organisations
SET platform_organisation_id='fluid-adviser'
WHERE lower(name)=lower('FLUID') AND platform_organisation_id IS NULL;

INSERT INTO research_console.founder_organisations
  (name,type,platform_organisation_id,plan,published_price,payable_price,complimentary,complimentary_reason)
SELECT 'Brainstrust','Charity','brainstrust','Free',0,0,false,NULL
WHERE NOT EXISTS (
  SELECT 1 FROM research_console.founder_organisations WHERE lower(name)=lower('Brainstrust')
);

REVOKE ALL ON research_console.founder_organisations,
  research_console.founder_memberships,
  research_console.founder_invitations,
  research_console.founder_client_access,
  research_console.founder_audit_log
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON research_console.founder_organisations,
  research_console.founder_memberships,
  research_console.founder_invitations,
  research_console.founder_client_access,
  research_console.founder_audit_log
TO sorp_console_runtime;

INSERT INTO research_console.migrations(version)
VALUES('007-founder-control-runtime')
ON CONFLICT DO NOTHING;

COMMIT;
