-- 006: Insight Agent domain
--
-- GWT: "Context uses active filters"
-- Given user is in a report with filters/segments/dateRange active
-- When user asks a question
-- Then the agent request includes those parameters
-- And the response is labeled AI-generated
-- And includes sample size (n=...)
--
-- When the worker finishes answering, it inserts a row here so that
-- GET /answers can return the labeled, AI-generated response with
-- the n= sample size.

CREATE TABLE insight_answers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_id       uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  question     text        NOT NULL,
  answer       text        NOT NULL,
  ai_generated boolean     NOT NULL DEFAULT TRUE,
  sample_size  integer     NOT NULL DEFAULT 0,
  filters      jsonb       NOT NULL DEFAULT '[]',
  segments     jsonb       NOT NULL DEFAULT '[]',
  date_range   jsonb,
  view_id      uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_insight_answers_project_id ON insight_answers(project_id);
CREATE INDEX idx_insight_answers_job_id     ON insight_answers(job_id);
