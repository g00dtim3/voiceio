# System Overview

## Product summary
AI-first qualitative analytics platform: open text → topics + sentiment → human review → smart columns → reports → sharing → insight agent.

## Architectural style
**Modular monolith**
- Web: Next.js (React/TS)
- API: Node/TS REST + OpenAPI
- Worker: async jobs (can be separate process)
- DB: PostgreSQL
- Optional Redis: queue/polling optimization

## Core dependency chain (strict)
Dataset → Topics → Smart Columns → Reporting → Insight Agent → Sharing

## Cross-cutting concerns
- Auth + roles + object ownership
- URL-driven filters/segments/dateRange/viewId
- Async job compute with idempotency
- Observability + audit
