# Feature Thread: Kanban Card Resize to Fit Title

- **Feature:** Update kanban card size to show full task title
- **Goal:** When a user adds a task, the kanban card should display the full title instead of truncating it
- **Priority/Target:** P0 / 2026-03-02
- **Links:** N/A
- **Owners:** PM / ARCH / FE / BE / QA / DM
- **Status:** Kickoff — Artifacts in progress
- **Risks:** Visual regression in kanban layout; long titles may push cards too tall
- **Decisions needed:** Max line clamp vs fully unbounded height

---

## Agents Plan

---

### Feature Brief (PM)

**Ack:** Understood — the kanban task card truncates the title text via CSS `truncate`, preventing users from reading full task names.

**Output:**

#### Summary
Remove the single-line truncation on kanban task cards so the full title is always visible.

#### Problem / Opportunity
Users create tasks with descriptive titles but cannot read them in kanban view because `truncate` clips the text to one line. This degrades the kanban experience and forces users to click into each card to see its title.

#### Goals
- Show the full task title on every kanban card (no truncation)
- Maintain visual consistency and readability across cards

#### Non-goals
- Redesigning the entire card layout
- Adding a "show more/less" toggle (keep it simple for P0)

#### User Stories
- **As a user**, I want to see the full title of my task on the kanban card so I can scan my board without clicking into each card.

#### Acceptance Criteria
- **Given** a task with a title of any length, **When** it is rendered in the kanban board view, **Then** the full title is visible (not truncated).
- **Given** a task with a very long title (100+ characters), **When** rendered, **Then** the card grows vertically to accommodate the text while maintaining column width.
- **Given** the kanban board with mixed-length titles, **When** viewed, **Then** the layout remains clean — no horizontal overflow, no broken alignment.

#### Edge Cases
- Very long titles (200+ chars): card grows tall but column remains scrollable
- Empty title: card renders with minimal height (no regression)
- Titles with no spaces (e.g., long URL): should wrap via `break-words` to avoid horizontal overflow

#### NFRs
- **Performance:** No measurable rendering regression (card count up to ~100 per column)
- **Accessibility:** Title text remains readable; no content hidden from screen readers (truncate was already problematic for a11y)

#### Dependencies
- None — purely frontend CSS change

#### Analytics / Success Metrics
- Reduced "card click just to read title" interactions (qualitative)

#### Rollout Plan
- Ship directly — low-risk CSS change, no feature flag needed

#### Open Questions
- Should we cap at a max number of lines (e.g., 3-line clamp) for very long titles? **Recommendation: start with no cap, iterate if needed.**

**Next:** ARCH to confirm no ADR needed. FE to implement.
**Commands:** `/call ARCH confirm-no-adr kanban-card-resize-fit-title`

---

### Architecture Direction (ARCH)

**Ack:** Reviewed — this is a CSS-only change on a single component. No backend, no data model, no API changes.

**Output:**

#### Decision: No ADR needed

This change is confined to a single Tailwind class swap on `TaskCardContent` in `kanban-board.tsx`. No architectural concerns:
- No new dependencies
- No schema changes
- No API changes
- No state management changes
- No performance risk (CSS `word-break` + removing `truncate` is negligible)

#### Guidance
- Remove `truncate` class from the title `<p>` element
- Add `break-words` (Tailwind: `break-words`) to handle long unbroken strings
- Optionally add `line-clamp-3` if PM decides to cap height later (but start unbounded per PM recommendation)

#### Risks
- **Low:** Very long titles make cards tall, but the column already has `overflow-y-auto` so this is handled

**Next:** FE to implement.
**Commands:** `/signoff ARCH DoR kanban-card-resize-fit-title`

---

### API Contract (FE+BE)

**Ack:** No API changes required. This is a frontend-only change.

**Output:**

#### Contract: N/A
No endpoints, schemas, or backend logic affected. The task title is already stored and returned in full — the truncation is purely a CSS presentation issue.

**Next:** FE to implement. BE has no action items.

---

### Implementation Plan (FE)

**Ack:** Understood — remove `truncate`, add `break-words` to the title element in `TaskCardContent`.

**Output:**

#### File: `taskflow/src/components/kanban-board.tsx`

**Target:** Lines 376–383 (`TaskCardContent`, title `<p>` element)

**Change:**
```diff
- "text-sm font-medium truncate",
+ "text-sm font-medium break-words",
```

**What this does:**
- Removes `truncate` (which applies `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`)
- Adds `break-words` (which applies `overflow-wrap: break-word`) to handle long unbroken strings
- The title `<p>` will now wrap naturally to multiple lines, and the card height auto-sizes (already the default behavior)

**Additional consideration:**
- The parent `<div className="flex items-center gap-1.5">` may need `items-start` instead of `items-center` if we want multi-line titles to align at the top. However, since the only child is the `<p>`, this is cosmetic and can be left as-is.

**Next:** QA to validate. DM to finalize release plan.
**Commands:** `/handoff QA validate kanban-card-resize-fit-title`

---

### Test Plan (QA)

**Ack:** Understood — CSS change on kanban card title. Need visual validation across title lengths.

**Output:**

#### Scope
Visual regression test on kanban board task cards.

#### P0 Scenarios
1. **Short title (< 30 chars):** Card renders as before — single line, no visual change
2. **Medium title (30–80 chars):** Title wraps to 2+ lines, card grows vertically, layout intact
3. **Long title (100+ chars):** Card grows taller, column remains scrollable, no horizontal overflow
4. **Title with no spaces (long URL/string):** Text breaks correctly via `break-words`, no overflow

