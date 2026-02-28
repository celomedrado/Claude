# TaskFlow — MVP Implementation Plan

**Overall Progress:** `82%`

## TLDR

TaskFlow is a self-hosted web app for solo PMs who lose track of action items from meetings and messages. Paste raw text (meeting notes, Slack dumps) → AI extracts and categorizes tasks → organize by project → generate status docs. Built with Next.js, SQLite, Drizzle, shadcn/ui, and OpenAI API. 3-day MVP target.

## Critical Decisions

- **Next.js 14 App Router** — full-stack in one project, no separate backend
- **SQLite + Drizzle** — zero infra, single file DB, ideal for self-hosted single-user
- **OpenAI API** — powers task extraction, categorization, and doc generation
- **NextAuth credentials provider** — minimal auth, protects data without SSO complexity
- **Pasted text only for V1** — no file upload, no integrations yet
- **Separate project directory** (`taskflow/`) — isolated from existing repo configs

## Tasks

- [x] 🟩 **Step 1: Project Scaffolding**
  - [x] 🟩 Init Next.js 14 project in `taskflow/` with TypeScript
  - [x] 🟩 Install and configure Tailwind CSS + Radix UI primitives
  - [x] 🟩 Install and configure Drizzle ORM with SQLite (better-sqlite3)
  - [x] 🟩 Set up project folder structure (`src/app`, `src/components`, `src/db`, `src/lib`, `src/actions`)
  - [x] 🟩 Add environment variables template (`.env.example` with `OPENAI_API_KEY`, `NEXTAUTH_SECRET`)

- [x] 🟩 **Step 2: Database Schema**
  - [x] 🟩 Define `users` table (id, email, password_hash, name, created_at)
  - [x] 🟩 Define `projects` table (id, user_id, name, color, created_at)
  - [x] 🟩 Define `tasks` table (id, user_id, project_id, title, description, status, priority, due_date, source_text, ai_generated, created_at, updated_at)
  - [x] 🟩 Generate and run initial migration

- [x] 🟩 **Step 3: Auth Setup**
  - [x] 🟩 Configure NextAuth with credentials provider
  - [x] 🟩 Create sign-up and login pages
  - [x] 🟩 Add auth middleware to protect app routes (edge-safe split)
  - [x] 🟩 Create auth utility helpers (get current user)

- [x] 🟩 **Step 4: App Layout & Navigation**
  - [x] 🟩 Build sidebar layout (projects list, nav links)
  - [x] 🟩 Create main content area with responsive layout
  - [x] 🟩 Add basic loading and empty states

- [x] 🟩 **Step 5: Project CRUD**
  - [x] 🟩 Server actions: create, rename, delete project
  - [x] 🟩 Sidebar: project list with color indicators
  - [x] 🟩 Modal/form for creating and editing projects

- [x] 🟩 **Step 6: Task CRUD**
  - [x] 🟩 Server actions: create, read, update, delete task
  - [x] 🟩 Task list view with sorting (by status, priority, due date)
  - [x] 🟩 Task list filtering (by project, status, priority)
  - [x] 🟩 Task creation form (title, description, project, priority, due date)
  - [x] 🟩 Task detail panel/modal with inline editing
  - [x] 🟩 Status workflow: `todo` → `in_progress` → `done` → `archived`

- [x] 🟩 **Step 7: AI Task Extraction**
  - [x] 🟩 OpenAI service utility (shared client, prompt templates)
  - [x] 🟩 Extract endpoint: raw text → structured task array (title, suggested project, priority, due date)
  - [x] 🟩 "Paste & Extract" UI: textarea → preview extracted tasks → confirm to save
  - [x] 🟩 Handle edge cases (empty text, no tasks found, API errors)

- [x] 🟩 **Step 8: AI Auto-Categorization**
  - [x] 🟩 API endpoint for suggesting project + priority
  - [x] 🟩 Use existing projects list as context for categorization prompt

- [x] 🟩 **Step 9: AI Document Generation**
  - [x] 🟩 Doc generation endpoint: selected tasks → formatted document
  - [x] 🟩 Support 3 templates: status update, meeting brief, action item summary
  - [x] 🟩 UI: select tasks → choose template → preview → copy to clipboard

- [ ] 🟥 **Step 10: Dashboard Home (Enhancement)**
  - [x] 🟩 Task summary cards (total, overdue, in progress, done)
  - [ ] 🟥 Upcoming due dates list
  - [ ] 🟥 Recent activity feed (last created/updated tasks)

- [ ] 🟥 **Step 11: Docker & Deployment**
  - [ ] 🟥 Create Dockerfile (multi-stage build)
  - [ ] 🟥 Create docker-compose.yml with volume for SQLite persistence
  - [ ] 🟥 Add seed script for demo data
  - [ ] 🟥 Update README with setup and run instructions
