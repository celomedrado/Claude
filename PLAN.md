# TaskFlow — MVP Implementation Plan

**Overall Progress:** `0%`

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

- [ ] **Step 1: Project Scaffolding**
  - [ ] Init Next.js 14 project in `taskflow/` with TypeScript
  - [ ] Install and configure Tailwind CSS + shadcn/ui
  - [ ] Install and configure Drizzle ORM with SQLite (better-sqlite3)
  - [ ] Set up project folder structure (`src/app`, `src/components`, `src/db`, `src/lib`, `src/actions`)
  - [ ] Add environment variables template (`.env.example` with `OPENAI_API_KEY`, `NEXTAUTH_SECRET`)

- [ ] **Step 2: Database Schema**
  - [ ] Define `users` table (id, email, password_hash, name, created_at)
  - [ ] Define `projects` table (id, user_id, name, color, created_at)
  - [ ] Define `tasks` table (id, user_id, project_id, title, description, status, priority, due_date, source_text, ai_generated, created_at, updated_at)
  - [ ] Generate and run initial migration

- [ ] **Step 3: Auth Setup**
  - [ ] Configure NextAuth with credentials provider
  - [ ] Create sign-up and login pages
  - [ ] Add auth middleware to protect app routes
  - [ ] Create auth utility helpers (get current user)

- [ ] **Step 4: App Layout & Navigation**
  - [ ] Build sidebar layout (projects list, nav links)
  - [ ] Build top bar (search placeholder, user menu)
  - [ ] Create main content area with responsive layout
  - [ ] Add basic loading and empty states

- [ ] **Step 5: Project CRUD**
  - [ ] Server actions: create, rename, delete project
  - [ ] Sidebar: project list with color indicators
  - [ ] Modal/form for creating and editing projects

- [ ] **Step 6: Task CRUD**
  - [ ] Server actions: create, read, update, delete task
  - [ ] Task list view with sorting (by status, priority, due date)
  - [ ] Task list filtering (by project, status, priority)
  - [ ] Task creation form (title, description, project, priority, due date)
  - [ ] Task detail panel/modal with inline editing
  - [ ] Status workflow: `todo` → `in_progress` → `done` → `archived`

- [ ] **Step 7: AI Task Extraction**
  - [ ] OpenAI service utility (shared client, prompt templates)
  - [ ] Extract endpoint: raw text → structured task array (title, suggested project, priority, due date)
  - [ ] "Paste & Extract" UI: textarea modal → preview extracted tasks → confirm to save
  - [ ] Handle edge cases (empty text, no tasks found, API errors)

- [ ] **Step 8: AI Auto-Categorization**
  - [ ] On manual task creation, suggest project + priority if not provided
  - [ ] Use existing projects list as context for categorization prompt
  - [ ] Show suggestions as defaults user can override

- [ ] **Step 9: AI Document Generation**
  - [ ] Doc generation endpoint: selected tasks → formatted document
  - [ ] Support 3 templates: status update, meeting brief, action item summary
  - [ ] UI: select tasks → choose template → preview → copy/download as markdown

- [ ] **Step 10: Dashboard Home**
  - [ ] Task summary cards (total, overdue, due this week, completed)
  - [ ] Upcoming due dates list
  - [ ] Recent activity feed (last created/updated tasks)

- [ ] **Step 11: Docker & Deployment**
  - [ ] Create Dockerfile (multi-stage build)
  - [ ] Create docker-compose.yml with volume for SQLite persistence
  - [ ] Add seed script for demo data
  - [ ] Update README with setup and run instructions
