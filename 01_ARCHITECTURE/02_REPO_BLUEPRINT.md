# Repo Blueprint

## Recommended mono-repo layout
apps/
  web/ (Next.js)
  api/ (Node REST)
packages/
  shared/ (types, zod schemas, tokens, generated client)

## FE conventions
- TanStack Query for data + job polling
- Zustand only for ephemeral UI state
- Tables virtualized (TanStack Table + Virtual)
- Charts ECharts wrapped by ChartFrame

## API conventions
- REST resource style
- Pagination on lists
- Unified error envelope
