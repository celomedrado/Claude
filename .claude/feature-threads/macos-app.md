# Feature Thread: macOS App

- **Feature:** macOS Desktop App
- **Goal:** Transform the TaskFlow Next.js web app into a native macOS desktop application with deep OS integration
- **Priority/Target:** High / 2026-01-03
- **Owners:** PM / ARCH / FE / BE / QA / DM
- **Status:** Implementation Complete (100%)
- **Risks:** Major architectural refactor (server actions → IPC), auth rewrite, Next.js server-side features incompatible with desktop, significant effort
- **Decisions made:** Tauri v2 (not Electron), single-user no-auth, SPA with React Router

---

## Implementation Progress

| Phase | Status | Description |
|---|---|---|
| **Phase 1** | ✅ Complete | Tauri v2 + Vite + React project scaffold |
| **Phase 2** | ✅ Complete | Rust backend: SQLite, task/project CRUD IPC commands |
| **Phase 3** | ✅ Complete | AI features (OpenAI proxy), settings, file export |
| **Phase 4** | ✅ Complete | Native macOS: system tray, notifications, global shortcuts, auto-start |
| **Phase 5** | ✅ Complete | Settings page, data import, React SPA router, all components ported |

### Files Created: `taskflow-desktop/`

**Project config:**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `postcss.config.js`, `index.html`

**Rust backend (`src-tauri/`):**
- `Cargo.toml`, `tauri.conf.json`, `build.rs`
- `src/main.rs` — entry point
- `src/lib.rs` — Tauri app setup (plugins, tray, shortcuts, notifications)
- `src/db.rs` — SQLite init + migrations
- `src/models.rs` — shared structs (Task, Project, Settings, etc.)
- `src/notifications.rs` — background overdue task checker
- `src/commands/tasks.rs` — CRUD + recurrence + dashboard
- `src/commands/projects.rs` — CRUD with task counts
- `src/commands/ai.rs` — OpenAI proxy (extract, generate, categorize)
- `src/commands/app.rs` — settings, file export, data import

**React frontend (`src/`):**
- `main.tsx` — SPA entry point with React Router
- `globals.css` — Tailwind + theme variables
- `lib/types.ts` — shared TypeScript types
- `lib/api.ts` — all Tauri IPC invoke wrappers
- `lib/utils.ts` — cn() utility
- `lib/task-parser.ts` — smart task input parser (ported as-is)
- `hooks/use-hotkeys.ts` — keyboard shortcut hook
- `components/app-shell.tsx` — layout with sidebar + quick-add
- `components/sidebar.tsx` — navigation (React Router)
- `components/quick-add-provider.tsx` — Cmd+K + global shortcut listener
- `components/quick-add-bar.tsx` — command palette for task creation
- `components/task-list.tsx` — list view with filters
- `components/task-detail.tsx` — edit modal
- `components/task-form.tsx` — inline creation form
- `components/tasks-view.tsx` — list/board toggle
- `components/kanban-board.tsx` — drag-and-drop board
- `components/project-form.tsx` — create/edit project
- `components/ui/button.tsx` — reusable button component
- `pages/dashboard.tsx` — stats + upcoming + recent
- `pages/tasks.tsx` — all tasks view
- `pages/extract.tsx` — AI task extraction
- `pages/generate.tsx` — AI document generation + export
- `pages/settings.tsx` — app preferences (API key, auto-launch, notifications)
- `pages/projects/index.tsx` — project list
- `pages/projects/detail.tsx` — project detail with tasks

---

## Agents Plan

### Feature Brief (PM)

**Ack:** Feature Brief requested for macOS Desktop App.

**Summary:** Package TaskFlow as a native macOS desktop application with deep OS integration (file system access, native notifications, menu bar, auto-launch, keyboard shortcuts). The app must work fully offline with the local SQLite database.

**Problem / Opportunity:** TaskFlow is currently browser-only. Users must keep a browser tab open, can't get native notifications for overdue tasks, and lose context when switching between apps. A native macOS app provides always-on task management with OS-level integration.

