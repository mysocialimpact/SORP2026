import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

let pool: Pool | undefined;
let ready: Promise<void> | undefined;

export function founderDatabase() {
  if (!process.env.CONSOLE_DATABASE_URL) throw new Error("The founder database needs connecting.");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.CONSOLE_DATABASE_URL, max: 4, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, statement_timeout: 20000 });
    attachDatabasePool(pool);
  }
  return pool;
}

export async function founderQuery<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  await ensureFounderSchema();
  return (await founderDatabase().query(text, values)).rows as T[];
}

export async function ensureFounderSchema() {
  if (ready) return ready;
  ready = (async () => {
    const db = founderDatabase();
    await db.query(`
      CREATE TABLE IF NOT EXISTS research_console.founder_organisations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, type text NOT NULL CHECK (type IN ('Charity','Adviser','Other')),
        platform_organisation_id text,
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
      CREATE TABLE IF NOT EXISTS research_console.founder_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id text NOT NULL UNIQUE,
        account_id text NOT NULL, user_name text NOT NULL, email text NOT NULL,
        organisation_id text, organisation_name text, account_type text NOT NULL, page_path text NOT NULL,
        category text NOT NULL CHECK (category IN ('general','suggestion','problem')),
        rating smallint CHECK (rating BETWEEN 1 AND 5), comment text,
        source_type text NOT NULL DEFAULT 'user' CHECK (source_type IN ('user','automatic')),
        error_type text, technical_context jsonb NOT NULL DEFAULT '{}',
        status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','actioning','resolved')),
        theme text, internal_notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK (rating IS NOT NULL OR nullif(btrim(comment), '') IS NOT NULL)
      );
      CREATE TABLE IF NOT EXISTS research_console.founder_contact_enquiries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id text NOT NULL UNIQUE,
        account_id text NOT NULL, user_name text NOT NULL, email text NOT NULL,
        organisation_id text, organisation_name text, account_type text NOT NULL, page_path text NOT NULL,
        enquiry_type text NOT NULL CHECK (enquiry_type IN ('question','advice','meeting')),
        message text NOT NULL CHECK (length(btrim(message)) > 0),
        status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','actioning','resolved')),
        internal_notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS research_console.founder_improvements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        feedback_id uuid REFERENCES research_console.founder_feedback(id) ON DELETE SET NULL,
        said text NOT NULL CHECK (length(btrim(said)) > 0), did text NOT NULL CHECK (length(btrim(did)) > 0),
        link_url text, published boolean NOT NULL DEFAULT false, published_at timestamptz,
        created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS founder_org_name_idx ON research_console.founder_organisations(name);
      CREATE INDEX IF NOT EXISTS founder_membership_email_idx ON research_console.founder_memberships(lower(email));
      CREATE INDEX IF NOT EXISTS founder_feedback_created_idx ON research_console.founder_feedback(created_at DESC);
      CREATE INDEX IF NOT EXISTS founder_feedback_account_created_idx ON research_console.founder_feedback(account_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS founder_feedback_open_idx ON research_console.founder_feedback(created_at DESC) WHERE status <> 'resolved';
      CREATE INDEX IF NOT EXISTS founder_feedback_category_idx ON research_console.founder_feedback(category,created_at DESC);
      CREATE INDEX IF NOT EXISTS founder_contact_created_idx ON research_console.founder_contact_enquiries(created_at DESC);
      CREATE INDEX IF NOT EXISTS founder_contact_account_created_idx ON research_console.founder_contact_enquiries(account_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS founder_contact_open_idx ON research_console.founder_contact_enquiries(created_at DESC) WHERE status <> 'resolved';
      CREATE INDEX IF NOT EXISTS founder_improvements_published_idx ON research_console.founder_improvements(published_at DESC) WHERE published;
      ALTER TABLE research_console.founder_organisations ADD COLUMN IF NOT EXISTS platform_organisation_id text;
      CREATE UNIQUE INDEX IF NOT EXISTS founder_org_platform_id_idx ON research_console.founder_organisations(platform_organisation_id) WHERE platform_organisation_id IS NOT NULL;
      INSERT INTO research_console.founder_organisations(name,type,plan,published_price,payable_price,complimentary,complimentary_start,complimentary_reason)
      SELECT 'FLUID','Adviser','Adviser',99,0,true,now(),'Complimentary Partner'
      WHERE NOT EXISTS (SELECT 1 FROM research_console.founder_organisations WHERE lower(name)=lower('FLUID'));
      UPDATE research_console.founder_organisations SET platform_organisation_id='fluid-adviser' WHERE lower(name)=lower('FLUID') AND platform_organisation_id IS NULL;
      INSERT INTO research_console.founder_organisations(name,type,platform_organisation_id,plan,published_price,payable_price,complimentary,complimentary_reason)
      SELECT 'Brainstrust','Charity','brainstrust','Free',0,0,false,NULL
      WHERE NOT EXISTS (SELECT 1 FROM research_console.founder_organisations WHERE lower(name)=lower('Brainstrust'));
    `);
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}
