-- Applied only to the existing isolated validation branch, not a production DB.
-- The deployment role receives EXECUTE on allocate only; passwords live in
-- branch-scoped Vercel secrets and never in source or browser metadata.
CREATE SCHEMA IF NOT EXISTS sorp_build_metadata;
CREATE TABLE IF NOT EXISTS sorp_build_metadata.counter (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  value integer NOT NULL CHECK (value >= 20)
);
INSERT INTO sorp_build_metadata.counter (id, value) VALUES (true, 20)
  ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS sorp_build_metadata.deployments (
  deployment_id text PRIMARY KEY,
  number integer UNIQUE NOT NULL,
  deployed_at timestamptz NOT NULL,
  environment text NOT NULL
);
CREATE OR REPLACE FUNCTION sorp_build_metadata.allocate(deployment text, environment text)
RETURNS TABLE(number integer, deployed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, sorp_build_metadata AS $$
DECLARE next_number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(20262021);
  RETURN QUERY SELECT d.number, d.deployed_at
    FROM sorp_build_metadata.deployments d WHERE d.deployment_id = deployment;
  IF FOUND THEN RETURN; END IF;
  UPDATE sorp_build_metadata.counter c SET value = c.value + 1 WHERE id = true
    RETURNING value INTO next_number;
  RETURN QUERY INSERT INTO sorp_build_metadata.deployments AS d
    VALUES (deployment, next_number, clock_timestamp(), environment)
    RETURNING d.number, d.deployed_at;
END $$;
REVOKE ALL ON FUNCTION sorp_build_metadata.allocate(text, text) FROM PUBLIC;
-- Existing restricted deployment role:
-- GRANT USAGE ON SCHEMA sorp_build_metadata TO <build_role>;
-- GRANT EXECUTE ON FUNCTION sorp_build_metadata.allocate(text,text) TO <build_role>;
-- No table grants are needed.
