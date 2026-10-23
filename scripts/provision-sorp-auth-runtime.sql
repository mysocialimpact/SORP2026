-- Run with psql as the schema owner AFTER migrations 008-011. Create the login
-- with SQL (CREATE ROLE sorp_auth_runtime LOGIN NOCREATEDB NOCREATEROLE), then
-- set a unique password securely. Neon's role-creation API currently adds the
-- role to neon_superuser; do not use that path for a web runtime credential.
-- Use only this role's pooled URL for SORP_AUTH_DATABASE_URL.
BEGIN;

DO $$
DECLARE runtime_role pg_roles%ROWTYPE;
BEGIN
  SELECT * INTO runtime_role FROM pg_roles WHERE rolname = 'sorp_auth_runtime';
  IF NOT FOUND OR NOT runtime_role.rolcanlogin OR runtime_role.rolsuper
     OR runtime_role.rolcreaterole OR runtime_role.rolcreatedb
     OR runtime_role.rolreplication OR runtime_role.rolbypassrls
     OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = runtime_role.oid) THEN
    RAISE EXCEPTION 'sorp_auth_runtime must be a login with no admin privileges or role memberships';
  END IF;
END;
$$;

REVOKE ALL ON SCHEMA sorp_auth FROM PUBLIC;
GRANT USAGE ON SCHEMA sorp_auth TO sorp_auth_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sorp_auth TO sorp_auth_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sorp_auth TO sorp_auth_runtime;

-- Better Auth and application tables need writes; the audit table only accepts
-- new events. Database triggers additionally block owner-side row changes.
REVOKE UPDATE, DELETE ON sorp_auth.audit_event FROM sorp_auth_runtime;

COMMIT;

-- Verify this role cannot access research_console or CREATE in any schema
-- before using its credential. Do not use an owner or neon_superuser member.
