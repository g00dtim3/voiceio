# API Examples

## Start analysis
POST /projects/{projectId}/topics/collections
{
  "textColumnId": "reason",
  "language": "en",
  "startMode": "scratch",
  "enableSentiment": true,
  "prompt": "Create MECE topics for NPS reasons."
}
→ 202 Job(TOPIC_GENERATION)

## Bulk mark reviewed
POST /projects/{projectId}/topics/review
{ "rowIds": ["..."], "reviewed": true }
→ 200 { ok: true }

## Smart column LLM preview/fill
POST /projects/{projectId}/smart-columns/{id}/preview → 202 Job
POST /projects/{projectId}/smart-columns/{id}/fill { "scope":"all" } → 202 Job

## Public share
POST /projects/{projectId}/reports/{reportId}/share
{ "publicEnabled": true, "embedEnabled": true, "password": "optional" }
→ 200 ShareSettings