**Goals:**
- Native macOS `.app` bundle installable via DMG or Homebrew
- Full offline functionality (SQLite is already local)
- Native macOS menu bar with app commands
- System notifications for due/overdue tasks
- Auto-launch on login (optional user setting)
- Global keyboard shortcuts (e.g., quick-add from anywhere)
- Dock icon with badge count (pending tasks)
- File system access for AI doc export (save to disk)

**Non-goals:**
- iOS/iPadOS app (separate effort)
- Windows/Linux desktop (can be added later with same framework)
- Cloud sync between devices (future feature)
- App Store distribution (direct download first)

**User Stories:**
1. As a user, I install TaskFlow.app and it runs as a native macOS window with a dock icon.
2. As a user, I receive native notifications when tasks are overdue.
3. As a user, I press a global hotkey to open the quick-add bar from any app.
4. As a user, the app auto-launches on login and is available in the menu bar.
5. As a user, I export AI-generated documents directly to a file on disk.
6. As a user, the app works fully offline — all my tasks are local.

**Acceptance Criteria:**
- **Given** the app is installed, **when** I open TaskFlow.app, **then** it launches a native macOS window with full task management UI.
- **Given** a task is overdue, **when** the due date passes, **then** I receive a macOS notification.
- **Given** the app is running, **when** I press the global hotkey (Cmd+Shift+T), **then** the quick-add bar appears.
- **Given** no internet connection, **when** I create/edit tasks, **then** everything works (AI features show offline notice).

**Edge Cases:**
- First launch: no SQLite DB exists yet → create and seed
- Multiple macOS user accounts → each has separate data dir (`~/Library/Application Support/TaskFlow/`)
- App update mechanism → auto-update via Tauri's built-in updater or Sparkle
- Dock badge count must update in real-time as tasks change
- Global hotkey conflict with other apps

**NFRs:**
- App binary < 20MB (Tauri achieves ~5-10MB; Electron would be 150MB+)
- Cold start < 2 seconds
- Memory usage < 100MB idle
- No external server required for core functionality
- AI features require internet (OpenAI API) — degrade gracefully

**Dependencies:**
- Existing: `better-sqlite3`, `drizzle-orm`, `@dnd-kit/*`, all Radix UI, `openai`
- New: Tauri (recommended) or Electron, native notification API, global shortcut API

**Analytics / Success Metrics:**
- % of users who switch from web to desktop
- Daily active usage (app opens per day)
- Notification engagement rate
- Quick-add hotkey usage frequency

**Rollout Plan:**
- Phase 1: Basic macOS wrapper (window, dock icon, offline)
- Phase 2: Native features (notifications, global hotkey, menu bar)
- Phase 3: Polish (auto-update, auto-launch, dock badge, file export)

**Open Questions:**
- Tauri vs Electron — see ARCH recommendation below
- Auth model — single-user desktop vs multi-user

---

### Architecture Direction + ADR (ARCH)

**Ack:** Reviewing architecture for macOS desktop conversion.

**Output — ADR: Desktop Packaging Framework**

#### Context
TaskFlow is a Next.js 16 App Router application with:
- SQLite (better-sqlite3) as local DB
- NextAuth for JWT-based auth
- Server Actions for data mutations
- OpenAI API for AI features
- Standalone output mode configured

We need to wrap this as a native macOS app with deep OS integration.

#### Decision: **Tauri v2**

#### Options Considered

| | Tauri v2 | Electron | PWA |
|---|---|---|---|
| **Binary size** | ~5-10MB | ~150MB+ | 0 (browser) |
| **Memory** | ~30-50MB | ~200MB+ | Browser tab |
| **Native APIs** | Excellent (Rust backend) | Good (Node.js backend) | Limited |
| **macOS integration** | Native menu, tray, notifications, global shortcuts, auto-updater | Same via Electron APIs | Minimal |
| **Security** | Strong (Rust, no Node.js in prod) | Weaker (full Node.js runtime) | Browser sandbox |
| **Dev experience** | Rust backend + web frontend | Node.js backend + web frontend | Standard web |
| **Bundled runtime** | macOS WebView (WebKit) | Chromium | None |
| **SQLite** | Native Rust bindings (excellent) | better-sqlite3 (works) | Not available |

