
# — Global Navigation and AppShell Wireframe Spec
Version: 1.0
Purpose: Provide a detailed implementation reference for the global shell and navigation layout.

---

# 1. Global AppShell structure

```txt
┌────────┬──────────────────────────┬──────────────────────────────────────────────┬──────────────────────────┐
│ Global │ Module Navigation        │ Main Content                                 │ Context Panel            │
│ Sidebar│ / Secondary Sidebar      │                                              │ (optional)               │
├────────┼──────────────────────────┼──────────────────────────────────────────────┼──────────────────────────┤
│ Logo   │ Project name             │ Page title + top actions                     │ Tabs / Details / Editor  │
│ Home   │ Overview                 │ Filters / segments / date range              │                          │
│ Topics │ Topics                   │ Main screen content                          │ Contextual content       │
│ Smart  │ Smart Columns            │                                              │                          │
│ Agent  │ Reports                  │                                              │                          │
│ Reports│ Views / Sections         │                                              │                          │
│ Share  │                          │                                              │                          │
│ User   │                          │                                              │                          │
└────────┴──────────────────────────┴──────────────────────────────────────────────┴──────────────────────────┘
```

---

# 2. Global sidebar wireframe

```txt
┌────────────┐
│ CAPLENA    │
├────────────┤
│ ⌂ Home     │
│ ◉ Topics   │
│ ⌗ Smart    │
│ ✦ Agent    │
│ ▣ Reports  │
│ ↗ Share    │
│            │
│            │
├────────────┤
│ ? Help     │
│ ☾ Theme    │
│ ○ Avatar   │
└────────────┘
```

## 2.1 Dimensions
- width: `72px` icon-only mode or `88px` if labels appear on hover
- top logo area height: `64px`
- nav item height: `44px`
- bottom utility area pinned to bottom

## 2.2 Behavior
- active module uses brand indicator strip on the left
- hover reveals tooltip if icon-only
- theme toggle is always accessible
- avatar opens account/settings menu

---

# 3. Secondary sidebar variants

## 3.1 Reports secondary nav

```txt
┌──────────────────────────┐
│ Mobile Providers - Q2    │
├──────────────────────────┤
│ Views                    │
│ • Full Report            │
│ • US South               │
│ + New View               │
├──────────────────────────┤
│ Sections                 │
│ • Summary                │
│ • NPS                    │
│ • Drivers                │
│ + New Section            │
└──────────────────────────┘
```

## 3.2 Topics secondary nav
Can be omitted if the main screen already handles context in the right panel.

## 3.3 Smart Columns secondary nav
Optional:
- Overview
- Runs
- Templates
- Settings

---

# 4. Top page header wireframe

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Customer Feedback Report                               [Preview] [Share]    │
│ Segments [Apple] [Samsung]   Filters [3 active]   Date [Last 90 days ▾]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 4.1 Header rules
- title row height: `40px`
- controls row height: `36px`
- stack into two rows when needed
- actions always right-aligned

---

# 5. Responsive rules
- on tablet, secondary sidebar may collapse into drawer
- context panel becomes overlay drawer below `1200px`
- global sidebar remains icon-first
- no mobile editing requirement for v1, read-only routes only
