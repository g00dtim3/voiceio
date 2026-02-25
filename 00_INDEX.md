# voice.io Platform — Code-Gen Delegation Package v2
Generated: 2026-02-25

## What this package is
A **code-generation oriented** documentation set. A code-gen AI can implement the platform
without inventing product logic. Remaining unknowns are isolated in `99_TODOS_AND_AMBIGUITIES.md`.

## Golden path (must work end-to-end)
1. Create project → import dataset (file/paste/API)
2. Start analysis → generate initial topic collection (MECE)
3. Fine-tune in Topics view (focus mode, review, bulk edits)
4. Create smart column (LLM) → preview → confirm → fill
5. Create report → add insight elements → views (saved filters) → preview/edit
6. Share report (internal permissions + public view-only link)
7. Insight Agent asks/answers using active filters; can attach chart-spec outputs

## Non-negotiables
- Modular monolith (single API service + Next.js web)
- URL is source of truth: filters/segments/dateRange/viewId
- Heavy compute is async via Jobs (polling first)
- All screens implement loading / empty / error / success
- Human-in-the-loop AI: AI outputs editable + traceable + recomputable

## Implementation order
1) DB migrations (`03_DB/migrations/*.sql`)
2) API from `02_API/openapi.yaml` (generate client)
3) Jobs & worker (`04_JOBS/*`)
4) Frontend shell (`05_FRONTEND/*`)
5) Domains (`06_DOMAINS/*`) in order: dataset → topics → smart-columns → reporting → sharing → insight-agent
6) Tests (`08_TESTING/*`)
