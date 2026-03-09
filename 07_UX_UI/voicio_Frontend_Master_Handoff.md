
# Frontend Implementation Master Handoff
Version: 1.0
Audience: Frontend Engineers, Tech Leads, Product, Design
Purpose: Single reference document consolidating the UI/UX playbook, architecture, components, tokens, and API alignment for implementing the Caplena frontend.

---

# 1. Objective

This document is the **master handoff** for building the Caplena frontend.

It consolidates:
- UI/UX principles
- Design tokens and themes
- Component architecture
- Screen composition rules
- Frontend architecture and repo structure
- Required packages
- API contracts alignment
- Engineering guardrails

The goal is to allow a frontend team to **build the product without ambiguity**.

---

# 2. Product Modules

The platform consists of four primary modules.

1. Topics & Sentiment
2. Smart Columns
3. Insight Agent
4. Reporting

Supporting layers:
- Dataset / Row Browser
- Sharing & Permissions
- Global navigation and layout

---

# 3. Global Application Layout

Base layout:

| Sidebar | Module Nav | Main Content | Context Panel |

Optional additions:
- Bottom dock (Insight Agent)
- Builder canvas (Reporting)

Recommended widths:
- Sidebar: 72px
- Secondary nav: 240px
- Context panel: 420–520px
- Content max width: 1440px

Spacing scale:
- base unit: 8px

---

# 4. Design System Overview

## Theme modes

The application supports:

- Light mode
- Dark mode

Themes are implemented via **CSS variables**.

Example:

```
:root {
  --bg-app: #F8FAFC;
  --text-primary: #111827;
}

[data-theme="dark"] {
  --bg-app: #0B1220;
  --text-primary: #F1F5F9;
}
```

Theme switching should use **next-themes**.

---

# 5. Typography

Font family:

Inter, system UI fallback.

Sizes:

| Usage | Size |
|------|------|
| Page title | 28px |
| Section title | 22px |
| Card title | 18px |
| Body | 14px |
| Small text | 12px |

Font weights:

- 400 regular
- 500 medium
- 600 semibold

---

# 6. Spacing and Layout Tokens

Spacing scale:

| Token | Value |
|-----|------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-6 | 24px |
| space-8 | 32px |
| space-12 | 48px |

Radius:

| Token | Value |
|------|------|
| radius-sm | 8px |
| radius-md | 12px |
| radius-lg | 16px |

---

# 7. Core UI Components

## Navigation

Components:

- AppShell
- SidebarNav
- SidebarNavItem
- TopBarActions

## Inputs

- TextInput
- Textarea
- Select
- MultiSelectChips
- Toggle
- Checkbox

## Feedback

- LoadingState
- EmptyState
- ErrorState
- Toast

## Containers

- Card
- SectionCard
- Dialog
- Drawer
- ChartFrame

## Data display

- DataTable
- VirtualizedRowList
- MetricCard
- Chip

---

# 8. Topics Module Implementation

Layout:

| Row Browser | Context Panel |

Main components:

- TopicRowBrowser
- TopicCollectionEditor
- AITopicSuggestionPanel
- AIQualityScorePanel

Row item features:

- checkbox
- text
- topic chips
- sentiment indicator
- reviewed indicator

States:

- default
- selected
- reviewed
- loading

---

# 9. Smart Columns Module

Flow:

configure → preview → compute

Components:

- SmartColumnsOverview
- SmartColumnTypePicker
- SmartColumnConfigForm
- SmartColumnPreviewPanel
- SmartColumnJobStatus

Critical UX rule:

Preview must always happen before full computation.

---

# 10. Insight Agent

Layout:

Report canvas + conversational dock.

Components:

- InsightAgentDock
- InsightResponseCard

Response structure:

- title
- narrative
- chart
- rows analyzed
- suggested follow-up questions

---

# 11. Reporting Module

Layout:

| Reports Sidebar | Report Canvas |

Components:

- ReportsSidebar
- ReportCanvas
- ReportSection
- InsightElementRenderer
- ShareReportDialog

Capabilities:

- drag-and-drop sections
- drag-and-drop elements
- edit vs preview mode

---

# 12. Standard UI States

All screens must support:

- Loading
- Empty
- Error
- Success
- Disabled
- Read-only

No feature is considered complete without these states.

---

# 13. Frontend Architecture

Recommended stack:

- Next.js
- React
- TypeScript
- Tailwind
- shadcn/ui
- Radix UI
- TanStack Query
- TanStack Table
- Zustand
- ECharts

---

# 14. Repository Structure

Feature-first architecture.

```
src/
  app/
  features/
    topics/
    smart-columns/
    reports/
    insight-agent/
  shared/
    ui/
    api/
    hooks/
    styles/
```

Rules:

- shared/ui has **no business logic**
- features own their API adapters

---

# 15. API Integration Strategy

Use **OpenAPI generated types**.

Core endpoints:

Topics
Smart Columns
Insight Agent
Reports
Sharing
Rows

All responses follow:

```
{
  "items": [],
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 200
  }
}
```

Standard error:

```
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

# 16. Engineering Guardrails

Frontend engineers must follow these rules:

1. No hardcoded colors.
2. Use tokens everywhere.
3. No business logic in shared components.
4. All async screens need loading/empty/error states.
5. Filters and segments live in URL state.
6. Charts are rendered only inside ChartFrame.
7. Components must support light and dark themes.

---

# 17. Development Milestones

## Phase 1

Foundations

- app shell
- tokens
- shared components
- table
- dialog
- charts

## Phase 2

Core modules

- Topics
- Smart Columns

## Phase 3

Advanced modules

- Reporting
- Insight Agent
- Sharing

---

# 18. Definition of Done

A screen is done when:

- design tokens are used
- dark mode works
- loading state exists
- empty state exists
- error state exists
- responsive layout works
- design and engineering review match

---

# 19. Final Deliverables for Frontend Team

The full frontend handoff consists of:

1. Frontend Packages list
2. Repo Template
3. API Contracts
4. UI/UX Playbook
5. Design Tokens & Themes
6. UI Component Catalog
7. Design Integration Guidelines
8. **This Master Implementation Document**
