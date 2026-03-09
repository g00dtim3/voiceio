
# — Creation Forms Specification
Version: 1.0
Purpose: Specify creation forms not yet covered in detail: Topic creation and Report creation.

---

# 1. Topic creation form

## 1.1 Quick add topic inside category

```txt
┌──────────────────────────────────────────────┐
│ Add Topic                                    │
├──────────────────────────────────────────────┤
│ Label *                                      │
│ [ Customer support....................... ]  │
│                                              │
│ Description                                  │
│ [ Service interactions and support quality ] │
│                                              │
│ Sentiment enabled                            │
│ [ ON ]                                       │
│                                              │
│                               [Cancel][Add]  │
└──────────────────────────────────────────────┘
```

## 1.2 Fields
- `label` required, max 80 chars
- `description` optional, max 240 chars
- `sentimentEnabled` boolean, default inherits collection setting

## 1.3 Validation
- label required
- duplicate topic labels inside same category should warn
- trim leading/trailing spaces
- submit disabled until label is non-empty

## 1.4 UX behavior
- focus starts on label
- Enter submits if valid
- Escape closes without saving
- success closes dialog and inserts topic inline in category list

---

# 2. Category creation form

```txt
┌──────────────────────────────────────┐
│ New Category                         │
├──────────────────────────────────────┤
│ Name *                               │
│ [ Performance.................... ]  │
│                          [Cancel][Create]
└──────────────────────────────────────┘
```

## 2.1 Fields
- `label` required, max 60 chars

---

# 3. Report creation form

## 3.1 Create report modal

```txt
┌────────────────────────────────────────────────────────────┐
│ Create Report                                              │
├────────────────────────────────────────────────────────────┤
│ Report name *                                              │
│ [ Customer Feedback Report.............................. ] │
│                                                            │
│ Based on view                                              │
│ [ Full Report ▾ ]                                          │
│                                                            │
│ Default sections                                           │
│ [x] Summary                                                │
│ [x] NPS                                                    │
│ [x] Drivers                                                │
│                                                            │
│ Text column                                                │
│ [ comment_text ▾ ]                                         │
│                                                            │
│ Score column                                               │
│ [ nps_score ▾ ]                                            │
│                                                            │
│                                     [Cancel] [Create report]
└────────────────────────────────────────────────────────────┘
```

## 3.2 Fields
- `name` required
- `baseViewId` optional but recommended
- `defaultSections` array of predefined section types
- `textColumn` required for text-driven visuals
- `scoreColumn` optional depending on report type

## 3.3 Validation
- name required
- if NPS section selected, score column required
- duplicate report name allowed but discouraged

## 3.4 UX behavior
- on create, redirect to edit mode
- show autosave indicator after initial creation
- if template sections selected, populate immediately

---

# 4. Add report section form

```txt
┌──────────────────────────────────────┐
│ New Section                          │
├──────────────────────────────────────┤
│ Name *                               │
│ [ NPS Drivers.................... ]  │
│                          [Cancel][Add]
└──────────────────────────────────────┘
```

---

# 5. Add insight element form

```txt
┌──────────────────────────────────────────────────────┐
│ Add insight element to: Summary                      │
├──────────────────────────────────────────────────────┤
│ Category                                             │
│ [ Topic ▾ ]                                          │
│                                                      │
│ Element type                                         │
│ [ Topic Correlation ▾ ]                              │
│                                                      │
│ Chart type                                           │
│ [ Chord ▾ ]                                          │
│                                                      │
│ Limit                                                │
│ [ 5 ]                                                │
│                                                      │
│                               [Cancel] [Add element] │
└──────────────────────────────────────────────────────┘
```
