
# UI/UX Playbook for Frontend Implementation
Version: 1.0  
Audience: Frontend Engineering, Design, Product  
Purpose: Provide a build-ready UI/UX reference to implement the frontend and integrate the design system consistently.

---

# 1. Product UI principles

## 1.1 Core principles
- **Data first**: the interface prioritizes analytical content over decoration.
- **Human-in-the-loop AI**: AI assists, but every AI output is reviewable, editable, and traceable.
- **Progressive disclosure**: advanced options appear only when relevant.
- **Contextual editing**: editing usually happens in split views or contextual panels.
- **Operational clarity**: every compute-heavy action shows scope, status, and result.

## 1.2 Product personality
- Analytical
- Clean
- Professional
- Enterprise-ready
- Neutral and trustworthy
- AI-augmented, not playful

---

# 2. Global layout system

## 2.1 Shell structure
Primary app layout:

```txt
| Global Sidebar | Module Navigation / Secondary Nav | Main Content | Context Panel |
```

Optional layout variants:
- **Bottom dock**: used for Insight Agent
- **Builder layout**: used for Report editing
- **Split analytic layout**: used for Topics and some Smart Columns screens

## 2.2 Recommended dimensions
- Global sidebar: `72px`
- Secondary nav: `240px`
- Context panel: `420px` to `520px`
- Content max width when centered: `1440px`
- Global content padding: `24px` desktop / `16px` tablet

## 2.3 Grid
- 12-column grid for large content pages
- 24px gutter desktop
- 16px gutter tablet
- 8px base spacing system

---

# 3. Primary modules and expected screen patterns

## 3.1 Topics
Layout pattern:
```txt
| Left content: Row Browser | Right context panel: Topic Collection / AI score / Chart / Stats |
```

Expected behavior:
- row list is scrollable and virtualized
- right panel content changes by active tab
- topic assignment is inline and immediate
- reviewed state is highly visible
- filters affect list and dependent analytics

## 3.2 Smart Columns
Layout pattern:
```txt
| Overview list OR Config form + Preview panel |
```

Expected behavior:
- create flow always follows `configure -> preview -> confirm -> compute`
- compute jobs show impacted rows
- draft vs computed state must be explicit
- preview area must support random sampling and filtered sample

## 3.3 Insight Agent
Layout pattern:
```txt
| Report content + bottom conversational insight panel |
```

Expected behavior:
- can operate from empty state with suggestions
- keeps context of filters, segments, and active report
- narrative output and chart output are shown together
- follow-up questions are surfaced as first-class actions

## 3.4 Reporting
Layout pattern:
```txt
| Left sidebar: views + sections | Main report canvas |
```

Expected behavior:
- clear distinction between Edit and Preview
- section-based composition
- drag-and-drop for sections/elements
- insight elements are modular and config-driven
- share settings are accessible and permission-driven

---

# 4. UX flows by module

## 4.1 Topics — primary flow
1. Open Topics module
2. Search/filter rows
3. Review existing topic assignments
4. Create/edit topic collection in right panel
5. Generate AI topic suggestions if needed
6. Assign/remove topics on rows
7. Edit sentiment where relevant
8. Mark rows as reviewed
9. Check AI Quality Score

### Critical UX rules
- selection state must persist across row navigation
- editing a topic assignment must update row UI instantly
- reviewed action must be visible and fast
- uncertain/AI-generated assignments need a stronger visual cue than reviewed ones

## 4.2 Smart Columns — primary flow
1. Open Smart Columns overview
2. Create a new smart column
3. Choose computation type: Mapping / Formula / LLM
4. Configure inputs and fallback behavior
5. Preview output
6. Confirm compute on all rows or target scope
7. Track job status
8. Reapply to outdated or all rows when needed

### Critical UX rules
- preview is mandatory before full compute
- long-running jobs need status, progress if available, and completion feedback
- destructive actions (delete, recompute all) require confirmation
- future behavior (“apply to future uploads”) must be explicit

## 4.3 Insight Agent — primary flow
1. Open report
2. Ask a natural-language question or use suggested insight
3. Receive narrative response and chart
4. Explore suggested follow-up questions
5. Continue with contextual analysis
6. Optionally translate insight into a report element manually

### Critical UX rules
- clearly show that the answer is based on active filters/segments
- show row count analyzed
- show AI-generated marker
- preserve conversational context during the session

## 4.4 Reporting — primary flow
1. Open or create a report
2. Create or select a View
3. Add sections
4. Add insight elements inside sections
5. Configure visualizations and metrics
6. Reorder sections/elements
7. Switch to Preview
8. Share with team or external stakeholders

### Critical UX rules
- autosave state must be visible but discreet
- edit controls must disappear in Preview
- empty report and empty section states need guided CTAs
- sharing UI must separate team access from public access

---

# 5. Global interaction patterns

## 5.1 Standard states
Every data-driven screen or component should support:
- loading
- empty
- error
- success
- disabled
- read-only if permissions require it

## 5.2 Standard async action pattern
For create/update/compute/share actions:
1. user initiates action
2. local loading state appears
3. optimistic UI only where safe
4. success toast or inline confirmation
5. dependent data re-fetches or invalidates

## 5.3 Confirmation pattern
Use confirmation dialogs for:
- delete topic/category/element/column
- compute all rows
- reapply to all rows
- enabling public share
- replacing existing mappings

## 5.4 Preview-before-commit pattern
Mandatory for:
- Smart Columns compute
- AI topic generation acceptance
- any action affecting many rows or large analytical outputs

---

# 6. Responsive behavior

## 6.1 Desktop
Primary experience. All modules optimized for desktop first.

## 6.2 Tablet
- collapse secondary navigation when needed
- context panel can become an overlay drawer
- charts can stack vertically
- multi-column config forms collapse to one column

## 6.3 Mobile
Not primary for build phase 1.  
Minimum expectation:
- read-only access to shared reports
- basic navigation and chart readability
- no heavy builder/editing flows required

---

# 7. Accessibility baseline

- minimum color contrast ratio: 4.5:1 for body text
- visible focus states on all interactive controls
- keyboard support for:
  - tabs
  - dialogs
  - dropdowns
  - row selection
  - report builder controls where possible
- semantic headings in pages and panels
- chart summaries or textual alternatives for key insights
- icon-only buttons must have accessible labels

---

# 8. Copy and labeling rules

- labels should be functional and specific
- AI outputs must explicitly say **AI-generated**
- compute actions should describe scope:  
  examples:
  - `Compute preview`
  - `Create & fill`
  - `Reapply to outdated rows`
  - `Apply to future uploads`
- destructive buttons should use precise labels:
  - `Delete topic`
  - `Delete smart column`
  - `Remove access`

---

# 9. Implementation priorities for frontend team

## Phase 1
- app shell
- tokens + themes
- shared components
- Topics row browser
- Topic collection editor
- Smart columns overview + config form
- report layout shell
- share modal

## Phase 2
- AI Quality Score
- Insight Agent
- topic generation suggestions
- drag-and-drop report builder
- advanced chart library wrappers

## Phase 3
- public share routes
- embed routes
- deeper permission/read-only modes
- advanced accessibility and analytics instrumentation
