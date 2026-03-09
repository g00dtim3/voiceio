
# Figma → Frontend Mapping Specification
Version: 1.0
Audience: Frontend Engineers, Design System Maintainers, Product Designers
Purpose: Define the exact mapping between Figma design artifacts and frontend implementation to ensure consistent UI delivery.

---

# 1. Objective

This document explains how **design elements created in Figma translate into frontend code**.

It ensures:
- visual consistency
- predictable implementation
- reduced UI regressions
- clear communication between design and engineering

This spec defines mappings for:

- Figma Variables → Design Tokens
- Figma Components → React Components
- Figma Layout → CSS / Tailwind Layout
- Figma Variants → Component Props
- Figma States → UI States

---

# 2. Design Token Mapping

## 2.1 Figma Variables → CSS Variables

Design tokens defined in Figma variables must map directly to CSS variables.

Example:

Figma variable

```
color.background.surface
```

Code implementation

```
--bg-surface
```

Example mapping:

| Figma Variable | CSS Variable |
|----------------|--------------|
| color.background.app | --bg-app |
| color.background.surface | --bg-surface |
| color.text.primary | --text-primary |
| color.text.secondary | --text-secondary |
| color.border.default | --border-default |
| color.brand.primary | --color-brand-500 |

Rule:

**Figma variables must always be the source of truth.**

Do not hardcode hex values in components.

---

# 3. Typography Mapping

Figma typography styles map to CSS classes.

Example:

Figma text style

```
Heading / Page Title
Font: Inter
Weight: 600
Size: 28px
```

Code:

```
.text-page-title
```

Example CSS

```
.text-page-title {
  font-size: 28px;
  font-weight: 600;
}
```

Recommended Tailwind mapping:

| Figma Style | Tailwind |
|-------------|----------|
| Page Title | text-2xl font-semibold |
| Section Title | text-xl font-semibold |
| Card Title | text-lg font-semibold |
| Body | text-sm |
| Small | text-xs |

---

# 4. Layout Mapping

## 4.1 Figma Auto Layout → Flexbox

Figma Auto Layout properties translate to CSS flex.

Example

Figma

```
Auto Layout
Direction: Horizontal
Spacing: 16
Align: Center
```

Code

```
flex items-center gap-4
```

Common mappings:

| Figma | CSS |
|------|-----|
| Horizontal layout | flex |
| Vertical layout | flex-col |
| Spacing 8 | gap-2 |
| Spacing 16 | gap-4 |
| Align center | items-center |
| Space between | justify-between |

---

# 5. Component Mapping

## 5.1 Figma Component → React Component

Example

Figma component

```
Button / Primary
```

Code

```
<Button variant="primary" />
```

Mapping rules:

| Figma Component | React Component |
|-----------------|----------------|
| Button | Button |
| Chip | Chip |
| Dialog | Dialog |
| Table | DataTable |
| Card | Card |
| Metric Card | MetricCard |

---

# 6. Variant Mapping

Figma variants must translate into component props.

Example:

Figma

```
Button
Variant: Primary
Size: Medium
State: Default
```

Code

```
<Button variant="primary" size="md" />
```

Variant mapping table:

| Figma Variant | React Prop |
|---------------|-----------|
| Variant | variant |
| Size | size |
| State | state |
| Tone | tone |

---

# 7. Interaction Mapping

## Hover

Figma hover state → CSS :hover

Example

```
hover:bg-brand-600
```

## Focus

Figma focus state → CSS focus-visible

Example

```
focus-visible:ring-2
```

## Disabled

Figma disabled state → component prop

```
<Button disabled />
```

---

# 8. Screen Layout Mapping

## Topics Screen

Figma layout

```
| Row Browser | Context Panel |
```

Code layout

```
grid grid-cols-[1fr_420px]
```

## Smart Columns

Figma

```
| Config | Preview |
```

Code

```
grid grid-cols-2 gap-6
```

## Reporting

Figma

```
| Sidebar | Canvas |
```

Code

```
grid grid-cols-[260px_1fr]
```

---

# 9. Icon Mapping

Icons in Figma use **Lucide icon set**.

Mapping rule:

```
icon-name → lucide-react import
```

Example

```
import { Plus } from "lucide-react"
```

---

# 10. Chart Mapping

Charts in Figma correspond to **ECharts configuration**.

Example:

Figma component

```
Horizontal Bar Chart
```

Code wrapper

```
<ChartFrame>
  <HorizontalBarChart data={data} />
</ChartFrame>
```

Chart tokens:

| Purpose | Token |
|-------|------|
| axis text | text-secondary |
| grid lines | border-default |
| tooltip background | bg-surface |
| chart palette | category palette |

---

# 11. State Mapping

Figma states must correspond to component states.

Example:

| Figma State | Implementation |
|--------------|---------------|
| Loading | <LoadingState /> |
| Empty | <EmptyState /> |
| Error | <ErrorState /> |
| Disabled | disabled prop |
| Selected | selected prop |

---

# 12. Naming Conventions

## Figma naming

Use structured naming:

```
Component / Variant / Size
```

Example

```
Button / Primary / Medium
Chip / Topic
Card / Metric
```

## Code naming

React components must follow:

```
PascalCase
```

Example

```
TopicRowItem
SmartColumnPreviewPanel
InsightResponseCard
```

---

# 13. Versioning Rules

When a design change happens:

1. Update Figma component
2. Update token or variant
3. Update Storybook component
4. Update React component if needed
5. QA both light and dark mode

---

# 14. QA Checklist

Before merging UI code:

- tokens used instead of hex colors
- layout matches Figma spacing
- component states implemented
- hover and focus states implemented
- dark mode validated
- accessibility labels present

---

# 15. Definition of Done

Design integration is complete when:

- visual match with Figma reference
- tokens used consistently
- Storybook stories updated
- responsive behavior validated
- UI tested in both themes

---

# 16. Final Rule

**Figma is the visual source of truth.  
Tokens are the styling source of truth.  
React components are the implementation layer.**
