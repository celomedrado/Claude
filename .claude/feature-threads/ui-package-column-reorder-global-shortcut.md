# Feature Thread: UI Package — Column Reorder + Global Shortcut Fix

- **Feature:** UI Package (column reorder + global shortcut fix)
- **Goal:** (1) Drag project columns to reorder them on the kanban board. (2) Fix the broken `CmdOrCtrl+Shift+T` global shortcut so tasks can be created when the app is not focused.
- **Priority/Target:** P0 / 2026-03-01
- **Owners:** PM / ARCH / FE / BE / QA / DM
- **Status:** Kickoff — both mode (Agents Plan + Solo Plan + Comparison)
- **Risks:** Nested DnD contexts (columns + cards), Tauri v2 capability permissions
- **Decisions needed:** Horizontal column DnD approach (nested DndContext vs. single context)

---

## Agents Plan

### Feature Brief (PM)

- **Ack:** Feature Brief requested for UI Package (column reorder + global shortcut fix).

- **Output:**

**Summary:** Two UX improvements: (A) Users can drag project columns horizontally to reorder them on the kanban board. (B) The `CmdOrCtrl+Shift+T` global shortcut (which opens the quick-add bar from any app) is currently broken and needs fixing.

**Problem / Opportunity:**
- (A) Project columns render in `created_at DESC` order. Users cannot arrange columns by workflow priority (e.g., "Urgent" leftmost). Column reordering is a standard kanban expectation.
- (B) The global shortcut is the primary differentiator of the desktop app — capturing tasks without switching apps. It's registered in code (`lib.rs:125`) but silently fails because Tauri v2 capability permissions are missing.

**Goals:**
- Drag project columns left/right to reorder them (persisted)
- Fix global `CmdOrCtrl+Shift+T` shortcut to open quick-add from any app
- Both changes apply to the **desktop app** (`taskflow-desktop/`)
- Column reorder also applies to the **web app** (`taskflow/`)

**Non-goals:**
- Column drag on mobile/touch
- Custom shortcut configuration UI (shortcut is already stored in `AppSettings.globalHotkey`)
- Reordering the "Unassigned" column (always last)

**User Stories:**
1. As a user, I drag a project column left/right to reposition it on the kanban board, and the order persists across reloads.
2. As a user, I press `Cmd+Shift+T` from any application and the TaskFlow quick-add bar appears.

**Acceptance Criteria (Given/When/Then):**
- **Given** 3+ project columns, **when** I drag "Personal" before "Work", **then** "Personal" renders left of "Work" on reload.
- **Given** the desktop app is running (foreground or background), **when** I press `Cmd+Shift+T` from Safari, **then** the TaskFlow window appears with the quick-add bar open.
- **Given** the desktop app is quit, **when** I press `Cmd+Shift+T`, **then** nothing happens (expected — no crash, no orphan listener).

**Edge Cases:**
- Only 1 column + Unassigned → no column drag affordance
- Drag a column while a task card is mid-drag (prevent with guard)
- Global shortcut conflicts with another app's shortcut
- macOS Accessibility permission not granted → shortcut fails silently

**NFRs:**
- Column drag latency < 16ms (60fps)
- Global shortcut response < 300ms (window show + focus + quick-add open)
- Column order persists in SQLite; no data loss on crash mid-drag

**Dependencies:**
- `@dnd-kit/sortable` already installed (both apps)
- `tauri-plugin-global-shortcut` v2 already in `Cargo.toml`

**Analytics / Success Metrics:**
- % of desktop users who use the global shortcut at least once per day
- % of users who reorder columns at least once

**Open Questions:**
- Should we add a visual drag handle to column headers, or make the entire header draggable?

- **Next:** ARCH to confirm DnD approach + capability permission fix.
- **Commands:** `/call ARCH Provide design direction for column reorder DnD + global shortcut fix.`

---

### Architecture Direction (ARCH)

- **Ack:** Reviewing column reorder DnD architecture + Tauri global shortcut fix.

- **Output — Design Direction:**

#### Part A: Column Reorder

**Approach: Nested DndContext**

Use two `DndContext` components:
- **Outer** `DndContext` — horizontal column reorder with `horizontalListSortingStrategy`
- **Inner** `DndContext` (existing) — vertical task card reorder within each column

`@dnd-kit` natively supports nested contexts. The outer context handles column drags; the inner context handles card drags. Events bubble correctly — the inner context captures card drags before the outer context sees them.

**Why not single context?** Mixing horizontal column IDs and vertical task IDs in one context creates collision detection ambiguity. Nested contexts cleanly separate the concerns.

