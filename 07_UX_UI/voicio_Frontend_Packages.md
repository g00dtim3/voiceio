
# Frontend Package List
Version: 1.0

## Runtime

```json
{
  "name": "caplena-web",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.11.0",
    "pnpm": ">=9.15.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "prepare": "husky",
    "mock": "msw init public/ --save",
    "gen:api": "openapi-typescript ./openapi/openapi.yaml -o ./src/shared/api/generated/schema.ts",
    "gen:tokens": "token-transformer ./tokens/tokens.json ./src/shared/styles/tokens.css",
    "check": "pnpm lint && pnpm typecheck && pnpm test"
  }
}
```

## Production dependencies

```json
{
  "dependencies": {
    "@dnd-kit/core": "6.3.1",
    "@dnd-kit/modifiers": "9.0.0",
    "@dnd-kit/sortable": "10.0.0",
    "@hookform/resolvers": "3.10.0",
    "@radix-ui/react-accordion": "1.2.3",
    "@radix-ui/react-alert-dialog": "1.1.6",
    "@radix-ui/react-avatar": "1.1.3",
    "@radix-ui/react-checkbox": "1.1.4",
    "@radix-ui/react-dialog": "1.1.6",
    "@radix-ui/react-dropdown-menu": "2.1.6",
    "@radix-ui/react-hover-card": "1.1.6",
    "@radix-ui/react-label": "2.1.2",
    "@radix-ui/react-popover": "1.1.6",
    "@radix-ui/react-progress": "1.1.2",
    "@radix-ui/react-scroll-area": "1.2.3",
    "@radix-ui/react-select": "2.1.6",
    "@radix-ui/react-separator": "1.1.2",
    "@radix-ui/react-slot": "1.1.2",
    "@radix-ui/react-switch": "1.1.3",
    "@radix-ui/react-tabs": "1.1.3",
    "@radix-ui/react-toast": "1.2.6",
    "@radix-ui/react-tooltip": "1.1.8",
    "@tanstack/react-query": "5.66.0",
    "@tanstack/react-query-devtools": "5.66.0",
    "@tanstack/react-table": "8.21.2",
    "@tanstack/react-virtual": "3.11.2",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "date-fns": "4.1.0",
    "echarts": "5.6.0",
    "echarts-for-react": "3.0.2",
    "lucide-react": "0.475.0",
    "next": "15.1.6",
    "next-themes": "0.4.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-hook-form": "7.54.2",
    "sonner": "2.0.1",
    "tailwind-merge": "2.6.0",
    "zod": "3.24.1",
    "zustand": "5.0.3"
  }
}
```

## Development dependencies

```json
{
  "devDependencies": {
    "@eslint/eslintrc": "3.2.0",
    "@playwright/test": "1.50.1",
    "@storybook/addon-a11y": "8.5.3",
    "@storybook/addon-essentials": "8.5.3",
    "@storybook/addon-interactions": "8.5.3",
    "@storybook/addon-links": "8.5.3",
    "@storybook/blocks": "8.5.3",
    "@storybook/nextjs": "8.5.3",
    "@storybook/react": "8.5.3",
    "@tailwindcss/postcss": "4.0.6",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.2.0",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "22.13.1",
    "@types/react": "19.0.8",
    "@types/react-dom": "19.0.3",
    "@vitejs/plugin-react": "4.4.1",
    "autoprefixer": "10.4.20",
    "eslint": "9.19.0",
    "eslint-config-next": "15.1.6",
    "eslint-config-prettier": "10.0.1",
    "husky": "9.1.7",
    "jsdom": "26.0.0",
    "msw": "2.7.0",
    "openapi-typescript": "7.5.2",
    "postcss": "8.5.1",
    "prettier": "3.4.2",
    "tailwindcss": "4.0.6",
    "token-transformer": "0.0.32",
    "typescript": "5.7.3",
    "vitest": "3.0.5"
  }
}
```

## Optional dependency

```json
{
  "dependencies": {
    "@sentry/nextjs": "8.50.0"
  }
}
```

## Recommended git hooks

### `.husky/pre-commit`

```bash
pnpm format:check
pnpm lint
```

### `.husky/pre-push`

```bash
pnpm typecheck
pnpm test
```
