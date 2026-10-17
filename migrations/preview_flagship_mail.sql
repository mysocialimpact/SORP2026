-- PREVIEW ONLY. Never apply to production. Real authentication, test email transport.
CREATE TABLE sorp_auth.preview_mail (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 recipient text NOT NULL CHECK (recipient ~ '^[a-z0-9._+-]+@example\.invalid$'),
 kind text NOT NULL CHECK (kind IN ('verify','reset')),
 link text NOT NULL,
 draft_id text NOT NULL CHECK (draft_id ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX preview_mail_draft ON sorp_auth.preview_mail(draft_id,recipient,created_at DESC);
