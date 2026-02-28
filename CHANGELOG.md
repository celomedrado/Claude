# Changelog

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