**Recommendation: Tauri v2** because:
1. **Tiny binary** (~5-10MB vs 150MB+) — aligns with "keep infra costs low"
2. **Native macOS WebView** — uses system WebKit, not bundled Chromium
3. **Rust backend** — perfect for SQLite operations, file system access, notifications
4. **Deep OS integration** — built-in: menu bar, tray, global shortcuts, notifications, auto-updater, file dialogs
5. **SQLite already local** — Tauri's Rust backend can own the DB directly

#### Architecture: Tauri + React SPA (not Next.js SSR)

**Critical insight:** Next.js Server Actions, middleware, API routes, and SSR are **incompatible** with Tauri's model. We must refactor to a **React SPA** that communicates with Tauri's Rust backend via IPC commands.

```
┌─────────────────────────────────────────────┐
│  macOS App (Tauri)                          │
│  ┌───────────────────────────────────────┐  │
│  │  WebView (React SPA)                  │  │
│  │  - All existing React components      │  │
│  │  - Tailwind + Radix UI (unchanged)    │  │
│  │  - @dnd-kit (unchanged)               │  │
│  │  - React Router (replaces Next router)│  │
│  └──────────────┬────────────────────────┘  │
│                 │ IPC (invoke/listen)        │
│  ┌──────────────▼────────────────────────┐  │
│  │  Rust Backend                         │  │
│  │  - SQLite (rusqlite/sqlx)             │  │
│  │  - Auth (local, single-user)          │  │
│  │  - File system access                 │  │
│  │  - Native notifications               │  │
│  │  - Global shortcuts                    │  │
│  │  - Menu bar / tray                     │  │
│  │  - Auto-updater                        │  │
│  │  - OpenAI API proxy                    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### Consequences
- **Must refactor:** Server Actions → Tauri IPC commands
- **Must refactor:** NextAuth → local single-user auth (or remove auth entirely for desktop)
- **Must refactor:** Next.js App Router → React Router (or TanStack Router)
- **Must refactor:** API routes → Rust IPC handlers
- **Keep as-is:** All React components, Tailwind, Radix UI, @dnd-kit, lucide-react
- **Keep as-is:** Drizzle schema definitions (reference for Rust DB layer)
- **Risk:** Large refactor scope — mitigate with phased approach

#### Auth Strategy for Desktop

**Recommendation: Remove auth for v1.** Desktop is single-user — the macOS user account IS the auth boundary. This eliminates NextAuth, middleware, session management, and bcrypt entirely.

If multi-user is needed later, add a simple local PIN/password stored in macOS Keychain.

#### Rollback / Migration
- Keep the Next.js web app intact in a separate directory or branch
- Desktop app is a new Tauri project that imports the React components
- Both can coexist — web version remains deployable

#### Observability
- Tauri provides crash reporting hooks
- Log to `~/Library/Logs/TaskFlow/` for debugging
- Sentry integration available via Tauri plugin

---

### API Contract (FE + BE)

**Ack:** Drafting IPC contract between React SPA frontend and Tauri Rust backend.

The "API" in a Tauri app is the IPC command interface. Frontend calls `invoke("command_name", { args })` and the Rust backend handles it.

#### Task Commands

```typescript
// Frontend (TypeScript) — invoke Tauri commands
import { invoke } from "@tauri-apps/api/core";

// Tasks
invoke<Task[]>("list_tasks", { filter?: TaskFilter })
invoke<Task>("create_task", { input: CreateTaskInput })
invoke<Task>("update_task", { id: string, updates: UpdateTaskInput })
invoke("delete_task", { id: string })
invoke("reorder_task", { id: string, sortOrder: number })

// Projects
invoke<Project[]>("list_projects")
invoke<Project>("create_project", { name: string, color: string })
invoke<Project>("update_project", { id: string, updates: UpdateProjectInput })
invoke("delete_project", { id: string })

// AI (requires internet)
invoke<ExtractedTask[]>("extract_tasks", { text: string })
invoke<string>("generate_document", { taskIds: string[], template: string })
invoke<void>("categorize_task", { id: string })

