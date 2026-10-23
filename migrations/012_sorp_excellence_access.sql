-- Independent SORP organisations start with the free maturity assessment.
-- A verified founder can enable later stages and pillars explicitly.
ALTER TABLE sorp_auth.organisation
  ADD COLUMN excellence_access jsonb NOT NULL DEFAULT '{"stages":{"maturity":true,"diagnostic":false,"blueprint":false,"roadmap":false,"excellence":false},"pillars":{"purpose":false,"leadership":false,"data":false,"delivery":false,"communications":false}}'::jsonb;
