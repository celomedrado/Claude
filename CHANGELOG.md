# Changelog

## [Unreleased]

### Added
- **Kanban Board** (`/tasks` → Board toggle): drag-and-drop board view with one column per project + "Unassigned" column. Drag cards between columns to reassign tasks to different projects.
- List/Board view toggle on the All Tasks page (client-side, no new route)
- `@dnd-kit/core` for accessible drag-and-drop interactions

### Changed
- `/tasks` page now renders `TasksView` wrapper (supports both list and board views)
- OpenAI API error handling: 401 errors now return `503` with actionable message instead of generic `500`
- API key validation at startup logs key length for easier debugging
- `AIConfigError` class distinguishes config issues from runtime errors in all AI routes

### Fixed
- Task detail modal: added `role="dialog"`, `aria-modal`, `aria-labelledby`, close button `aria-label`
- Task detail modal: Escape key closes modal, click-outside closes modal
- Task detail modal: `handleSave`/`handleDelete` wrapped in try-catch with inline error display
- Task detail modal: client-side title validation before save
- Task detail modal: date picker timezone bug — was using `toISOString()` (UTC), now uses local timezone
- Kanban drag errors: caught and displayed in dismissible error banner

## [0.1.0] - 2026-02-28

### Added

**Core App**
- Next.js 16 project with TypeScript, Tailwind CSS, standalone output
- SQLite database via Drizzle ORM (`users`, `projects`, `tasks` tables)
- NextAuth v5 credentials auth with edge-safe middleware split
- Login and signup pages with email/password

**Task Management**
- Task CRUD with server actions (create, update, delete, bulk create)
- Task list view with filters (status, priority) and sort (newest, priority, due date)
- Task detail modal with inline editing of all fields
- Status workflow: `todo` → `in_progress` → `done` → `archived` (click to cycle)
- Priority levels: low, medium, high, urgent with color badges
- Due date tracking with overdue indicators

**Project Management**
- Project CRUD with color picker (8 colors)
- Project detail pages showing scoped task lists
- Sidebar navigation with project list and color dots

**AI Features (OpenAI gpt-4o-mini)**
- **Paste & Extract** (`/extract`): paste raw text → AI extracts structured tasks → preview with checkboxes → assign projects → bulk save
- **Auto-Categorize** (`/api/ai/categorize`): suggest project + priority from title/description
- **Document Generation** (`/generate`): select tasks → pick template → generate markdown → copy to clipboard
  - Templates: Status Update, Meeting Brief, Action Items

**Dashboard**
- Task summary stat cards (total, todo, in progress, done, overdue)
- Upcoming due dates list (next 7 days)
- Recent activity feed (last 8 tasks)
- Quick-action CTA linking to Paste & Extract

**DevOps**
- Dockerfile (multi-stage build with standalone output)
- docker-compose.yml with SQLite volume persistence
- Seed script: demo user + 4 projects + 12 tasks (`npm run db:seed`)
- npm scripts: `db:generate`, `db:push`, `db:seed`

**Repo**
- Moved slash commands to `.claude/commands/` for Claude Code integration
- PLAN.md with full implementation tracker

### Fixed
- AI error handling: try-catch on all OpenAI calls and JSON.parse (graceful fallback on malformed responses)
- Signup validation: email format regex + password min 6 characters
- Dashboard date queries: standardized to epoch seconds (was mixing Date objects and raw timestamps)
- Removed unused drizzle-orm imports (`gte`, `lte`)
