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
      CREATE INDEX IF NOT EXISTS founder_org_name_idx ON research_console.founder_organisations(name);
      CREATE INDEX IF NOT EXISTS founder_membership_email_idx ON research_console.founder_memberships(lower(email));
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