**Schema change — `display_order` column on `projects`:**

```sql
-- UP (desktop — db.rs)
ALTER TABLE projects ADD COLUMN display_order REAL DEFAULT 0;
UPDATE projects SET display_order = rowid WHERE display_order = 0;

-- UP (web — instrumentation.ts)
ALTER TABLE projects ADD COLUMN display_order REAL DEFAULT 0;

-- DOWN
-- Column is harmless if unused; SQLite cannot drop columns easily
```

Use the same fractional indexing strategy as task `sort_order` — O(1) per drop.

**Query change:** `list_projects` must `ORDER BY display_order ASC, created_at DESC` instead of `ORDER BY created_at DESC`.

**No ADR/RFC needed.** This is a straightforward additive schema change + UI feature using established patterns.

#### Part B: Global Shortcut Fix

**Root cause:** Tauri v2 requires explicit **capability permissions** for plugin APIs. The `taskflow-desktop/src-tauri/` directory has **no `capabilities/` directory**. Without it, `tauri_plugin_global_shortcut::GlobalShortcutExt` silently fails to register shortcuts.

**Fix:** Create `src-tauri/capabilities/default.json`:

```json
{
  "identifier": "default",
  "description": "Default capabilities for TaskFlow desktop",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "global-shortcut:allow-is-registered",
    "notification:default",
    "dialog:default",
    "autostart:default",
    "window-state:default",
    "process:default",
    "updater:default"
  ]
}
```

The existing Rust code in `lib.rs:122-131` is correct — it just needs the permission to execute.

**Risks:**
- macOS may require Accessibility permission for global shortcuts — the app should handle this gracefully (Tauri emits an error, but the current code ignores it via `?`)
- Shortcut conflicts: if another app has `CmdOrCtrl+Shift+T`, Tauri's registration may silently fail or override

- **Next:** FE/BE to draft implementation plan.
- **Commands:** `/call FE Post column reorder UI plan.` `/call BE Post backend plan for display_order + capabilities.`

---

### API Contract (FE + BE)

**Desktop app — Tauri IPC changes:**

1. `update_project` command — accept `display_order: Option<f64>` in `UpdateProjectInput`
2. `list_projects` query — `ORDER BY display_order ASC, created_at DESC`
3. No new command needed

**Web app — Server action changes:**

1. `updateProject` action — accept `displayOrder` via FormData or direct param
2. `listProjects` query — order by `displayOrder`

**Type changes:**

```typescript
// types.ts (desktop)
interface Project {
  // ... existing fields
  displayOrder: number;  // NEW
}

interface UpdateProjectInput {
  name?: string;
  color?: string;
  displayOrder?: number;  // NEW
}
```

**Error shape:** Existing pattern — throws string error from Rust, caught by React try/catch.

---

### Implementation Plan (FE)

**Key files (desktop):**
- `taskflow-desktop/src/components/kanban-board.tsx` — add outer DndContext for columns
- `taskflow-desktop/src/lib/types.ts` — add `displayOrder` to `Project` + `UpdateProjectInput`

**Key files (web):**
- `taskflow/src/components/kanban-board.tsx` — same column DnD changes
- `taskflow/src/db/schema.ts` — add `displayOrder` column to `projects`

**Approach:**
1. Import `horizontalListSortingStrategy` from `@dnd-kit/sortable`
2. Create a `SortableColumn` wrapper that uses `useSortable` for each column
3. Wrap all columns in an outer `DndContext` + `SortableContext` (horizontal)
4. The existing inner DnD for task cards stays unchanged
5. `handleColumnDragEnd` computes fractional `displayOrder` and calls `updateProject`
6. Sort `columns` array by `displayOrder` before rendering
7. Add a drag handle (grip icon) to the column header

**Accessibility:**
- Keyboard column reorder: `@dnd-kit` keyboard sensor supports horizontal movement

---

### Implementation Plan (BE)

**Key files (desktop):**
- `taskflow-desktop/src-tauri/src/db.rs` — add `display_order REAL DEFAULT 0` column + backfill
- `taskflow-desktop/src-tauri/src/models.rs` — add `display_order` to `Project` + `UpdateProjectInput`
- `taskflow-desktop/src-tauri/src/commands/projects.rs` — handle `display_order` in update + order by in list
- `taskflow-desktop/src-tauri/capabilities/default.json` — NEW FILE for Tauri v2 permissions

**Key files (web):**
- `taskflow/src/db/schema.ts` — add `displayOrder` column
- `taskflow/src/actions/projects.ts` — handle `displayOrder` in update
- `taskflow/src/db/index.ts` (or `instrumentation.ts`) — ALTER TABLE migration