// App
invoke<AppSettings>("get_settings")
invoke("update_settings", { settings: Partial<AppSettings> })
invoke("export_document", { content: string, filename: string }) // native file dialog
```

#### Event Listeners (Rust → Frontend)

```typescript
import { listen } from "@tauri-apps/api/event";

listen("task-overdue", (event: { taskId: string, title: string }) => { ... })
listen("notification-clicked", (event: { taskId: string }) => { ... })
listen("global-shortcut-triggered", (event: { shortcut: string }) => { ... })
```

#### Error Shape

```typescript
type TauriError = {
  code: "NOT_FOUND" | "VALIDATION" | "DB_ERROR" | "AI_OFFLINE" | "AI_ERROR";
  message: string;
};
```

---

### Implementation Plan (FE)

**Ack:** Planning frontend migration from Next.js to Tauri React SPA.

**Key principle:** Maximize React component reuse. ~90% of UI code stays the same.

**What changes:**
1. Replace Next.js App Router with React Router
2. Replace `"use server"` actions with `invoke()` calls to Tauri backend
3. Replace `next/navigation` (redirect, useRouter) with React Router equivalents
4. Replace NextAuth SessionProvider with simple React context (or remove auth)
5. Replace `revalidatePath()` with React Query / SWR for data fetching + cache invalidation
6. Replace `next/image` with standard `<img>` tags
7. Add Tauri-specific UI: window controls, menu bar integration, settings panel

**What stays unchanged:**
- All Tailwind CSS classes and styling
- All Radix UI components (Dialog, Select, Popover, Tabs, Toast, etc.)
- @dnd-kit Kanban board (drag-and-drop)
- lucide-react icons
- TaskDetail, TaskForm, ProjectForm, Sidebar, AppShell components
- Quick-add bar (connect to global hotkey)

**New FE features:**
- Native window chrome (Tauri handles title bar)
- Settings panel (auto-launch, notification preferences, API key input)
- Offline indicator for AI features
- File export dialog integration

---

### Implementation Plan (BE — Rust)

**Ack:** Planning Rust backend for Tauri.

**Key files to create:**
```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── src/
│   ├── main.rs          # Tauri app setup, menu, tray, shortcuts
│   ├── db.rs            # SQLite connection + migrations
│   ├── commands/
│   │   ├── tasks.rs     # CRUD + reorder + recurrence
│   │   ├── projects.rs  # CRUD
│   │   ├── ai.rs        # OpenAI API proxy
│   │   └── app.rs       # Settings, export, etc.
│   ├── models.rs        # Task, Project, Settings structs
│   ├── notifications.rs # Overdue task checker + native notifications
│   └── scheduler.rs     # Background timer for notifications + recurrence
```

**DB migration:** Port the Drizzle schema to Rust SQL migrations (same table structure).

**SQLite location:** `~/Library/Application Support/com.taskflow.app/taskflow.db`

---

### Test Plan (QA)

**Ack:** Test plan for macOS desktop app.

**Scope:** Full app functionality in Tauri wrapper + native features.

**P0 (must pass):**
- [ ] App launches on macOS (Intel + Apple Silicon)
- [ ] Create, edit, delete tasks — persisted in SQLite
- [ ] Kanban drag-and-drop reorder works
- [ ] Projects CRUD works
- [ ] App works fully offline (no internet)
- [ ] Native notification fires for overdue task
- [ ] Global hotkey (Cmd+Shift+T) opens quick-add

**P1 (should pass):**
- [ ] Menu bar shows app commands (New Task, Preferences, Quit)
- [ ] Auto-launch on login setting works
- [ ] Dock badge shows pending task count
- [ ] File export saves document to disk via native dialog
- [ ] AI features work when online, show offline notice when not
- [ ] Window state (size, position) remembered between sessions
- [ ] App auto-update mechanism works

**P2 (nice to have):**
- [ ] Cold start < 2 seconds
- [ ] Memory < 100MB idle
- [ ] Binary size < 20MB
- [ ] Recurrence scheduling works in background

**Data/Env Needs:**
- macOS 13+ (Ventura) test machines (Intel + Apple Silicon)
- SQLite seeded with 50+ tasks across 5+ projects
- OpenAI API key for AI feature testing

**Automation Plan:**
- Unit tests: Rust backend commands (cargo test)
- Integration: Tauri's WebDriver-based E2E testing
- UI: Playwright with Tauri WebDriver adapter

---

### Release Plan (DM)

**Ack:** Release plan for macOS desktop app.

**Milestones:**

| Phase | Scope | Effort |
|---|---|---|
| **Phase 1** | Tauri project setup + React SPA migration (routing, data layer) | Large — 2-3 weeks |
| **Phase 2** | Port all CRUD to Rust IPC commands + remove NextAuth | Large — 2-3 weeks |
| **Phase 3** | Native features (notifications, global hotkey, menu bar, tray) | Medium — 1-2 weeks |
| **Phase 4** | Polish (auto-update, auto-launch, dock badge, file export, settings) | Medium — 1-2 weeks |
| **Phase 5** | QA + packaging (DMG, code signing, notarization) | Medium — 1 week |

**Risks:**
- **Scope creep** — large refactor from Next.js to SPA + Rust backend
- **Rust learning curve** — team needs Rust competency for backend
- **macOS code signing** — requires Apple Developer account ($99/year)
- **WebKit rendering differences** — Tauri uses WebKit, not Chromium (test CSS edge cases)

**Rollout:** Direct download from GitHub Releases → Homebrew Cask → Mac App Store (future)

**Rollback:** Web app remains fully functional as fallback.

**DoR Checklist:**
- [x] PM posted Feature Brief
- [x] ARCH posted design direction + ADR (Tauri v2 recommended)
- [x] FE/BE posted IPC contract
- [x] QA posted test plan
- [x] DM confirmed milestones/risks

---

## Solo (CTO) Plan

### Assessment

This is a **major architectural refactor**, not a simple feature. Converting a Next.js SSR app to a Tauri desktop app requires:

1. **New project scaffolding** — Tauri project alongside existing Next.js
2. **Frontend migration** — Next.js App Router → React Router SPA
3. **Backend rewrite** — Server Actions/API routes → Rust IPC commands
4. **Auth removal** — NextAuth not needed for single-user desktop
5. **Native features** — Notifications, global shortcuts, menu bar, tray

### Cursor Discovery Prompt

```
I'm planning to convert this Next.js web app into a native macOS app using Tauri v2. I need a complete inventory of what needs to change.

