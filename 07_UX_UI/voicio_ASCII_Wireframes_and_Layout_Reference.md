
# — ASCII Wireframes and Visual Layout Reference
Version: 1.0
Purpose: Give engineering a concrete visual target without relying on Figma screenshots.

---

# 1. TopicRowBrowser

## 1.1 Overall layout

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ [☑] Select all rows (957)                 [Search input.................]   │
│ [Filters ▾] [Reviewed ▾] [Focus mode ☐] [Sort ▾]                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ [☐]  The battery life is excellent but customer support is slow.            │
│      [Performance / Battery life] [Service / Customer support]              │
│      ✓ Reviewed                 AI 91%                     Copy  ⋯           │
├──────────────────────────────────────────────────────────────────────────────┤
│ [☑]  App crashes after update on Samsung devices.                           │
│      [Reliability / App stability] [Brand / Samsung] [Negative]             │
│      ⚠ Uncertain                AI 62%                     Copy  ⋯           │
├──────────────────────────────────────────────────────────────────────────────┤
│ [☐]  Price is too high for the quality provided.                            │
│      [Pricing / Cost] [Negative]                                            │
│      Not reviewed               Manual                     Copy  ⋯           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Dimensions
- Browser toolbar height: `44px`
- Filter row height: `40px`
- Row min height: `88px`
- Row padding: `12px 16px`
- Gap between text and chips: `8px`
- Gap between chips: `6px`
- Divider between rows: `1px`

## 1.3 Row anatomy
- Column 1: checkbox, fixed width `24px`
- Column 2: content block, flexible
- Column 3: quick actions/meta, right-aligned, width `120px`

## 1.4 Visual rules
- Selected row background: brand tint (`bg-hover`)
- Reviewed badge: green text + subtle green tint
- Uncertain badge: amber text + subtle amber tint
- Hover on row: slightly darker surface tint
- Chips wrap to next line if more than 3 medium chips

---

# 2. Topic Collection Editor

```txt
┌────────────────────────────────────────────────────────────┐
│ Topic Collection                                           │
│ Main Topic Collection                     [Sentiment ON]   │
│ Created 12 Feb 2026                                       │
├────────────────────────────────────────────────────────────┤
│ [+ New Category]                                          │
├────────────────────────────────────────────────────────────┤
│ PERFORMANCE (19)                                 [⋯]      │
│  ├─ Battery life                               [toggle]   │
│  ├─ Speed                                      [toggle]   │
│  └─ App stability                              [toggle]   │
│    [+ Add topic]                                          │
├────────────────────────────────────────────────────────────┤
│ BRAND (11)                                       [⋯]      │
│  ├─ Samsung                                    [toggle]   │
│  ├─ Apple                                      [toggle]   │
│    [+ Add topic]                                          │
└────────────────────────────────────────────────────────────┘
```

## 2.1 Dimensions
- Panel width: `420px`
- Section header height: `40px`
- Topic row height: `36px`
- Category spacing: `16px`

---

# 3. MetricCard

```txt
┌──────────────────────────────────────────────┐
│ Overall Net Sentiment                    ↗   │
│ 72%                                         │
│ +4.2 pts vs previous period                 │
└──────────────────────────────────────────────┘
```

## 3.1 Layout rules
- Card padding: `16px`
- Label at top-left
- Optional status/delta icon top-right
- Main value aligned left, vertically centered
- Optional subtext below value
- No more than 3 visual layers in one card

## 3.2 Dimensions
- Min width: `220px`
- Min height: `112px`

---

# 4. Smart Column Config + Preview

```txt
┌───────────────────────────────┬──────────────────────────────────────────────┐
│ Column settings               │ Preview                                      │
│ Name: [Extract brand      ]   │ [Random sample ☐] [Compute preview]          │
│ Type: [LLM ▾]                 ├──────────────────────────────────────────────┤
│ Prompt                        │ Row 1  "I use Apple and Samsung..."  Apple   │
│ ┌───────────────────────────┐ │ Row 2  "Google Pixel is great"      Google  │
│ │ Extract the most relevant │ │ Row 3  "No brand mentioned"         Unknown │
│ │ brand name ...            │ │                                              │
│ └───────────────────────────┘ │                                              │
│ Fallback: [Unknown       ]    │                                              │
│ [Apply to future uploads ☐]   │                                              │
│                               │                                              │
│                 [Create & Fill]                                              │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

## 4.1 Layout rules
- Split columns 40/60
- Right panel preview table header sticky
- Primary CTA bottom-right
- Preview area should never exceed viewport height; it scrolls internally

---

# 5. Insight Agent Dock

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ What questions about this project do you have today?                         │
│ [ Ask a question and press Enter......................................... ]  │
│ [Next Insight] [Compare Apple vs Samsung] [Top negative topics]              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Most Mentioned Negative Topics — Apple                                       │
│ Customer support and pricing are the most frequent negative topics...        │
│ Rows analyzed: 214                                        AI-generated      │
│                                                                              │
│ [Horizontal bar chart area..............................................]    │
│                                                                              │
│ Follow-ups: [How does this compare with Samsung?] [Over time?]              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 5.1 Dimensions
- Dock height idle: `168px`
- Dock height answered: `320px` to `420px`
- Internal sections separated by `12px`

---

# 6. Reporting Screen

```txt
┌──────────────────────┬───────────────────────────────────────────────────────┐
│ Views                │ Customer Feedback Report         [Preview] [Share]   │
│ • Full Report        │ Segments [Apple][Samsung] Filters [3 active]         │
│ • US South           ├───────────────────────────────────────────────────────┤
│ + New View           │ Summary                                               │
│                      │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ Sections             │ │ MetricCard   │ │ MetricCard   │ │ MetricCard   │    │
│ • Summary            │ └──────────────┘ └──────────────┘ └──────────────┘    │
│ • NPS                │                                                       │
│ • Drivers            │ NPS Drivers                                           │
│ + New Section        │ ┌───────────────────────────────────────────────────┐ │
│                      │ │ Topic Correlation Chart                           │ │
│                      │ └───────────────────────────────────────────────────┘ │
└──────────────────────┴───────────────────────────────────────────────────────┘
```

## 6.1 Dimensions
- Left sidebar width: `240px`
- Main canvas padding: `24px`
- Gap between section cards: `16px`

---

# 7. Button anatomy

```txt
[ + New smart column ]
```

- Height: `40px`
- Horizontal padding: `16px`
- Gap icon/text: `8px`
- Radius: `8px`

---

# 8. Chips layout rule

Topic chips inside rows:

```txt
[Performance / Battery life] [Service / Customer support] [Negative]
```

- Max chip height: `28px`
- Internal padding: `0 10px`
- Horizontal gap: `6px`
- Vertical gap: `6px`
- Chips wrap after available width is exceeded