---

### Test Plan (QA)

- **Ack:** Test plan requested for column reorder + global shortcut fix.

- **Output:**

**Scope:** Column drag-and-drop reorder + global shortcut functionality

**P0 (must pass before merge):**
- [ ] Drag column right → order persists after reload
- [ ] Drag column left → order persists after reload
- [ ] "Unassigned" column stays at the end (not draggable)
- [ ] Task card DnD still works within/between columns after column DnD is added
- [ ] `CmdOrCtrl+Shift+T` opens quick-add bar when app is in background (desktop)
- [ ] `CmdOrCtrl+Shift+T` opens quick-add bar when app is in foreground (desktop)

**P1 (should pass):**
- [ ] Column drag doesn't interfere with task card drag (nested contexts)
- [ ] Rapid column drags → no stale state
- [ ] Column order preserved correctly with 5+ columns
- [ ] Quick-add bar from global shortcut correctly creates a task
- [ ] Global shortcut shows window if it was hidden/minimized

**P2 (nice to have):**
- [ ] Keyboard column reorder (arrow keys)
- [ ] Column drag overlay (floating column preview)
- [ ] Multiple monitors — window appears on the active monitor

**Data/Env Needs:** 4+ projects with tasks, macOS desktop build

**Automation Plan:**
- Unit: fractional `displayOrder` computation (reuse `computeSortOrder`)
- Integration: `update_project` with `display_order` field
- Manual: global shortcut testing (requires desktop app running)

**Risks/Mitigations:**
- Global shortcut testing is manual-only (cannot automate OS-level hotkeys in CI)
- Nested DnD context testing may be flaky in E2E → use unit tests for logic

- **Next:** DM to confirm milestones.
- **Commands:** `/signoff QA DoR`

---

### Release Plan (DM)

- **Ack:** Milestones and release plan for UI Package.

- **Output:**

**Milestones:**
1. **Phase 1 — Global shortcut fix** (low risk, config-only)
   - Create `capabilities/default.json`
   - Verify shortcut fires
2. **Phase 2 — Schema + backend** (low risk, additive column)
   - Add `display_order` column to `projects` in both web + desktop
   - Update `list_projects` ordering + `update_project` handler
3. **Phase 3 — Column reorder UI** (medium risk, nested DnD)
   - Add outer `DndContext` for columns in both web + desktop kanban boards
   - Verify task card DnD still works

**Rollout:** No feature flag needed. `display_order` defaults to 0 (existing order preserved). Capabilities file is additive.

**Monitoring:** Watch for console errors from global shortcut registration.

**Rollback:**
- Phase 1: Delete `capabilities/default.json` (reverts to no-shortcut behavior)
- Phase 2: Column is harmless if unused
- Phase 3: Revert FE code; columns render in default order

**Risks:**
- macOS Accessibility permission may need to be granted manually by the user
- Nested DnD contexts have limited community examples — test thoroughly

**DoR Checklist:**
- [x] PM posted Feature Brief
- [x] ARCH posted design direction (no ADR needed)
- [x] FE/BE posted API contract + implementation plan
- [x] QA posted test plan
- [x] DM confirmed milestones/risks

**Signoff commands:**
```
/signoff PM DoR
/signoff QA DoR
/signoff ARCH DoR
/signoff DM DoR
```

---

## Solo (CTO) Plan

### Clarifying Questions (resolved)

- **What's the column reorder scope?** Both web + desktop kanban boards need horizontal column DnD. "Unassigned" stays last.
- **Why is the global shortcut broken?** Missing Tauri v2 `capabilities/default.json`. The Rust code is correct.
- **Nested DnD?** `@dnd-kit` supports nested `DndContext`. Outer = columns (horizontal), inner = cards (vertical). Already proven pattern.

### Cursor Discovery Prompt

```
I need to add horizontal drag-and-drop for project columns on the kanban board, and fix the broken global shortcut in the desktop app.

Please investigate and report back:

1. FILE: taskflow-desktop/src/components/kanban-board.tsx
   - How is the `columns` array built and rendered (line ~285-294)?
   - Is there an outer DndContext or just one?
   - How does handleDragEnd distinguish column drags from card drags?

2. FILE: taskflow-desktop/src-tauri/src/commands/projects.rs
   - What does list_projects ORDER BY?
   - Does update_project handle display_order?

3. FILE: taskflow-desktop/src-tauri/src/models.rs
   - Does the Project struct have a display_order field?
   - Does UpdateProjectInput accept display_order?

4. FILE: taskflow-desktop/src-tauri/src/db.rs
   - Does the projects table have a display_order column?

5. DIRECTORY: taskflow-desktop/src-tauri/capabilities/
   - Does this directory exist?
   - If yes, what permissions are declared?

6. FILE: taskflow-desktop/src-tauri/src/lib.rs
   - How is the global shortcut registered (line ~121-131)?
   - Is there any error handling if registration fails?

7. FILE: taskflow/src/db/schema.ts
   - Does the projects table have a displayOrder column?

8. FILE: taskflow/src/components/kanban-board.tsx
   - Same questions as #1 but for the web app

Report: for each file, list the relevant code and flag what's missing.
```

