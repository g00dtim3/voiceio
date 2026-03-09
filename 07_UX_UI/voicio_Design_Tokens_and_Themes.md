
# Design Tokens and Theme Specification
Version: 1.0  
Audience: Frontend Engineering, Design  
Purpose: Implement a consistent light/dark design layer for all modules.

---

# 1. Token strategy

Use three levels:
1. **Core tokens**: raw colors, spacing, typography, radius, shadows
2. **Semantic tokens**: background, text, border, chart, status, sentiment
3. **Component tokens**: button, chip, card, panel, modal, table, input

Use CSS variables as the runtime source of truth.  
Map Tailwind utilities to these variables where helpful.

---

# 2. Core color tokens

## 2.1 Light mode

### Brand
- `--color-brand-500: #2563EB`
- `--color-brand-600: #1E4ED8`
- `--color-brand-700: #1D4ED8`

### Neutral
- `--color-neutral-0: #FFFFFF`
- `--color-neutral-25: #FCFCFD`
- `--color-neutral-50: #F8FAFC`
- `--color-neutral-100: #F1F5F9`
- `--color-neutral-200: #E5E7EB`
- `--color-neutral-300: #D1D5DB`
- `--color-neutral-500: #6B7280`
- `--color-neutral-700: #374151`
- `--color-neutral-900: #111827`

### Status
- `--color-success-500: #10B981`
- `--color-warning-500: #F59E0B`
- `--color-danger-500: #EF4444`
- `--color-info-500: #2563EB`

### Sentiment
- `--color-sentiment-positive: #22C55E`
- `--color-sentiment-neutral: #FACC15`
- `--color-sentiment-negative: #EF4444`

## 2.2 Dark mode

### Brand
- `--color-brand-500: #3B82F6`
- `--color-brand-600: #2563EB`
- `--color-brand-700: #1D4ED8`

### Neutral
- `--color-neutral-0: #0F172A`
- `--color-neutral-25: #111827`
- `--color-neutral-50: #1E293B`
- `--color-neutral-100: #273449`
- `--color-neutral-200: #334155`
- `--color-neutral-300: #475569`
- `--color-neutral-500: #94A3B8`
- `--color-neutral-700: #CBD5E1`
- `--color-neutral-900: #F8FAFC`

### Status
- `--color-success-500: #34D399`
- `--color-warning-500: #FBBF24`
- `--color-danger-500: #F87171`
- `--color-info-500: #60A5FA`

### Sentiment
- `--color-sentiment-positive: #34D399`
- `--color-sentiment-neutral: #FCD34D`
- `--color-sentiment-negative: #F87171`

---

# 3. Semantic tokens

## 3.1 Light mode semantic mapping
- `--bg-app: var(--color-neutral-50)`
- `--bg-surface: var(--color-neutral-0)`
- `--bg-surface-subtle: var(--color-neutral-25)`
- `--bg-muted: var(--color-neutral-100)`
- `--bg-hover: rgba(37, 99, 235, 0.06)`

- `--text-primary: var(--color-neutral-900)`
- `--text-secondary: var(--color-neutral-500)`
- `--text-muted: var(--color-neutral-500)`
- `--text-inverse: #FFFFFF`

- `--border-default: var(--color-neutral-200)`
- `--border-strong: var(--color-neutral-300)`

- `--icon-default: var(--color-neutral-700)`
- `--icon-muted: var(--color-neutral-500)`

## 3.2 Dark mode semantic mapping
- `--bg-app: #0B1220`
- `--bg-surface: var(--color-neutral-50)`
- `--bg-surface-subtle: #182234`
- `--bg-muted: #162033`
- `--bg-hover: rgba(59, 130, 246, 0.14)`

- `--text-primary: #F1F5F9`
- `--text-secondary: #94A3B8`
- `--text-muted: #7C8AA0`
- `--text-inverse: #0F172A`

- `--border-default: #334155`
- `--border-strong: #475569`

- `--icon-default: #CBD5E1`
- `--icon-muted: #94A3B8`

---

# 4. Typography tokens

