-- Run with psql as the schema owner AFTER migrations 008-011. Create the
-- sorp_auth_runtime login separately with a unique password in Neon, then use
-- its pooled connection string only for SORP_AUTH_DATABASE_URL. Never use the
-- console or database-owner credential as the web runtime credential.
BEGIN;

REVOKE ALL ON SCHEMA sorp_auth FROM PUBLIC;
GRANT USAGE ON SCHEMA sorp_auth TO sorp_auth_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sorp_auth TO sorp_auth_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sorp_auth TO sorp_auth_runtime;

-- Better Auth and application tables need writes; the audit table only accepts
-- new events. Database triggers additionally block owner-side row changes.
REVOKE UPDATE, DELETE ON sorp_auth.audit_event FROM sorp_auth_runtime;

COMMIT;

-- Verify this role has no membership or object grants in research_console or
-- public before using its credential. Do not grant it CREATE on any schema.
