# Feature Thread: Drag and Drop on Kanban View

- **Feature:** Drag and drop on Kanban view
- **Goal:** Enable reordering cards within a column (sort order) and dragging tasks between columns (project reassignment) on the Kanban board
- **Priority/Target:** P0 / 2026-03-01
- **Owners:** PM / ARCH / FE / BE / QA / DM
- **Status:** Kickoff — both mode (Agents Plan + Solo Plan + Comparison)
- **Risks:** Schema migration (new `sort_order` column), performance with large task lists, mobile touch support
- **Decisions needed:** Persistence strategy for sort order (integer vs fractional ranking)

---

## Agents Plan

### Feature Brief (PM)

**Summary:** Users can drag Kanban cards to reorder them within a project column and drag cards between columns to reassign projects. The current implementation only supports cross-column drag (project reassignment) but has no intra-column sort order.

**Problem / Opportunity:** Tasks appear in an arbitrary order within Kanban columns. Users cannot arrange them by personal priority or workflow sequence. This is the most-requested UX gap.

**Goals:**
- Reorder tasks within a column via drag-and-drop (persisted sort order)
- Move tasks between columns (already works — keep it)
- Smooth, responsive drag UX with visual feedback

**Non-goals:**
- Multi-select drag (batch move)
- Drag between Kanban and list view
- Column reordering (project order)

**User Stories:**
1. As a user, I drag a card up/down within a column to change its sort position.
2. As a user, I drag a card from one column to another to reassign its project.
3. As a user, my sort order persists across page reloads.

**Acceptance Criteria (Given/When/Then):**
- **Given** a column with 3+ tasks, **when** I drag task B above task A, **then** task B renders above A after drop and on reload.
- **Given** task in column "Work", **when** I drag it to "Personal", **then** its projectId updates and it appears at the bottom of "Personal".
- **Given** a drop is in progress, **when** the server fails, **then** the card snaps back to its original position and an error banner shows.

**Edge Cases:**
- Empty column → drop inserts at position 0
- Single card → no reorder, only cross-column
- Rapid successive drags before server responds
- Mobile touch drag vs. scroll conflict

**NFRs:**
- Drag latency < 16ms (60fps)
- Optimistic UI — reorder renders immediately, rolls back on error
- Accessible: keyboard drag support via `@dnd-kit` accessibility hooks

**Dependencies:** `@dnd-kit/sortable` already in `package.json`

**Analytics / Success Metrics:**
- % of users who reorder at least once per session
- Reduction in "sort by" filter usage post-launch

---

### Architecture Direction (ARCH)

**Ack:** Reviewing drag-and-drop reorder for Kanban board.

**Output — Design Direction:**

This is a **front-end-heavy change** with a small schema addition. No ADR/RFC needed.

**Sort order persistence strategy: fractional indexing**

Use a `sort_order REAL` column on `tasks` table. When inserting between two items, compute `(prev.sort_order + next.sort_order) / 2`. Periodically re-normalize if precision degrades (not needed at this scale).

**Why not integers?** Integer reorder requires updating O(n) rows to shift indices. Fractional indexing is O(1) per drop.

**Migration:**
```sql
-- UP
ALTER TABLE tasks ADD COLUMN sort_order REAL DEFAULT 0;
-- Backfill: assign order based on created_at
UPDATE tasks SET sort_order = rowid WHERE sort_order = 0;

-- DOWN
-- SQLite doesn't support DROP COLUMN natively; accept the column or rebuild table
```

**Risks:**
- Float precision after ~50 consecutive mid-insertions → mitigated by re-normalize function (batch update all items in column to sequential integers). Won't happen in practice at this scale.
- Optimistic reorder means brief inconsistency if server rejects → acceptable UX tradeoff.

**Next:** FE/BE to finalize contract for the reorder endpoint.

---

### API Contract (FE + BE)

**Endpoint:** `updateTask` server action (already exists in `actions/tasks.ts`)

Current `updateTask` already accepts `Partial<CreateTaskInput>`. We extend it:

```typescript
// In CreateTaskInput, add:
sortOrder?: number;

// In updateTask, handle:
if (updates.sortOrder !== undefined) setValues.sortOrder = updates.sortOrder;
```

**New server action for bulk reorder (optional optimization):**

```typescript
export async function reorderTask(taskId: string, newSortOrder: number): Promise<void>
```

This is a thin wrapper — FE computes the fractional sort order and sends it.

**Error shape:** Existing pattern — throws `Error("Unauthorized")` or `Error("...")`, caught by the FE try/catch.

**No new API endpoint needed.** We extend the existing `updateTask` action with `sortOrder`.

---

### Implementation Plan (FE)

**Key files:**
- `taskflow/src/components/kanban-board.tsx` — main changes
- `taskflow/src/actions/tasks.ts` — add `sortOrder` to update
- `taskflow/src/db/schema.ts` — add `sortOrder` column