Please investigate and report:

1. SERVER-SIDE DEPENDENCIES — List every file that uses:
   - "use server" directive (server actions)
   - NextAuth / auth() / session
   - revalidatePath / revalidateTag
   - next/navigation (redirect, notFound)
   - next/image
   - next/cache
   - API route handlers (route.ts files)
   Report: file path, line numbers, what it does

2. CLIENT COMPONENTS — List every file with "use client":
   - What framework-specific imports does it use?
   - Does it call any server actions directly?
   Report: file path, server action calls, framework imports

3. DATABASE LAYER — Full audit:
   - How is the DB connection created? (src/db/index.ts)
   - All raw SQL usage (outside Drizzle)
   - All schema definitions
   Report: complete list of tables, columns, and raw SQL queries

4. EXTERNAL APIs:
   - OpenAI integration — which endpoints, what data flows
   Report: file paths, API calls, error handling

5. BUILD CONFIG:
   - next.config.ts settings
   - tsconfig.json paths and options
   - Tailwind config
   Report: anything that would break when moving to Vite/Tauri

For each item, classify as:
- KEEP: Works as-is in React SPA
- ADAPT: Needs minor changes (import paths, etc.)
- REWRITE: Needs significant refactoring
- REMOVE: Not needed in desktop app
```

### Phase 1 — Tauri Project Setup + React SPA Shell (1 of 5)

```
PHASE 1: Set up Tauri v2 project with React SPA and existing components