### Phase 1 — Global Shortcut Fix (1 of 3)

```
PHASE 1: Fix the broken global shortcut in the desktop app

CONTEXT:
- The global shortcut CmdOrCtrl+Shift+T is registered in lib.rs:125 but silently fails
- Root cause: Tauri v2 requires a capabilities/default.json file for plugin permissions
- The capabilities/ directory does not exist at all

FILES TO CREATE:
- taskflow-desktop/src-tauri/capabilities/default.json

TASKS:

1. Create directory: taskflow-desktop/src-tauri/capabilities/

2. Create file: taskflow-desktop/src-tauri/capabilities/default.json
   Content:
   {
     "identifier": "default",
     "description": "Default capabilities for TaskFlow desktop",
     "windows": ["main"],
     "permissions": [
       "core:default",
       "global-shortcut:allow-register",
       "global-shortcut:allow-unregister",
       "global-shortcut:allow-is-registered",
       "notification:default",
       "dialog:default",
       "autostart:default",
       "window-state:default",
       "process:default",
       "updater:default"
     ]
   }

DO NOT modify any other files in this phase.

Return a STATUS REPORT listing what you created and why.
```

### Phase 2 — Schema + Backend for Column Reorder (2 of 3)

```
PHASE 2: Add display_order column to projects + update backend queries

CONTEXT:
- Projects need a display_order REAL column for kanban column ordering
- Same fractional indexing pattern as tasks.sort_order
- Both web app and desktop app need changes

FILES TO MODIFY (Desktop — Rust):
- taskflow-desktop/src-tauri/src/db.rs
- taskflow-desktop/src-tauri/src/models.rs
- taskflow-desktop/src-tauri/src/commands/projects.rs

FILES TO MODIFY (Web — TypeScript):
- taskflow/src/db/schema.ts
- taskflow/src/actions/projects.ts
- taskflow/src/db/index.ts (if ALTER TABLE migrations are done here)
  OR taskflow/src/instrumentation.ts (check which file handles dynamic migrations)

TASKS:

1. Desktop — db.rs:
   In run_migrations(), add to the projects CREATE TABLE:
     display_order REAL DEFAULT 0
   (Add it in the CREATE TABLE statement since tables are created fresh if not existing)

2. Desktop — db.rs:
   After the CREATE TABLE block, add a migration to backfill:
     ALTER TABLE projects ADD COLUMN display_order REAL DEFAULT 0;
   (Use try/catch pattern — if column already exists, SQLite will error and we ignore it)
   Then: UPDATE projects SET display_order = rowid WHERE display_order = 0;

3. Desktop — models.rs:
   a) Add to Project struct:
      pub display_order: f64,
   b) Add to UpdateProjectInput:
      pub display_order: Option<f64>,

4. Desktop — commands/projects.rs:
   a) In row_to_project(), add:
      display_order: row.get("display_order")?,
   b) In list_projects(), change ORDER BY to:
      ORDER BY p.display_order ASC, p.created_at DESC
   c) In update_project(), add handler for display_order:
      if let Some(order) = updates.display_order {
          set_clauses.push("display_order = ?".to_string());
          param_values.push(Box::new(order));
      }

5. Desktop — types.ts:
   a) Add to Project interface:
      displayOrder: number;
   b) Add to UpdateProjectInput interface:
      displayOrder?: number;

6. Web — schema.ts:
   Add to projects table:
     displayOrder: real("display_order").default(0),

7. Web — actions/projects.ts:
   In updateProject(), add handling for displayOrder:
     Accept displayOrder as a parameter (change from FormData to direct params
     if needed, or add it to the FormData parsing).

8. Web — Check instrumentation.ts or db/index.ts:
   Add ALTER TABLE migration for display_order column on projects
   (same try/catch pattern used for tasks.sort_order).

DO NOT touch any frontend/UI files in this phase.

Return a STATUS REPORT listing every change (file, line, what changed).
```

### Phase 3 — Column Reorder UI (3 of 3)