**Approach:**
1. Switch from `@dnd-kit/core`-only to `@dnd-kit/sortable` for intra-column reorder
2. Each column becomes a `SortableContext` with `verticalListSortingStrategy`
3. Each `TaskCard` uses `useSortable` instead of `useDraggable`
4. `handleDragEnd` detects:
   - Same column → compute new fractional `sortOrder`, call `updateTask`
   - Different column → update `projectId` + compute `sortOrder` at end of target column
5. Optimistic UI: reorder the local array immediately via state, roll back on error
6. Sort tasks by `sortOrder` when building column task arrays

**Accessibility:**
- `@dnd-kit/sortable` provides keyboard drag out of the box (`Space` to pick up, arrows to move, `Space` to drop)
- Add `aria-label` on sortable items: "Task: {title}, position {n} of {total}"

---

### Implementation Plan (BE)

**Key files:**
- `taskflow/src/db/schema.ts` — add `sortOrder: real("sort_order").default(0)`
- `taskflow/src/actions/tasks.ts` — handle `sortOrder` in `updateTask` + `createTask`
- `taskflow/src/instrumentation.ts` — add ALTER TABLE for `sort_order` column (same pattern as recurrence columns)

**Backfill:** In `instrumentation.ts`, after adding the column, run:
```sql
UPDATE tasks SET sort_order = rowid WHERE sort_order = 0;
```

---

### Test Plan (QA)

**Scope:** Kanban drag-and-drop reorder + cross-column move

**P0 (must pass before merge):**
- [ ] Drag card down within column → order persists after reload
- [ ] Drag card up within column → order persists after reload
- [ ] Drag card to different column → projectId changes, card appears at bottom
- [ ] Drag card to empty column → card is only item, sortOrder = 0

**P1 (should pass):**
- [ ] Rapid consecutive drags → no stale state or duplicated cards
- [ ] Server error on reorder → card snaps back, error banner appears
- [ ] Keyboard drag (Space → Arrow → Space) → same result as mouse drag
- [ ] DragOverlay shows floating card copy during drag

**P2 (nice to have):**
- [ ] 50+ cards in one column → no visible jank during drag
- [ ] Mobile touch drag works (if applicable)

**Data/Env Needs:** Seeded DB with 3+ projects, 10+ tasks per project

**Automation Plan:**
- Unit: test `fractional sort order` computation function
- Integration: test `updateTask` with `sortOrder` field
- E2E: Playwright test for drag reorder (use `@dnd-kit` test utilities)

**Risks/Mitigations:**
- E2E flakiness with drag simulation → use `@dnd-kit`'s programmatic move or `page.mouse` steps

---

### Release Plan (DM)

**Milestones:**
1. Schema migration + backfill (BE) — low risk, additive column
2. Sortable Kanban UI (FE) — main implementation
3. QA validation — P0 scenarios

**Rollout:** No feature flag needed — this is a P0 UX improvement with no breaking changes. The `sort_order` column defaults to 0, so existing behavior is preserved if the FE code isn't deployed.

**Monitoring:** Watch for `updateTask` error rate spike after deploy.

**Rollback:** Revert FE code; `sort_order` column is harmless if unused.

**DoR Checklist:**
- [x] PM posted Feature Brief
- [x] ARCH posted design direction (no ADR needed)
- [x] FE/BE posted API contract
- [x] QA posted test plan
- [x] DM confirmed milestones/risks

---

## Solo (CTO) Plan

### Clarifying Questions (resolved from context)

I reviewed the codebase and can answer the key questions:
- **Current state:** `@dnd-kit/core` is used for cross-column drag (project reassignment). `@dnd-kit/sortable` is already a dependency but NOT used.
- **Sort persistence:** No `sort_order` column exists. Tasks render in DB insert order.
- **Schema:** SQLite via Drizzle ORM. Recurrence columns are added dynamically via ALTER TABLE in `instrumentation.ts`.

### Cursor Discovery Prompt

```
I need to add intra-column drag-and-drop reordering to the Kanban board, plus improve cross-column drag to place cards at a specific position.

Please investigate and report back:

1. FILE: taskflow/src/components/kanban-board.tsx
   - Current DnD setup: which @dnd-kit modules are imported?
   - How are columns built (line ~312-325)? How are tasks sorted within columns?
   - The handleDragEnd function (line ~336-358): what does it do currently?

2. FILE: taskflow/src/db/schema.ts
   - Full tasks table schema — list every column.
   - Is there a sort_order column?

3. FILE: taskflow/src/actions/tasks.ts
   - What fields does updateTask accept?
   - What fields does createTask accept?
   - Is sortOrder handled anywhere?

4. FILE: taskflow/package.json
   - Is @dnd-kit/sortable installed? Version?
   - Is @dnd-kit/utilities installed?

5. FILE: taskflow/src/instrumentation.ts
   - How are dynamic ALTER TABLE migrations handled?

Report: for each file, list the relevant code sections and current behavior. Flag anything missing that we'll need to add.
```

