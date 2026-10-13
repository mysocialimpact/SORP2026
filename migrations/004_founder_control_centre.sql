-- Founder Control Centre records. Run once with the schema owner/runtime role.
-- This is an entitlement and relationship ledger; no users or assessments are copied here.
CREATE TABLE IF NOT EXISTS research_console.founder_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, type text NOT NULL CHECK (type IN ('Charity','Adviser','Other')),
  plan text NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free','Plus','Adviser','Enterprise')),
  published_price numeric(10,2) NOT NULL DEFAULT 0, payable_price numeric(10,2) NOT NULL DEFAULT 0,
  complimentary boolean NOT NULL DEFAULT false, complimentary_start timestamptz, complimentary_end timestamptz,
  complimentary_reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS research_console.founder_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  account_id text, email text NOT NULL, role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organisation_id,email)
);
CREATE TABLE IF NOT EXISTS research_console.founder_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  email text NOT NULL, role text NOT NULL DEFAULT 'member', status text NOT NULL DEFAULT 'recorded', created_at timestamptz NOT NULL DEFAULT now(), invited_by text NOT NULL
);
CREATE TABLE IF NOT EXISTS research_console.founder_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), adviser_organisation_id uuid NOT NULL REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  charity_organisation_id uuid NOT NULL REFERENCES research_console.founder_organisations(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{"progress":true,"answers":false,"edit":false,"invitations":false}', status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(adviser_organisation_id,charity_organisation_id)
);
CREATE TABLE IF NOT EXISTS research_console.founder_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor text NOT NULL, action text NOT NULL, target_type text NOT NULL, target_id text NOT NULL,
  before_state jsonb, after_state jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS founder_org_name_idx ON research_console.founder_organisations(name);
CREATE INDEX IF NOT EXISTS founder_membership_email_idx ON research_console.founder_memberships(lower(email));
