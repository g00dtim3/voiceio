
# UI Component Catalog and Screen Implementation Spec
Version: 1.0  
Audience: Frontend Engineering, Design  
Purpose: Describe the component inventory, key props, visual states, and screen composition rules needed to build the frontend.

---

# 1. Shared UI component catalog

## 1.1 App shell components

### `AppShell`
Purpose:
- top-level layout for authenticated app

Regions:
- global sidebar
- optional secondary navigation
- main content
- optional context panel
- optional bottom dock

Required props:
- `sidebar`
- `secondaryNav?`
- `children`
- `contextPanel?`
- `bottomDock?`

### `ModuleSidebar`
Used for:
- Reports views/sections
- future nested navigation

States:
- default
- active item
- collapsed on smaller screens

---

# 2. Navigation and actions

## 2.1 `SidebarNavItem`
Props:
- `icon`
- `label`
- `active`
- `href`
- `badge?`

States:
- default
- hover
- active
- disabled

## 2.2 `TopBarActions`
Contains:
- filters trigger
- date range
- edit/preview toggle
- share button
- metadata or save status

---

# 3. Forms and controls

## 3.1 `TextInput`
Use cases:
- search
- naming categories/topics/reports
- prompt inputs in simple cases

States:
- default
- focus
- disabled
- error

## 3.2 `Textarea`
Use cases:
- prompts
- descriptions
- AI instruction blocks

Rules:
- show min height appropriate to context
- support monospace style optionally for formula/prompt editing

## 3.3 `Select`
Use cases:
- filters
- output type
- chart type
- permissions

## 3.4 `MultiSelectChips`
Use cases:
- segments
- filters with multiple selected values
- topic chips in controlled inputs

## 3.5 `Toggle`
Use cases:
- sentiment enabled
- show rare topics
- apply to future uploads

## 3.6 `Checkbox`
Use cases:
- row selection
- select all rows
- boolean options in modals

---

# 4. Feedback and system components

## 4.1 `LoadingState`
Required variants:
- page
- section
- table
- chart
- inline button loading

## 4.2 `EmptyState`
Pattern:
- icon
- title
- supporting text
- primary action
- optional secondary action

Mandatory use cases:
- no topic collection
- no AI suggestions
- no report sections
- no smart columns
- no insight history

## 4.3 `ErrorState`
Pattern:
- title
- message
- retry action
- optional support or detail section

## 4.4 `Toast`
Use cases:
- save success
- compute queued
- update failed
- share link copied

---

# 5. Data display components

## 5.1 `Chip`
Variants:
- topic chip
- segment chip
- filter chip
- sentiment chip
- status chip

Common props:
- `label`
- `tone`
- `removable?`
- `icon?`
- `onRemove?`

## 5.2 `DataTable`
Required features:
- column definitions
- sortable columns
- empty state slot
- loading skeleton rows
- row click action
- sticky header where appropriate

## 5.3 `VirtualizedRowList`
Required for:
- Topics row browser
- large row-based analytical lists

## 5.4 `MetricCard`
Used in:
- Reports
- overview panels
- score cards

Required props:
- `label`
- `value`
- `subtext?`
- `delta?`
- `status?`

## 5.5 `ChartFrame`
Wrapper around all charts.

Required regions:
- title
- actions or info tooltip
- body
- empty state slot
- error state slot

---

# 6. Modal and drawer components

## 6.1 `Dialog`
Used for:
- create smart column
- generate mapping
- share report
- destructive confirmations

Structure:
- header
- body
- footer

## 6.2 `SidePanel` or `Drawer`
Used for:
- context panel on smaller screens
- detailed configuration overlays

---

# 7. Module-specific components

# 7.1 Topics module

## `TopicRowBrowser`
Responsibilities:
- display row list
- handle search and filters
- allow row selection
- allow reviewed action
- expose inline assignment controls

Required child pieces:
- toolbar
- row list
- pagination or virtual controls
- bulk action bar

