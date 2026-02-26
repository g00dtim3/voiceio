-- 002: Topics domain constraints
-- Needed for ON CONFLICT upserts in topic_assignments

-- Unique constraint: a row can only be assigned to a given topic once
ALTER TABLE topic_assignments
  ADD CONSTRAINT topic_assignments_row_topic_uq UNIQUE (row_id, topic_id);

-- Index for focus-mode query: non-reviewed assignments sorted by confidence
CREATE INDEX topic_assignments_unreviewed_idx
  ON topic_assignments (project_id, reviewed, confidence ASC NULLS LAST)
  WHERE reviewed = false;

-- Grant privileges to the application user on new objects
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE topic_assignments TO voiceio;
