-- 005: Sharing domain
--
-- GWT S1: "Given user enables public share
--          When someone opens /r/:token
--          Then they can view the report
--          And if password enabled, they must enter it before viewing"
--
-- GWT S2: "Given a user has org role viewer
--          When they are granted edit permission on a report they do not own
--          Then they can edit that report, but remain viewer elsewhere"

-- ── Share-link columns on reports ───────────────────────────────────────────
ALTER TABLE reports
  ADD COLUMN share_enabled       boolean  NOT NULL DEFAULT false,
  ADD COLUMN share_token         text     UNIQUE,
  ADD COLUMN share_password_hash text;

-- ── Per-report permission grants (additive, for viewer role) ────────────────
CREATE TABLE report_permissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id     text        NOT NULL,
  permission  text        NOT NULL CHECK (permission IN ('view', 'edit')),
  granted_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

CREATE INDEX idx_report_permissions_report_id ON report_permissions(report_id);
CREATE INDEX idx_report_permissions_user_id   ON report_permissions(user_id);
