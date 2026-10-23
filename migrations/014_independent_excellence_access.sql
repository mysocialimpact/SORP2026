-- Independent SORP workspaces keep their own Excellence permissions.
ALTER TABLE sorp_auth.organisation
  ADD COLUMN IF NOT EXISTS excellence_access jsonb NOT NULL DEFAULT
  '{"stages":{"maturity":true,"diagnostic":false,"blueprint":false,"roadmap":false,"excellence":false},"pillars":{"purpose":false,"leadership":false,"data":false,"delivery":false,"communications":false}}'::jsonb;
