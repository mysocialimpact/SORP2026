-- Audit rows must remain append-only even if an application path accidentally
-- attempts an update or deletion. A database owner can still alter this control;
-- the web runtime must use a separate role without DDL privileges.
-- Retain the historic actor ID if an account is later removed. The old FK's
-- ON DELETE SET NULL would rewrite evidence and conflict with this control.
ALTER TABLE sorp_auth.audit_event DROP CONSTRAINT audit_event_actor_user_id_fkey;

CREATE FUNCTION sorp_auth.reject_audit_event_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SORP audit events are append-only';
END;
$$;

CREATE TRIGGER audit_event_no_update_or_delete
  BEFORE UPDATE OR DELETE ON sorp_auth.audit_event
  FOR EACH ROW EXECUTE FUNCTION sorp_auth.reject_audit_event_change();

CREATE TRIGGER audit_event_no_truncate
  BEFORE TRUNCATE ON sorp_auth.audit_event
  FOR EACH STATEMENT EXECUTE FUNCTION sorp_auth.reject_audit_event_change();
