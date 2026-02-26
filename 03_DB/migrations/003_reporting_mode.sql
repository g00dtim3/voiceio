-- 003: Reporting domain — add mode column to reports
-- GWT S2: "When mode=preview → editing controls are hidden/disabled"
--         "When mode=edit   → user can add sections and insight elements, with autosave"

ALTER TABLE reports
  ADD COLUMN mode text NOT NULL DEFAULT 'edit'
    CHECK (mode IN ('preview', 'edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reports TO voiceio;