#### P1 Scenarios
5. **Completed task (done status):** Strikethrough + gray still applies across wrapped lines
6. **Drag-and-drop:** Dragging a multi-line card works correctly (overlay renders full title)
7. **Mixed-length cards in same column:** Layout is consistent, no alignment issues

#### P2 Scenarios
8. **Empty title:** Card renders with minimal height, no crash
9. **Mobile/narrow viewport:** Column width constraints respected

#### Unit/Integration/E2E Coverage
- **Unit:** Not applicable (CSS change)
- **Integration:** Not applicable
- **E2E:** Visual snapshot test recommended if Playwright/Cypress is set up; otherwise manual QA

#### Data/Env Needs
- Tasks with titles of varying lengths (5, 50, 100, 200 chars)
- At least one task with a no-space string (e.g., a long URL)

#### Automation Plan
- If snapshot testing is available: add a kanban board snapshot with multi-line titles
- Otherwise: manual visual QA (estimated: 15 min)

#### Risks/Mitigations
- **Risk:** Tall cards could degrade scan-ability → **Mitigation:** Monitor user feedback; add `line-clamp-N` later if needed

**Next:** DM to finalize release plan.
**Commands:** `/signoff QA DoR kanban-card-resize-fit-title`

---

### Release Plan (DM)

**Ack:** All artifacts collected. CSS-only change, minimal risk.

**Output:**

#### Milestones
1. FE implements change (1 line diff) — target: immediate
2. QA validates P0 scenarios — target: same session
3. Ship — target: 2026-03-02

#### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Very long titles degrade scannability | Low | Low | Add `line-clamp` in follow-up if feedback warrants |
| Visual regression on drag overlay | Low | Medium | QA P1 scenario #6 covers this |

#### Flag + Rollout Steps
- No feature flag needed — low-risk, single-line CSS change
- Deploy directly to production

#### Monitoring Signals
- No new metrics needed — visual change only
- Watch for user feedback on card readability

#### Rollback Triggers + Steps
- If layout breaks: revert the single commit (add `truncate` back, remove `break-words`)
- Rollback time: < 2 minutes

#### Comms/Notes
- No external comms needed
- Internal: note in changelog — "Kanban cards now show full task titles"

---

### DoR Checklist (DM)

| Gate | Status |
|------|--------|
| PM Feature Brief with AC, edge cases, NFRs | Done |
| ARCH design direction or "no ADR needed" | Done — No ADR needed |
| FE/BE API Contract (or plan to finalize) | Done — N/A (no API change) |
| QA Test Plan + env/data needs | Done |
| DM milestones/risks confirmed | Done |

**DoR: READY**

#### Sign-off commands to run:
```
/signoff PM DoR kanban-card-resize-fit-title
/signoff ARCH DoR kanban-card-resize-fit-title
/signoff QA DoR kanban-card-resize-fit-title
/signoff DM DoR kanban-card-resize-fit-title
```

---
---

## Solo (CTO) Plan

**Understanding:** The kanban card title is truncated to a single line via Tailwind's `truncate` class in `TaskCardContent` (`kanban-board.tsx:378`). We need to remove truncation so cards auto-size to show the full title.

### Cursor Discovery Prompt

> Search `taskflow/src/components/kanban-board.tsx` for the `TaskCardContent` component (around line 276). Focus on:
> 1. The title `<p>` element (~line 376–383) — note the `truncate` class
> 2. The parent container's flex/sizing classes (~line 341, 374–375)
> 3. The `DragOverlay` usage (~line 714) — confirm it renders `TaskCardContent` with `overlay={true}`
> 4. The column container's overflow/scroll settings (look for `overflow-y-auto`, `max-h-`)
>
> Report: exact class strings on the title element, any `whitespace-nowrap` or `overflow-hidden` that would block wrapping, and whether the drag overlay shares the same component.

### Phase 1 (only phase needed — single-line change)

> **File:** `taskflow/src/components/kanban-board.tsx`
>
> **Task:** In the `TaskCardContent` component, find the title `<p>` element (around line 378):
> ```tsx
> "text-sm font-medium truncate",
> ```
> Change it to:
> ```tsx
> "text-sm font-medium break-words",
> ```
>
> **Why:**
> - `truncate` applies `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — this clips the title
> - Removing it and adding `break-words` allows natural text wrapping and handles long unbroken strings
> - Card height already auto-sizes (no fixed height set)
> - Column already has `overflow-y-auto` so taller cards are handled
>
> **Do NOT change:** anything else — no layout, no padding, no other components.
>
> **Status report:** Confirm the exact line changed, the before/after class string, and verify no other instances of `truncate` exist in this component.

---
---

## Comparison

| Dimension | Agents Plan | Solo (CTO) Plan |
|-----------|-------------|-----------------|
| **Scope** | Full artifact set (brief, ADR, contract, test plan, release plan) | Minimal — discovery prompt + 1-phase execution prompt |
| **Architecture** | Explicitly confirmed "no ADR needed" | Implied — noted as simple CSS change |
| **Testing** | Detailed P0/P1/P2 scenarios with 9 test cases | Not explicitly covered (deferred to manual QA) |
| **Risk tracking** | Formal risk register + rollback plan | Mentioned informally |
| **Implementation** | Same 1-line diff | Same 1-line diff |
| **Overhead** | Higher — full protocol artifacts for a tiny change | Minimal — fast to execute |
| **Traceability** | High — every decision documented | Low — relies on commit message |

### Recommendation

**Use the Solo plan for execution** — this is a 1-line CSS change with near-zero risk. The Agents plan artifacts are captured above for reference (and the QA test scenarios are worth running), but spinning up the full protocol for this change would be over-engineering.

**Concrete next step:** Execute Phase 1 — change `truncate` → `break-words` on line 378 of `kanban-board.tsx`.