```
PHASE 3: Add horizontal drag-and-drop for project columns on the kanban board

CONTEXT:
- display_order column added in Phase 2
- updateProject now accepts displayOrder
- list_projects returns projects sorted by display_order
- @dnd-kit/sortable is already installed
- Use nested DndContext: outer = columns (horizontal), inner = cards (vertical)
- "Unassigned" column is NOT draggable (always last)

FILES TO MODIFY (Desktop):
- taskflow-desktop/src/components/kanban-board.tsx
- taskflow-desktop/src/lib/api.ts (if updateProject signature changes)

FILES TO MODIFY (Web):
- taskflow/src/components/kanban-board.tsx

TASKS:

1. In kanban-board.tsx (both apps), add imports:
   import { horizontalListSortingStrategy } from "@dnd-kit/sortable";

2. Create a SortableColumn wrapper component:
   - Uses useSortable({ id: column.id })
   - Applies horizontal transform + transition
   - Renders the existing Column component inside
   - Adds a GripVertical drag handle to the column header
   - "Unassigned" column does NOT use SortableColumn (rendered separately, not draggable)

3. In KanbanBoard component:
   a) Separate project columns from the "Unassigned" column
   b) Wrap project columns in a NEW outer DndContext + SortableContext:
      - SortableContext items = project column IDs
      - strategy = horizontalListSortingStrategy
      - collisionDetection = closestCenter (better for horizontal)
   c) Render "Unassigned" column OUTSIDE the outer SortableContext (always last)
   d) The existing inner DndContext (for task cards) stays as-is inside each Column

4. Add handleColumnDragEnd:
   - Get active column ID and over column ID
   - Find old and new index in the sorted project columns array
   - Compute new displayOrder using computeSortOrder() (already exists)
   - Optimistic: reorder local column array immediately
   - Call updateProject(id, { displayOrder: newOrder })
   - Roll back on error

5. Add state for column reorder:
   - localProjects state (mirrors props, optimistic updates)
   - activeColumn state for DragOverlay (optional — can show a column outline)

6. Add a DragOverlay for the outer context:
   - Show a semi-transparent column outline while dragging
   - Or just show the column header text

7. Column header change:
   - Add a GripVertical icon (from lucide-react, already imported)
   - Position it left of the column title
   - Use {...listeners} {...attributes} from useSortable on the grip icon
   - Only show grip on project columns, NOT on "Unassigned"

IMPORTANT CONSTRAINTS:
- Do NOT break existing task card drag-and-drop
- Keep all existing features (show/hide completed, add task footer, task detail modal)
- Keep React.memo on SortableTaskCard
- Nested DndContext is the pattern: outer handles columns, inner handles cards
- Events do NOT leak between nested contexts in @dnd-kit

Return a STATUS REPORT listing every change (file, line, what changed).
```

---

## Comparison

| Dimension | Agents Plan | Solo (CTO) Plan |
|---|---|---|
| **Scope** | Full artifact set (brief, ADR direction, contract, test plan, release plan) | Focused Cursor prompts (discovery + 3 phases) |
| **Architecture** | Explicit nested DndContext rationale + capabilities fix analysis | Same approach, embedded in phase prompts |
| **Root cause analysis** | ARCH identifies missing capabilities dir as root cause | Same finding, documented in Phase 1 prompt |
| **Testing** | Detailed P0/P1/P2 test plan with automation strategy | Testing implied by acceptance criteria |
| **Risk coverage** | macOS Accessibility permissions, nested DnD edge cases, shortcut conflicts | Mentions constraints but fewer edge cases explicit |
| **Phasing** | 3 milestones in release plan | 3 Cursor phases (aligned) |
| **Execution speed** | Slower — 6 artifacts to review | Faster — jump to Cursor prompts |
| **Overhead** | Higher — but the nested DnD + global shortcut debugging justifies it | Lower — right-sized if team is confident |

### Recommendation

**Use the Solo (CTO) Plan for execution, referencing the Agents Plan test plan.** The 3-phase Cursor prompt approach maps cleanly to the 3 milestones. The global shortcut fix is a quick config win (Phase 1). The schema change is low-risk (Phase 2). The nested DnD is the only complex piece (Phase 3), and the Agents test plan P0 checklist should be used for validation.

**Action items:**
1. Run **Cursor Discovery Prompt** to validate assumptions
2. Execute **Phase 1** (global shortcut fix — capabilities file)
3. Execute **Phase 2** (schema + backend for column reorder)
4. Execute **Phase 3** (column reorder UI — nested DndContext)
5. Validate against **QA P0 checklist** from Agents Plan
