
# Frontend Design Integration Guidelines
Version: 1.0  
Audience: Frontend Engineering, Design Systems, QA  
Purpose: Bridge the design layer and the implementation layer so the frontend can be coded consistently and reviewed reliably.

---

# 1. What engineering should receive from design

Minimum handoff package:
- page-level Figma files
- component library in Figma
- token sheet
- dark mode variables
- interaction notes for key flows
- empty/loading/error state references
- chart references with titles and legends
- responsive behaviors for desktop and tablet

If any of these are missing, engineering should block hardcoded styling decisions until clarified.

---

# 2. What engineering should implement first

## 2.1 Foundations
- theme provider
- app shell
- typography and spacing scale
- button/input/dialog/table primitives
- chart wrapper
- state primitives: loading, empty, error

## 2.2 Shared patterns
- chip system
- split-view layout
- section cards
- metric cards
- top action bars
- confirmation dialogs

## 2.3 Module scaffolding
- Topics shell
- Smart Columns shell
- Reporting shell
- Insight Agent dock shell

---

# 3. Design-to-code workflow

## Step 1 — Token implementation
- import token JSON into codebase
- expose CSS variables
- wire theme provider
- validate light and dark side by side

## Step 2 — Primitive components
Build and validate:
- Button
- Input
- Select
- Toggle
- Tabs
- Chip
- Dialog
- Table wrapper
- Toast
- Empty/Loading/Error states

## Step 3 — Layout primitives
Build:
- AppShell
- SecondarySidebar
- ContextPanel
- BottomDock
- PageHeader
- SectionCard
- ChartFrame

## Step 4 — Feature screens
Implement in this order:
1. Topics
2. Smart Columns
3. Reporting
4. Insight Agent

## Step 5 — QA pass
For each screen validate:
- light mode
- dark mode
- hover/focus states
- keyboard behavior
- empty/loading/error states
- long text / large dataset conditions

---

# 4. Theming checklist

For each component, verify:
- background token usage
- text token usage
- border token usage
- hover token usage
- focus visible state
- dark mode readability
- icon color consistency
- disabled state contrast

Mandatory snapshots:
- light default
- dark default
- hover
- focus
- disabled
- error if form-related

---

# 5. Interaction checklist

## Topics
- search response feels instant enough
- row selection remains visible
- reviewed action is obvious
- topic chips wrap correctly
- right panel tab switch is smooth
- AI suggestion accept/discard gives feedback

## Smart Columns
- create flow is understandable without training
- preview table is legible
- compute scope is obvious before execution
- job statuses update correctly
- reapply actions are clearly differentiated

## Insight Agent
- dock states feel distinct
- suggested follow-up is tappable/clickable and obvious
- answer content hierarchy is clear
- chart and narrative feel part of one response

## Reporting
- edit vs preview is obvious
- drag-and-drop affordance is visible
- empty sections guide action
- share modal separates internal and external access clearly

---

# 6. QA acceptance rules for UI delivery

A screen is not done if:
- only the happy path exists
- dark mode is missing
- loading state is absent
- empty state is absent
- error recovery is absent
- spacing differs arbitrarily from the token scale
- component styles are duplicated locally instead of using shared primitives

---

# 7. Suggested Storybook coverage

## Foundations
- colors
- typography
- spacing
- shadows
- radii

## Shared UI
- buttons
- inputs
- toggles
- tabs
- chips
- tables
- modals
- toasts
- empty/loading/error states
- chart frame

## Feature stories
- topic row item
- topic collection editor
- AI topic suggestion panel
- smart column type picker
- smart column preview panel
- insight response card
- report section
- share dialog

---

# 8. Engineering conventions for maintainability

- use composition over inheritance
- use feature flags for beta surfaces
- keep shared primitives visually stable
- keep module-specific logic close to the feature
- keep chart option builders separate from rendering components
- prefer typed configuration objects over scattered props
- never mix hardcoded theme values with token-driven styling

---

# 9. Recommended frontend handoff milestone outputs

## Milestone A — Foundations
Deliverables:
- theme support
- shared primitives
- Storybook
- screenshots in light/dark

## Milestone B — Topics + Smart Columns
Deliverables:
- row browser
- topic editor
- smart column flows
- compute states

## Milestone C — Reporting + Insight Agent
Deliverables:
- report builder shell
- insight element rendering
- insight dock
- sharing flows

---

# 10. Definition of done for UI integration

A module is considered integrated when:
- tokens are used consistently
- shared primitives are reused
- light and dark mode both pass review
- all critical states are implemented
- responsive desktop/tablet behavior exists
- engineering and design have validated parity on the agreed reference screens