CONTEXT:
- We are converting a Next.js 16 app to a Tauri v2 macOS desktop app
- The existing app uses: React 19, Tailwind 4, Radix UI, @dnd-kit, lucide-react
- We need React Router (or TanStack Router) to replace Next.js App Router
- We need Vite as the bundler (Tauri standard)

TASKS:

1. Initialize Tauri v2 project:
   - Run: npm create tauri-app@latest (or manually scaffold)
   - Create src-tauri/ directory with Cargo.toml, tauri.conf.json, src/main.rs
   - Configure for macOS target, app identifier: com.taskflow.app

2. Set up Vite + React:
   - Create a new Vite config (vite.config.ts) alongside the Tauri project
   - Configure path aliases to match existing @/ imports
   - Install react-router-dom for client-side routing
   - Keep all existing dependencies: Tailwind 4, Radix UI, @dnd-kit, lucide-react, clsx, tailwind-merge, class-variance-authority

3. Create the SPA router:
   - Map existing Next.js routes to React Router:
     / → Dashboard
     /tasks → TasksView
     /projects → ProjectsList
     /projects/:id → ProjectDetail
     /extract → ExtractClient
     /generate → GenerateClient
   - No /login, /signup for desktop v1 (single-user, no auth)

4. Create a data layer abstraction:
   - Create src/lib/api.ts with functions that will call Tauri invoke():
     listTasks(), createTask(), updateTask(), deleteTask()
     listProjects(), createProject(), updateProject(), deleteProject()
     extractTasks(), generateDocument(), categorizeTask()
   - For now, stub them with TODO comments
   - Components will import from this layer instead of server actions

5. Copy and adapt the app shell:
   - Copy AppShell, Sidebar components
   - Replace next/link with react-router-dom Link
   - Replace useRouter() with useNavigate()
   - Remove SessionProvider wrapper

DO NOT implement Rust backend commands yet — that's Phase 2.
DO NOT port data fetching logic yet — use stubs.

Return a STATUS REPORT listing every file created/modified.
```

### Phase 2 — Rust Backend + SQLite (2 of 5)

```
PHASE 2: Implement Rust backend with SQLite and Tauri IPC commands

TASKS:

1. Set up SQLite in Rust:
   - Add rusqlite (or sqlx with sqlite feature) to Cargo.toml
   - Create src-tauri/src/db.rs:
     - DB path: ~/Library/Application Support/com.taskflow.app/taskflow.db
     - Create tables matching Drizzle schema (users, projects, tasks, meetings)
     - Include sort_order, recurrence_rule, recurrence_source_id columns
     - Enable WAL mode and foreign keys
     - Run migrations on startup

2. Implement task commands (src-tauri/src/commands/tasks.rs):
   - list_tasks(filter) → Vec<Task>
   - create_task(input) → Task
   - update_task(id, updates) → Task
   - delete_task(id)
   - reorder_task(id, sort_order)
   All commands scope to the single desktop user (no user_id filtering needed for v1)

3. Implement project commands (src-tauri/src/commands/projects.rs):
   - list_projects() → Vec<Project>
   - create_project(name, color) → Project
   - update_project(id, updates) → Project
   - delete_project(id)

4. Register all commands in main.rs:
   - tauri::Builder::default()
       .invoke_handler(tauri::generate_handler![...all commands...])

5. Wire up the frontend stubs from Phase 1:
   - Replace TODO stubs in src/lib/api.ts with actual invoke() calls
   - Add @tauri-apps/api dependency

Return a STATUS REPORT listing every Rust file created and every TS file modified.
```

### Phase 3 — AI Features + Data Migration (3 of 5)

```
PHASE 3: Port AI features to Rust backend and add data migration

TASKS:

1. Implement AI commands in Rust (src-tauri/src/commands/ai.rs):
   - extract_tasks(text) → calls OpenAI API from Rust (reqwest + serde)
   - generate_document(task_ids, template) → string
   - categorize_task(id) → updates task in DB
   - API key stored in macOS Keychain (tauri-plugin-keychain) or settings file

2. Add settings command (src-tauri/src/commands/app.rs):
   - get_settings() → AppSettings (JSON file in app data dir)
   - update_settings(partial) → AppSettings
   - Settings include: openai_api_key, auto_launch, notification_enabled, global_hotkey

