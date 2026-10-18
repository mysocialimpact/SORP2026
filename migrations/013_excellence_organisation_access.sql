-- Keep pre-existing organisations on their established access until a founder
-- explicitly manages them. New organisations start with the baseline only.
ALTER TABLE research_console.founder_organisations
  ADD COLUMN IF NOT EXISTS excellence_access jsonb;

ALTER TABLE research_console.founder_organisations
  ALTER COLUMN excellence_access SET DEFAULT
  '{"stages":{"maturity":true,"diagnostic":false,"blueprint":false,"roadmap":false,"excellence":false},"pillars":{"purpose":false,"leadership":false,"data":false,"delivery":false,"communications":false}}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='founder_excellence_access_shape') THEN
    ALTER TABLE research_console.founder_organisations
      ADD CONSTRAINT founder_excellence_access_shape CHECK (
        excellence_access IS NULL OR (
          jsonb_typeof(excellence_access) = 'object'
          AND jsonb_typeof(excellence_access->'stages') = 'object'
          AND jsonb_typeof(excellence_access->'pillars') = 'object'
        )
      );
  END IF;
END $$;