### Phase 1 — Schema + Backend (1 of 2)

```
PHASE 1: Add sort_order column and backend support

FILES TO MODIFY:
- taskflow/src/db/schema.ts
- taskflow/src/actions/tasks.ts
- taskflow/src/instrumentation.ts

TASKS:

1. In taskflow/src/db/schema.ts, add to the tasks table:
   sortOrder: real("sort_order").default(0),

2. In taskflow/src/instrumentation.ts, add sort_order column migration
   using the same try/catch ALTER TABLE pattern used for recurrence columns:
   ALTER TABLE tasks ADD COLUMN sort_order REAL DEFAULT 0
   Then backfill: UPDATE tasks SET sort_order = rowid WHERE sort_order = 0

3. In taskflow/src/actions/tasks.ts:
   a) Add to CreateTaskInput type:
      sortOrder?: number;
   b) In createTask(), add sortOrder to the insert values:
      sortOrder: input.sortOrder ?? 0,
   c) In updateTask(), add handler:
      if (updates.sortOrder !== undefined) setValues.sortOrder = updates.sortOrder;

DO NOT touch any frontend files in this phase.

Return a STATUS REPORT listing every change you made (file, line, what changed).
```

### Phase 2 — Frontend Sortable Kanban (2 of 2)

```
PHASE 2: Implement sortable drag-and-drop in Kanban board

FILES TO MODIFY:
- taskflow/src/components/kanban-board.tsx

CONTEXT:
- @dnd-kit/sortable is already installed (package.json)
- sort_order column was added in Phase 1
- updateTask now accepts sortOrder field

TASKS:

1. Add imports from @dnd-kit/sortable:
   import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
   import { CSS } from "@dnd-kit/utilities";

2. Update TaskCard component:
   - Replace useDraggable with useSortable
   - Apply transform + transition via CSS.Transform.toString(transform)
   - Keep the existing overlay, complete, delete, and click behaviors

3. Update Column component:
   - Wrap the cards list in <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
   - Pass sorted task IDs as the items prop
   - Sort incoming tasks by sortOrder before rendering

4. Update KanbanBoard component:
   a) Sort tasks by sortOrder when building column arrays (line ~312-325):
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

   b) Add closestCorners collision detection:
      import { closestCorners } from "@dnd-kit/core";
      Add collisionDetection={closestCorners} to <DndContext>

   c) Rewrite handleDragEnd:
      - Detect same-column reorder: find old and new index, compute fractional sortOrder
        newOrder = items at newIndex-1 and newIndex+1 exist?
          (prev.sortOrder + next.sortOrder) / 2
        else at start? items[1].sortOrder / 2
        else at end? items[last].sortOrder + 1
      - Detect cross-column move: update projectId + set sortOrder to max(targetColumn) + 1
      - Call updateTask with { sortOrder } or { projectId, sortOrder }
      - Optimistic: keep local reorder state, roll back on error

   d) Update handleDragOver to track which column and index the card is hovering over.

5. Update TaskItem type if needed — ensure sortOrder is in the type.
   Check taskflow/src/components/task-list.tsx for the TaskItem type and add sortOrder if missing.

IMPORTANT CONSTRAINTS:
- Keep React.memo on TaskCard
- Keep the existing error banner, show-completed toggle, and TaskDetail modal
- Keep the DragOverlay for the floating card preview
- Ensure keyboard accessibility works (useSortable provides this)

Return a STATUS REPORT listing every change you made (file, line, what changed).
```

---

## Comparison

| Dimension | Agents Plan | Solo (CTO) Plan |
|---|---|---|
| **Scope** | Full artifact set (brief, ADR, contract, test plan, release plan) + phased Cursor prompts | Focused Cursor prompts only (discovery + 2 phases) |
| **Architecture** | Explicit fractional indexing rationale + migration SQL with UP/DOWN | Same approach, embedded in phase prompts |
| **Testing** | Detailed P0/P1/P2 test plan with automation strategy | Testing implied in acceptance criteria, not standalone |
| **Risk coverage** | Float precision, optimistic rollback, mobile touch, E2E flakiness all called out | Optimistic rollback mentioned; fewer edge cases explicit |
| **Execution speed** | Slower — 6 artifacts to review before coding starts | Faster — 1 discovery + 2 phase prompts, start coding sooner |
| **Overhead** | Higher — useful for complex/risky features | Lower — right-sized for this feature |

### Recommendation

**Use the Solo (CTO) Plan.** This is a well-scoped P0 UI feature with a single additive schema change and no backend complexity. The 2-phase Cursor prompt approach gets us shipping fastest. The Agents Plan artifacts (test plan, release plan) are valuable reference material but don't justify the overhead for a feature of this scope.

**Action items:**
1. Run the **Cursor Discovery Prompt** to validate assumptions
2. Execute **Phase 1** (schema + backend)
3. Execute **Phase 2** (frontend sortable kanban)
4. Reference the **QA P0 checklist** from the Agents Plan for manual validation