3. Add file export:
   - export_document(content, suggested_filename) → opens native save dialog
   - Uses tauri::api::dialog::save_file

4. Add data migration tool:
   - import_from_web(db_path) → imports from existing taskflow.db
   - Copies tasks, projects, meetings from the web app's SQLite DB

Return a STATUS REPORT.
```

### Phase 4 — Native macOS Features (4 of 5)

```
PHASE 4: Add native macOS integrations

TASKS:

1. System tray + menu bar (main.rs):
   - Add system tray icon
   - Menu items: Show/Hide Window, New Task, Preferences, Quit
   - Dock icon with badge count (pending tasks)

2. Native notifications (src-tauri/src/notifications.rs):
   - Background timer (every 5 minutes) checks for overdue tasks
   - Fires macOS notification for each newly-overdue task
   - Click notification → open app and select that task

3. Global keyboard shortcut:
   - Register Cmd+Shift+T as global shortcut
   - When triggered: show/focus window + open quick-add bar
   - Use tauri-plugin-global-shortcut

4. Auto-launch on login:
   - Use tauri-plugin-autostart
   - Controlled by settings toggle

5. Window state persistence:
   - Remember window size and position between sessions
   - Use tauri-plugin-window-state

Return a STATUS REPORT.
```

### Phase 5 — Polish + Distribution (5 of 5)

```
PHASE 5: App polish, code signing, and distribution

TASKS:

1. App icon + branding:
   - Create .icns icon file for macOS
   - Set app name, version, copyright in tauri.conf.json
   - Configure DMG background image

2. Code signing + notarization:
   - Sign with Apple Developer certificate
   - Notarize via Apple's notary service
   - Configure in tauri.conf.json

3. Auto-updater:
   - Use tauri-plugin-updater
   - Host update manifest on GitHub Releases
   - Check for updates on launch + periodically

4. Build and package:
   - Build universal binary (Intel + Apple Silicon)
   - Package as .dmg
   - Create GitHub Release with binary

5. Offline handling:
   - Add network status detection
   - Show inline banner when offline (AI features unavailable)
   - Queue AI operations for when back online (optional)

Return a STATUS REPORT.
```

---

## Comparison

| Dimension | Agents Plan | Solo (CTO) Plan |
|---|---|---|
| **Scope** | Full artifact set (brief, ADR, IPC contract, test plan, release plan) | Discovery + 5-phase Cursor prompts |
| **Architecture** | Detailed ADR with Tauri vs Electron vs PWA comparison table | Same recommendation, embedded in phase prompts |
| **Packaging rec** | **Tauri v2** — with rationale (size, performance, security, native APIs) | **Tauri v2** — same conclusion |
| **Auth strategy** | Remove for v1, add Keychain-based PIN later | Same |
| **Backend detail** | Full IPC contract spec (commands, events, error shape) | Rust commands described per phase |
| **Testing** | Detailed P0/P1/P2 matrix with automation strategy | Testing implied per phase |
| **Risk coverage** | Scope creep, Rust learning curve, WebKit differences, code signing | Similar risks, less structured |
| **Effort estimate** | 5 phases, 8-11 weeks total | 5 phases, similar scope |
| **Execution speed** | Slower start (artifacts review), but stronger alignment | Faster start, iterate as you go |

### Recommendation

**Use the Agents Plan for alignment, Solo Plan for execution.**

This is a **large, high-risk architectural refactor** — exactly the kind of feature where the Agents Plan artifacts add real value:
- The **ADR** documents the Tauri decision with clear rationale (reference when questions arise)
- The **IPC Contract** is the critical interface between FE and Rust BE (must be agreed before coding)
- The **Test Plan** ensures native features are validated systematically

But for actual execution via Cursor, use the **Solo Plan's 5-phase prompts** — they're concrete and actionable.

**Suggested approach:**
1. Review the Agents Plan artifacts with stakeholders
2. Execute Phases 1-5 from the Solo Plan via Cursor
3. Reference the QA Test Plan for validation at each phase
