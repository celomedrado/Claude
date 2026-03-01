# Feature Implementation Plan: Task Manager Commands & Kanban UX

**Overall Progress:** `0%`

## TLDR

Four connected improvements to TaskFlow: make Kanban the default view with inline complete/delete actions, add a global `Cmd/Ctrl+K` command bar for quick task creation, build a smart input parser that recognizes `@project`, natural dates, priorities (`p0/p1/p2`), and recurrence patterns (`every monday`), plus a DB migration for recurring task support.

## Critical Decisions

- **Command bar UX**: Single floating text input with inline parsing + autocomplete dropdown (Todoist/Linear-style), not the existing multi-field form.
- **Recurrence model**: Keep completed instances as history (`done` status). Create a new `todo` task for the next occurrence on completion.
- **Quick-add shortcut**: `Cmd/Ctrl+K` opens the command bar.
- **Date parsing**: Custom lightweight parser (no external NLP library) — covers "today", "tomorrow", "next [day]", "every [day]".
- **No global state library needed**: Command bar state managed via React context + local state, consistent with existing patterns.

## Tasks

- [ ] 🟥 **Phase 1: Kanban Default View + Card Actions**
  - [ ] 🟥 **1.1 Change default view to "board"**
    - File: `src/components/tasks-view.tsx`
    - Change `useState<ViewMode>("list")` → `useState<ViewMode>("board")`
  - [ ] 🟥 **1.2 Add complete & delete action buttons to Kanban TaskCard**
    - File: `src/components/kanban-board.tsx`
    - Add a checkmark button (mark done → calls `updateTask(id, { status: "done" })`)
    - Add a trash button (delete → calls `deleteTask(id)` with confirmation)
    - Position: top-right of card, visible on hover
  - [ ] 🟥 **1.3 Filter completed tasks from Kanban by default**
    - File: `src/components/kanban-board.tsx`
    - Filter out tasks with `status === "done"` or `status === "archived"` from column task lists
    - Add a "Show completed" toggle checkbox above the board
    - When toggled on, done tasks appear in their project column with a muted/struck-through style

- [ ] 🟥 **Phase 2: Global Keyboard Shortcuts + Quick-Add Command Bar**
  - [ ] 🟥 **2.1 Create `useHotkeys` hook**
    - New file: `src/hooks/use-hotkeys.ts`
    - Listens for global keydown events, skips when user is focused on input/textarea/contenteditable
    - Supports modifier keys (`Cmd/Ctrl+K`)
    - Cleanup on unmount
  - [ ] 🟥 **2.2 Build the Quick-Add Command Bar component**
    - New file: `src/components/quick-add-bar.tsx`
    - Floating modal overlay (centered, like a command palette)
    - Single text input with placeholder: `Type a task... (@project, p0-p2, tomorrow, every monday)`
    - Shows parsed token chips below the input (e.g., `[Project: User Interviews]` `[Due: Mar 3]` `[Priority: High]`)
    - Submit on `Enter`, close on `Escape`
    - Calls `createTask()` server action with parsed fields
  - [ ] 🟥 **2.3 Wire up `Cmd/Ctrl+K` to open the command bar**
    - File: `src/components/app-shell.tsx` or `src/app/(app)/layout.tsx`
    - Register the hotkey at the app layout level
    - Pass `projects` list to the command bar for `@project` matching
  - [ ] 🟥 **2.4 Add `@project` autocomplete dropdown**
    - Inside `quick-add-bar.tsx`
    - Trigger: when user types `@` followed by characters
    - Show filtered project list in a dropdown, navigable with arrow keys + Enter to select
    - On select, replace `@text` with a chip and set `projectId`

