
# — Micro-interactions and Motion Specification
Version: 1.0
Purpose: Remove ambiguity in interactions, hover states, transitions, and visual feedback.

---

# 1. Motion principles
- motion is subtle, fast, and informative
- no decorative animation
- every motion should communicate state change or affordance

---

# 2. Timing scale
- hover transition: `120ms ease-out`
- panel/tab transition: `160ms ease-out`
- modal open/close: `180ms ease-out`
- toast enter/exit: `180ms ease-out`
- drag release settle: `140ms ease-out`

---

# 3. Standard interaction rules

## 3.1 Hover
Applies to:
- buttons
- row items
- chips when removable
- sidebar items
- cards with actions

Visual behavior:
- background tint increase by 4–8%
- no dramatic scaling
- optional shadow increase from `shadow-sm` to `shadow-md` on cards

## 3.2 Focus visible
- use 2px ring in brand color
- ring must be outside component bounds when possible
- never rely on browser default outline only

## 3.3 Pressed / active
- reduce opacity or slightly darken background
- no more than 1px visual compression effect

---

# 4. Row interactions

## 4.1 Row hover
- background changes from `bg-surface` to `bg-surface-subtle`
- transition: `background-color 120ms ease-out`

## 4.2 Row selected
- background uses `bg-hover`
- border-left optional brand accent 2px
- selected state must remain visible even when not hovered

## 4.3 Row reviewed
- show green label `✓ Reviewed`
- no full green row background
- reviewed and selected may coexist

## 4.4 Row uncertain
- show amber warning label
- optional confidence badge
- uncertain state must not overpower selection

---

# 5. Chips

## 5.1 Default chip
- stable pill shape
- no motion except hover background when removable

## 5.2 Removable chip hover
- close icon fades from 70% to 100% opacity
- background tint slightly darkens
- transition `120ms`

---

# 6. Buttons

## 6.1 Primary button
- hover: darker brand background
- active: darker again or 96% brightness
- disabled: 50% opacity, no shadow, pointer-events none

## 6.2 Secondary button
- hover: muted background fill
- active: muted fill + slightly stronger border

---

# 7. Dialogs and drawers

## 7.1 Modal open
- overlay fades in from 0 to target opacity over `180ms`
- modal content fades in + translates upward from `4px`

## 7.2 Modal close
- reverse of open
- closing motion should not exceed `160ms`

## 7.3 Drawer open
- slide from right over `180ms`
- overlay fade in same duration

---

# 8. Tabs

## 8.1 Tab switch
- active underline moves or fades within `160ms`
- content cross-fade optional, max `120ms`
- no layout jump larger than necessary

---

# 9. Toasts

## 9.1 Enter
- bottom/right slide of `8px`
- opacity 0 → 1 over `180ms`

## 9.2 Exit
- reverse enter
- keep animation subtle to avoid noise

---

# 10. Loading feedback

## 10.1 Skeletons
- shimmer optional, but subtle
- use neutral tint only
- animation cycle around `1.2s`

## 10.2 Buttons in loading
- spinner left of label or centered if icon-only
- width should remain stable to prevent layout shift

## 10.3 Long jobs
- queued: neutral badge
- running: info badge + progress if available
- completed: success badge
- failed: danger badge + retry action where possible

---

# 11. Drag and drop

## 11.1 Drag start
- dragged item gains elevated shadow
- opacity around `0.92`
- cursor changes to grabbing

## 11.2 Drop target
- show insertion indicator line or highlighted container
- indicator uses brand color

## 11.3 Drop end
- settle animation max `140ms`

---

# 12. Copy feedback
When copying link/text:
- show toast `Copied to clipboard`
- optional inline checkmark for `1.2s`

---

# 13. Animation guardrails
- never animate large layout shifts unless necessary
- do not animate chart data by default on every filter change if it hurts readability
- motion must respect reduced motion preferences
