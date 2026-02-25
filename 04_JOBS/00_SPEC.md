# Job System Spec

## Why
Topic generation/recompute + Smart Column preview/fill + Agent answers must be async.

## Statuses
queued → running → succeeded | failed | canceled

## Required job types
TOPIC_GENERATION, TOPIC_RECOMPUTE
SMART_COLUMN_PREVIEW, SMART_COLUMN_FILL
INSIGHT_AGENT_ASK

## Idempotency
Compute `dedupeKey=hash(type+normalizedPayload)`.
Return existing running/succeeded job for same key unless force.

## Frontend polling
Poll /projects/{projectId}/jobs/{jobId} every 1–2s while running.
Stop at terminal states.