## 4.1 Font families
- `--font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

## 4.2 Font sizes
- `--text-xs: 12px`
- `--text-sm: 14px`
- `--text-md: 16px`
- `--text-lg: 18px`
- `--text-xl: 22px`
- `--text-2xl: 28px`

## 4.3 Font weights
- `--font-regular: 400`
- `--font-medium: 500`
- `--font-semibold: 600`

## 4.4 Line heights
- `--leading-tight: 1.25`
- `--leading-normal: 1.5`
- `--leading-relaxed: 1.6`

### Recommended usage
- page title: `28px / 600`
- section title: `22px / 600`
- card title: `18px / 600`
- body: `14px / 400`
- help text: `12px / 400`

---

# 5. Spacing, radius, and shadow tokens

## 5.1 Spacing
- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-5: 20px`
- `--space-6: 24px`
- `--space-8: 32px`
- `--space-10: 40px`
- `--space-12: 48px`

## 5.2 Radius
- `--radius-sm: 8px`
- `--radius-md: 12px`
- `--radius-lg: 16px`
- `--radius-pill: 9999px`

## 5.3 Shadow
- `--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06)`
- `--shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08)`
- `--shadow-lg: 0 10px 24px rgba(15, 23, 42, 0.12)`

Dark mode may reduce shadow usage and rely more on border contrast.

---

# 6. Component token recommendations

## 6.1 Button
### Primary
- background: `--color-brand-500`
- text: `--text-inverse`
- hover: `--color-brand-600`
- radius: `--radius-sm`
- padding: `10px 16px`

### Secondary
- background: transparent
- text: `--text-primary`
- border: `--border-default`
- hover background: `--bg-muted`

### Destructive
- background: `--color-danger-500`
- text: white

## 6.2 Card / panel
- background: `--bg-surface`
- border: `1px solid var(--border-default)`
- radius: `--radius-md`
- shadow: `--shadow-sm`

## 6.3 Input
- background: `--bg-surface`
- border: `1px solid var(--border-default)`
- text: `--text-primary`
- placeholder: `--text-muted`
- focus ring: brand 500 with 2px visible outline

## 6.4 Chip / tag
- height: `28px`
- radius: `--radius-pill`
- padding: `0 10px`
- font: `--text-xs` to `--text-sm`
- category chips must support custom background tint

## 6.5 Modal
- surface: `--bg-surface`
- overlay: `rgba(15, 23, 42, 0.40)` in light mode
- overlay: `rgba(2, 6, 23, 0.65)` in dark mode
- radius: `--radius-lg`
- max-width default: `640px`

## 6.6 Table
- header background: `--bg-surface-subtle`
- row border: `--border-default`
- selected row background: brand tint
- hover row background: `--bg-hover`

---

# 7. Chart palette and visual rules

## 7.1 Category palette
Recommended category palette:
1. blue `#3B82F6`
2. purple `#8B5CF6`
3. teal `#14B8A6`
4. orange `#F97316`
5. indigo `#6366F1`
6. emerald `#10B981`
7. rose `#F43F5E`
8. amber `#F59E0B`

## 7.2 Sentiment colors
- positive: green
- neutral: yellow
- negative: red

These must not change meaning between light and dark mode.

## 7.3 Chart implementation rules
- always provide title and legend when ambiguity is possible
- tooltips must use theme surface and text tokens
- axis labels use secondary text color
- grid lines remain subtle
- chart backgrounds should be transparent within a card frame

---

# 8. Theme implementation model

## 8.1 CSS architecture
Use:
- `:root` for light tokens
- `[data-theme="dark"]` for dark overrides

## 8.2 Suggested CSS structure

```css
:root {
  --bg-app: #F8FAFC;
  --bg-surface: #FFFFFF;
  --text-primary: #111827;
}

[data-theme="dark"] {
  --bg-app: #0B1220;
  --bg-surface: #1E293B;
  --text-primary: #F1F5F9;
}
```

## 8.3 Frontend behavior
- theme stored in user preference
- theme controlled via `next-themes`
- charts re-render or rebind options when theme changes

---

# 9. Figma-to-code mapping rules

- core tokens map to Figma variables and CSS variables
- semantic tokens are the integration layer between design and code
- component tokens should be used only when a component requires stable visual behavior
- do not hardcode hex values inside business components
- use utility helpers or theme primitives instead of ad hoc styles

---

# 10. Minimum deliverables for design integration

Frontend team should have:
- tokens JSON
- this theme spec
- Storybook theme switch
- light/dark screenshot baseline for key screens:
  - Topics
  - Smart Columns
  - Insight Agent
  - Reporting
