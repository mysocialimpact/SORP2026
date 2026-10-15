-- Apply only after 008_sorp_auth_provider.sql in an isolated database first.
-- This schema is independent of Cow and My Social Impact.

CREATE UNIQUE INDEX sorp_user_email_folded_unique ON sorp_auth."user" (lower(email));

CREATE TABLE sorp_auth.profile (
  user_id text PRIMARY KEY REFERENCES sorp_auth."user"(id) ON DELETE CASCADE,
  position text NOT NULL DEFAULT '',
  organisation_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sorp_auth.account_progress (
  user_id text PRIMARY KEY REFERENCES sorp_auth."user"(id) ON DELETE CASCADE,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_stage integer NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 7),
  completed_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_saved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sorp_auth.organisation (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Charity', 'Adviser', 'Other')),
  programme text NOT NULL DEFAULT 'snapshot' CHECK (programme IN ('snapshot', 'team', 'excellence')),
  seat_limit integer NOT NULL DEFAULT 1 CHECK (seat_limit BETWEEN 1 AND 100),
  entitlement_source text NOT NULL DEFAULT 'direct',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sorp_auth.legacy_organisation_link (
  source text NOT NULL CHECK (source IN ('cow_team', 'cow_platform', 'founder_ledger')),
  source_id text NOT NULL,
  organisation_id text NOT NULL REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, source_id)
);
CREATE INDEX sorp_legacy_organisation_link_org_idx ON sorp_auth.legacy_organisation_link(organisation_id);

CREATE TABLE sorp_auth.membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id text NOT NULL REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT,
  user_id text NOT NULL REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);
CREATE INDEX sorp_membership_user_idx ON sorp_auth.membership(user_id, status);

CREATE TABLE sorp_auth.team_round (
  id text PRIMARY KEY,
  organisation_id text NOT NULL REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT,
  title text NOT NULL,
  response_mode text NOT NULL CHECK (response_mode IN ('confidential', 'named')),
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  created_by_user_id text NOT NULL REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  closed_at timestamptz
);
CREATE INDEX sorp_team_round_org_idx ON sorp_auth.team_round(organisation_id, status);

CREATE TABLE sorp_auth.team_invitation (
  id text PRIMARY KEY,
  round_id text NOT NULL REFERENCES sorp_auth.team_round(id) ON DELETE RESTRICT,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('invited', 'started', 'completed', 'revoked')),
  invited_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL
);
CREATE INDEX sorp_team_invitation_round_idx ON sorp_auth.team_invitation(round_id, status);

CREATE TABLE sorp_auth.team_response (
  id text PRIMARY KEY,
  round_id text NOT NULL REFERENCES sorp_auth.team_round(id) ON DELETE RESTRICT,
  invitation_id text NOT NULL UNIQUE REFERENCES sorp_auth.team_invitation(id) ON DELETE RESTRICT,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_index integer NOT NULL DEFAULT 0 CHECK (current_index BETWEEN 0 AND 24),
  overall numeric,
  pillar_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  maturity text,
  started_at timestamptz,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE TABLE sorp_auth.entitlement (
  organisation_id text PRIMARY KEY REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT,
  plan text NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Plus', 'Adviser', 'Enterprise')),
  published_price_pence integer NOT NULL DEFAULT 0 CHECK (published_price_pence >= 0),
  payable_price_pence integer NOT NULL DEFAULT 0 CHECK (payable_price_pence >= 0),
  status text NOT NULL DEFAULT 'standard' CHECK (status IN ('standard', 'complimentary_partner', 'suspended')),
  complimentary_start timestamptz,
  complimentary_end timestamptz,
  complimentary_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sorp_auth.invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id text NOT NULL REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by text NOT NULL REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  accepted_by text REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sorp_invitation_email_idx ON sorp_auth.invitation(lower(email), status);

CREATE TABLE sorp_auth.adviser_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adviser_organisation_id text NOT NULL REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT,
  charity_organisation_id text NOT NULL REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('requested', 'active', 'denied', 'revoked')),
  requested_by text NOT NULL REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  approved_by text REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (adviser_organisation_id <> charity_organisation_id),
  UNIQUE (adviser_organisation_id, charity_organisation_id)
);

CREATE TABLE sorp_auth.founder_grant (
  user_id text PRIMARY KEY REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL,
  grant_reason text NOT NULL,
  revoked_at timestamptz
);

CREATE FUNCTION sorp_auth.require_founder_mfa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.revoked_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM sorp_auth."user" u
    JOIN sorp_auth."twoFactor" t ON t."userId"=u.id
    WHERE u.id=NEW.user_id AND u."twoFactorEnabled"=true AND t.verified=true
  ) THEN
    RAISE EXCEPTION 'A verified second factor is required before a founder grant';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER founder_grant_requires_mfa
  BEFORE INSERT OR UPDATE ON sorp_auth.founder_grant
  FOR EACH ROW EXECUTE FUNCTION sorp_auth.require_founder_mfa();

CREATE TABLE sorp_auth.product_progress (
  user_id text NOT NULL REFERENCES sorp_auth."user"(id) ON DELETE CASCADE,
  product_id text NOT NULL CHECK (product_id IN ('social-impact-excellence', 'charity-impact-reports')),
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'complete', 'awaiting_payment', 'paid', 'in_review', 'feedback_ready', 'closed')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE sorp_auth.report_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  filename text NOT NULL,
  organisation text NOT NULL DEFAULT '',
  customer_context text NOT NULL DEFAULT '',
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 15728640),
  status text NOT NULL CHECK (status IN ('uploading', 'awaiting_payment', 'in_review', 'feedback_ready', 'closed')),
  upload_token_hash text UNIQUE,
  upload_expires_at timestamptz,
  file_bytes bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='uploading' AND upload_token_hash IS NOT NULL AND upload_expires_at IS NOT NULL AND file_bytes IS NULL)
    OR (status<>'uploading' AND upload_token_hash IS NULL AND upload_expires_at IS NULL AND file_bytes IS NOT NULL))
);
CREATE INDEX sorp_report_review_user_idx ON sorp_auth.report_review(user_id, created_at DESC);

CREATE TABLE sorp_auth.report_upload_chunk (
  review_id uuid NOT NULL REFERENCES sorp_auth.report_review(id) ON DELETE CASCADE,
  chunk_index smallint NOT NULL CHECK (chunk_index BETWEEN 0 AND 4),
  bytes bytea NOT NULL,
  PRIMARY KEY (review_id, chunk_index)
);

CREATE TABLE sorp_auth.account_import (
  source_account_id text PRIMARY KEY,
  source_digest text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  user_id text NOT NULL UNIQUE REFERENCES sorp_auth."user"(id) ON DELETE RESTRICT,
  CHECK (source_account_id = user_id)
);

CREATE TABLE sorp_auth.audit_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id text REFERENCES sorp_auth."user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sorp_audit_target_idx ON sorp_auth.audit_event(target_type, target_id, created_at DESC);
