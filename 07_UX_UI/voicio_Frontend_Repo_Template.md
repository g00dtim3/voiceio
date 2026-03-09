
# Frontend Repo Template
Version: 1.0

## Recommended structure

```txt
caplena-web/
├─ .storybook/
│  ├─ main.ts
│  ├─ preview.ts
│  └─ manager.ts
├─ openapi/
│  └─ openapi.yaml
├─ public/
│  ├─ fonts/
│  ├─ icons/
│  └─ mockServiceWorker.js
├─ src/
│  ├─ app/
│  │  ├─ (app)/
│  │  │  ├─ projects/
│  │  │  │  └─ [projectId]/
│  │  │  │     ├─ page.tsx
│  │  │  │     ├─ topics/
│  │  │  │     │  └─ page.tsx
│  │  │  │     ├─ smart-columns/
│  │  │  │     │  ├─ page.tsx
│  │  │  │     │  └─ [smartColumnId]/
│  │  │  │     │     └─ page.tsx
│  │  │  │     ├─ reports/
│  │  │  │     │  └─ [reportId]/
│  │  │  │     │     └─ page.tsx
│  │  │  │     └─ insight-agent/
│  │  │  │        └─ page.tsx
│  │  ├─ r/
│  │  │  └─ [shareToken]/
│  │  │     ├─ page.tsx
│  │  │     └─ embed/
│  │  │        └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ globals.css
│  │  └─ providers.tsx
│  ├─ features/
│  │  ├─ topics/
│  │  │  ├─ api/
│  │  │  ├─ components/
│  │  │  ├─ hooks/
│  │  │  ├─ schemas/
│  │  │  ├─ screens/
│  │  │  ├─ store/
│  │  │  ├─ utils/
│  │  │  └─ index.ts
│  │  ├─ smart-columns/
│  │  ├─ reports/
│  │  ├─ insight-agent/
│  │  ├─ dataset/
│  │  ├─ sharing/
│  │  └─ auth/
│  ├─ shared/
│  │  ├─ api/
│  │  │  ├─ client.ts
│  │  │  ├─ fetcher.ts
│  │  │  ├─ generated/
│  │  │  └─ query-client.ts
│  │  ├─ config/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ state/
│  │  ├─ styles/
│  │  │  ├─ tokens.css
│  │  │  ├─ themes.css
│  │  │  └─ charts.css
│  │  ├─ types/
│  │  ├─ ui/
│  │  │  ├─ button/
│  │  │  ├─ chip/
│  │  │  ├─ data-table/
│  │  │  ├─ dialog/
│  │  │  ├─ empty-state/
│  │  │  ├─ filters/
│  │  │  ├─ layout/
│  │  │  ├─ loading/
│  │  │  ├─ chart-frame/
│  │  │  └─ index.ts
│  │  └─ utils/
│  ├─ test/
│  │  ├─ e2e/
│  │  ├─ fixtures/
│  │  ├─ mocks/
│  │  └─ utils/
│  └─ stories/
│     ├─ foundations/
│     ├─ shared/
│     └─ features/
├─ tokens/
│  └─ tokens.json
├─ .env.example
├─ .gitignore
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ tsconfig.json
└─ vitest.config.ts
```

## Architecture conventions

### 1. Feature-first
Each business domain contains:
- its API adapters
- its components
- its hooks
- its schemas
- its optional local store
- its utilities

### 2. `shared/ui` contains no business logic
`shared/ui` is limited to:
- design-system primitives
- reusable wrappers
- common visual patterns

No Topics, Reports, Smart Columns, or Agent rules in `shared/ui`.

### 3. URL is the source of truth for analytical state
The following state must live in the URL when relevant:
- `viewId`
- `segments`
- `filters`
- `dateRange`
- `sort`
- `page`

### 4. Contracts typed at the boundary
Use:
- OpenAPI-generated TypeScript types
- Zod validation for complex config payloads

### 5. One component, one responsibility
Examples:
- `TopicRowBrowser`
- `TopicCollectionEditor`
- `SmartColumnConfigForm`
- `InsightElementRenderer`

## Code conventions

### Naming
- React components: `PascalCase`
- hooks: `useCamelCase`
- helpers: `camelCase`
- constants: `UPPER_SNAKE_CASE`
- test files: `*.test.ts(x)` or `*.spec.ts(x)`

### Import order
1. external dependencies
2. `@/shared/*`
3. `@/features/*`
4. relative imports

### TypeScript aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/shared/*": ["src/shared/*"],
      "@/features/*": ["src/features/*"]
    }
  }
}
```

## UI implementation rules

- every complex screen must expose `LoadingState`, `EmptyState`, and `ErrorState`
- every modal must include header, body, footer
- every long-running job must expose status feedback
- every data-heavy view should support skeleton loading
- all filters and segments should be reproducible from URL state
