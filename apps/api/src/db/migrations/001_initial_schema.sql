-- 001_initial_schema.sql
-- Voicio initial database schema
-- Requires PostgreSQL 13+ (gen_random_uuid)

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- USERS & AUTH
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'member',
  token       TEXT        NOT NULL UNIQUE,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_invites_email ON invites (email);

CREATE TABLE password_reset_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PROJECTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE projects (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DATASET
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE dataset_rows (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  row_index            INTEGER     NOT NULL,
  text_to_analyze      JSONB       NOT NULL DEFAULT '{}',
  aux_values           JSONB       NOT NULL DEFAULT '{}',
  translated_text      JSONB       NOT NULL DEFAULT '{}',
  duplicates_group_key TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dataset_rows_project_id   ON dataset_rows (project_id);
CREATE INDEX idx_dataset_rows_project_row  ON dataset_rows (project_id, row_index);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TOPICS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE topic_collections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text_column_id    TEXT        NOT NULL,
  language          TEXT        NOT NULL DEFAULT 'en',
  sentiment_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, text_column_id)
);

CREATE INDEX idx_topic_collections_project_id ON topic_collections (project_id);

CREATE TABLE topic_categories (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID    NOT NULL REFERENCES topic_collections(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_topic_categories_collection_id ON topic_categories (collection_id);

CREATE TABLE topics (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID    NOT NULL REFERENCES topic_categories(id) ON DELETE CASCADE,
  label             TEXT    NOT NULL,
  description       TEXT,
  sentiment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sentiment_labels  JSONB   NOT NULL DEFAULT '{}',
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_topics_category_id ON topics (category_id);

CREATE TABLE topic_assignments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  row_id     UUID        NOT NULL REFERENCES dataset_rows(id) ON DELETE CASCADE,
  topic_id   UUID        NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  sentiment  TEXT,
  source     TEXT        NOT NULL DEFAULT 'ai',
  reviewed   BOOLEAN     NOT NULL DEFAULT FALSE,
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (row_id, topic_id)
);

CREATE INDEX idx_topic_assignments_project_id ON topic_assignments (project_id);
CREATE INDEX idx_topic_assignments_row_id     ON topic_assignments (row_id);
CREATE INDEX idx_topic_assignments_topic_id   ON topic_assignments (topic_id);
CREATE INDEX idx_topic_assignments_reviewed   ON topic_assignments (project_id, reviewed);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SMART COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE smart_columns (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  output_type    TEXT        NOT NULL DEFAULT 'text',
  compute_type   TEXT        NOT NULL DEFAULT 'mapping',
  source_columns JSONB       NOT NULL DEFAULT '[]',
  config         JSONB       NOT NULL DEFAULT '{}',
  status         TEXT        NOT NULL DEFAULT 'draft',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smart_columns_project_id ON smart_columns (project_id);

CREATE TABLE smart_column_values (
  row_id          UUID        NOT NULL REFERENCES dataset_rows(id) ON DELETE CASCADE,
  smart_column_id UUID        NOT NULL REFERENCES smart_columns(id) ON DELETE CASCADE,
  value           JSONB,
  confidence      REAL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (row_id, smart_column_id)
);

CREATE INDEX idx_smart_column_values_smart_column_id ON smart_column_values (smart_column_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE reports (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  mode                TEXT        NOT NULL DEFAULT 'edit',
  share_enabled       BOOLEAN     NOT NULL DEFAULT FALSE,
  share_token         TEXT        UNIQUE,
  share_password_hash TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_project_id  ON reports (project_id);
CREATE INDEX idx_reports_share_token ON reports (share_token) WHERE share_token IS NOT NULL;

CREATE TABLE report_views (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID    NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  filters    JSONB   NOT NULL DEFAULT '[]',
  segments   JSONB   NOT NULL DEFAULT '[]',
  date_range JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_report_views_report_id ON report_views (report_id);

CREATE TABLE report_sections (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID    NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_report_sections_report_id ON report_sections (report_id);

CREATE TABLE insight_elements (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID    NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,
  config     JSONB   NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_insight_elements_section_id ON insight_elements (section_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORT SHARE SETTINGS (reports.ts public/embed toggles)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE report_share_settings (
  report_id      UUID        PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
  public_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  embed_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  password_hash  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE report_permissions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT        NOT NULL DEFAULT 'view',
  granted_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

CREATE INDEX idx_report_permissions_report_id ON report_permissions (report_id);
CREATE INDEX idx_report_permissions_user_id   ON report_permissions (user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- JOBS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE jobs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'queued',
  progress   REAL        NOT NULL DEFAULT 0,
  payload    JSONB       NOT NULL DEFAULT '{}',
  dedupe_key TEXT,
  result_ref TEXT,
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_project_id           ON jobs (project_id);
CREATE INDEX idx_jobs_project_type_dedupe  ON jobs (project_id, type, dedupe_key);
CREATE INDEX idx_jobs_status               ON jobs (status);
CREATE INDEX idx_jobs_project_type_payload ON jobs (project_id, type) WHERE status IN ('queued', 'running');

-- ═══════════════════════════════════════════════════════════════════════════════
-- INSIGHT ANSWERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE insight_answers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_id       UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  question     TEXT        NOT NULL,
  answer       TEXT        NOT NULL DEFAULT '',
  ai_generated BOOLEAN     NOT NULL DEFAULT TRUE,
  sample_size  INTEGER     NOT NULL DEFAULT 0,
  filters      JSONB       NOT NULL DEFAULT '[]',
  segments     JSONB       NOT NULL DEFAULT '[]',
  date_range   JSONB,
  view_id      UUID        REFERENCES report_views(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insight_answers_project_id ON insight_answers (project_id);
CREATE INDEX idx_insight_answers_job_id     ON insight_answers (job_id);

COMMIT;