- [ ] 🟥 **Phase 3: Smart Input Parsing**
  - [ ] 🟥 **3.1 Build the input parser utility**
    - New file: `src/lib/task-parser.ts`
    - Pure function: `parseTaskInput(text: string, projects: Project[]) → ParsedTask`
    - Returns: `{ title: string, projectId?: string, priority?: string, dueDate?: string, recurrence?: string }`
    - Strips matched tokens from title, preserves the rest as the clean task title
  - [ ] 🟥 **3.2 Priority parsing**
    - Detect `p0` → `high`, `p1` → `medium`, `p2` → `low` (case-insensitive)
    - Also support `p3` → `urgent` if desired, or map `p0` → `urgent` — match to existing enum
    - Decision: `p0` = urgent, `p1` = high, `p2` = medium, `p3` = low
  - [ ] 🟥 **3.3 Date parsing**
    - Detect: "today", "tomorrow", "next monday", "next tuesday", ..., "next sunday"
    - Convert to ISO date string relative to current date
    - Handle edge cases: "next monday" when today is monday → next week's monday
  - [ ] 🟥 **3.4 Recurrence parsing**
    - Detect: "every monday", "every tuesday", ..., "every day", "every weekday"
    - Store as a `recurrenceRule` string (e.g., `"weekly:1"` for Monday, `"daily"` for every day)
    - Also set the initial `dueDate` to the next occurrence of that day
  - [ ] 🟥 **3.5 Project mention parsing (`@project`)**
    - Detect `@word` pattern, fuzzy match against project names
    - If exact match → auto-assign. If multiple matches → trigger autocomplete dropdown (handled in 2.4)

- [ ] 🟥 **Phase 4: Recurring Tasks — Schema & Logic**
  - [ ] 🟥 **4.1 DB migration: add recurrence fields to tasks table**
    - Add `recurrence_rule TEXT` — stores the recurrence pattern (e.g., `"weekly:1"`, `"daily"`)
    - Add `recurrence_source_id TEXT REFERENCES tasks(id) ON DELETE SET NULL` — links to the original task for history tracking
    - Run migration via Drizzle
  - [ ] 🟥 **4.2 Update `CreateTaskInput` and `createTask` action**
    - File: `src/actions/tasks.ts`
    - Add `recurrenceRule?: string` to `CreateTaskInput`
    - Persist `recurrenceRule` and optionally `recurrenceSourceId` on insert
  - [ ] 🟥 **4.3 Implement recurrence-on-complete logic**
    - File: `src/actions/tasks.ts`
    - In `updateTask`, when `status` changes to `"done"` and task has a `recurrenceRule`:
      1. Calculate the next due date from the rule
      2. Create a new task with same title, description, project, priority, and `recurrenceRule`
      3. Set `recurrenceSourceId` to the original task's ID (or the completed task's source ID if it's already a recurrence)
    - The completed task stays as `done` (history preserved)
  - [ ] 🟥 **4.4 Update Kanban & List views to show recurrence indicator**
    - Show a small "repeat" icon on recurring task cards
    - File: `src/components/kanban-board.tsx` and `src/components/task-list.tsx`

## File Change Summary

| File | Change Type | Phase |
|------|------------|-------|
| `src/components/tasks-view.tsx` | Edit (default view) | 1 |
| `src/components/kanban-board.tsx` | Edit (card actions, completed filter, recurrence icon) | 1, 4 |
| `src/components/task-list.tsx` | Edit (recurrence icon) | 4 |
| `src/hooks/use-hotkeys.ts` | **New** (global keyboard hook) | 2 |
| `src/components/quick-add-bar.tsx` | **New** (command bar component) | 2 |
| `src/app/(app)/layout.tsx` | Edit (mount command bar + hotkey) | 2 |
| `src/lib/task-parser.ts` | **New** (smart input parser) | 3 |
| `src/db/schema.ts` | Edit (add recurrence fields) | 4 |
| `src/actions/tasks.ts` | Edit (recurrence in create/update) | 4 |
| `drizzle/` | **New** migration file | 4 |

## Risks & Mitigations

- **Browser shortcut conflict**: `Cmd+K` is used by some browsers (address bar in Chrome). `e.preventDefault()` in the handler will suppress it when the app is focused.
- **Date parsing ambiguity**: "next sunday" could mean this week or next week depending on interpretation. We'll use "the next upcoming [day]" consistently — if today is Sunday, "next sunday" = 7 days from now.
- **Recurrence on complete**: Must guard against double-creation if `updateTask` is called multiple times rapidly. Use a check: only create next occurrence if no existing `todo` task with the same `recurrenceSourceId` exists.
