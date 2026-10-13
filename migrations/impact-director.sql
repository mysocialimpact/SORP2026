-- Isolated product records; never read or modify legacy SORP/SIE progress.
CREATE SCHEMA IF NOT EXISTS msi_products;
CREATE TABLE IF NOT EXISTS msi_products.impact_director (
  account_id text PRIMARY KEY,
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON SCHEMA msi_products FROM PUBLIC;
REVOKE ALL ON msi_products.impact_director FROM PUBLIC;
GRANT USAGE ON SCHEMA msi_products TO sorp_console_runtime;
GRANT SELECT, INSERT, UPDATE ON msi_products.impact_director TO sorp_console_runtime;
