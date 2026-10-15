-- Add tenant ownership without changing existing personal report records.
ALTER TABLE sorp_auth.report_review
  ADD COLUMN organisation_id text REFERENCES sorp_auth.organisation(id) ON DELETE RESTRICT;
CREATE INDEX sorp_report_review_organisation_idx
  ON sorp_auth.report_review(organisation_id, created_at DESC)
  WHERE organisation_id IS NOT NULL;