### Row item content
Each row should support:
- row checkbox
- main text
- topic chips
- reviewed indicator
- optional uncertainty marker
- copy action
- quick assign/remove actions

### Row item states
- default
- selected
- reviewed
- focused
- loading placeholder

## `TopicCollectionEditor`
Responsibilities:
- manage categories and topics
- enable sentiment
- support drag-and-drop ordering
- expose new category/topic actions

Sections:
- collection metadata
- sentiment controls
- categories list
- topics within category

## `AITopicSuggestionPanel`
Responsibilities:
- display generated suggestions grouped by type
- allow accept/discard
- expose prompt and regeneration

Groups:
- new
- similar
- discarded

## `AIQualityScorePanel`
Responsibilities:
- show global score
- radar chart
- breakdown table

---

# 7.2 Smart Columns module

## `SmartColumnsOverview`
Responsibilities:
- show health status
- show slot usage
- show runs table
- provide create CTA

## `SmartColumnTypePicker`
Options:
- mapping
- formula
- llm

## `SmartColumnConfigForm`
Responsibilities:
- capture column name
- output type
- config-specific fields
- fallback behavior
- future application settings

## `SmartColumnPreviewPanel`
Responsibilities:
- preview sample values
- show random sample option
- show compute preview action

## `SmartColumnJobStatus`
Responsibilities:
- render job status
- render progress if available
- render impacted row count

---

# 7.3 Insight Agent module

## `InsightAgentDock`
Responsibilities:
- hold input
- show empty state prompt
- show generated insight cards
- show suggested follow-up actions

States:
- idle
- generating
- answered
- error

## `InsightResponseCard`
Content:
- title
- narrative
- chart
- rows analyzed
- AI-generated marker
- suggested follow-ups

---

# 7.4 Reporting module

## `ReportsSidebar`
Responsibilities:
- list views
- list sections
- add new view
- add new section

## `ReportCanvas`
Responsibilities:
- render sections and elements
- support edit and preview modes
- support drag-and-drop ordering

## `ReportSection`
Content:
- section header
- actions menu
- elements list
- empty state if no elements

## `InsightElementRenderer`
Responsibilities:
- render a report element based on `type`
- delegate to the correct visualization component
- show loading/empty/error states if the data source is unresolved

## `ShareReportDialog`
Responsibilities:
- team access list
- public access settings
- copy link
- copy embed code
- optional password

---

# 8. Screen composition rules

## 8.1 Topics screen
Composition:
- page title and top actions
- row browser on left
- tabbed context panel on right

Priority of actions:
1. search/filter
2. assign/review
3. topic editing
4. AI scoring and stats

## 8.2 Smart Columns overview screen
Composition:
- page title
- usage/health cards
- runs table
- create CTA

## 8.3 Smart Column config screen
Composition:
- left: configuration form
- right or bottom: preview panel
- sticky footer or top-right CTA area for compute actions

## 8.4 Reporting screen
Composition:
- reports sidebar
- report canvas
- top-right edit/preview/share actions

## 8.5 Insight Agent report screen
Composition:
- report canvas remains primary
- insight dock sits below or overlays bottom portion
- dock must not visually dominate the page when idle

---

# 9. Required UI states by module

## Topics
- no collection
- loading rows
- no rows after filter
- row selected
- reviewed row
- AI suggestions empty
- AI score unavailable

## Smart Columns
- no columns
- draft column
- preview loading
- compute queued
- compute running
- compute failed
- healthy overview

## Insight Agent
- idle prompt
- generating answer
- answer with chart
- no results
- error

## Reporting
- empty report
- empty section
- edit mode
- preview mode
- autosaving
- shared / public enabled

---

# 10. Frontend implementation guardrails

- do not hardcode module-specific colors in feature components
- do not place business logic in shared primitives
- all async screens need deterministic loading and error states
- use registries for report insight element rendering
- use feature-owned API adapters instead of direct fetch calls in components
- use URL state for filters and views wherever shareability matters
