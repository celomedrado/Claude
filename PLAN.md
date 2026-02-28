# TaskFlow — MVP Implementation Plan

**Overall Progress:** `100%`

## TLDR

TaskFlow is a self-hosted web app for solo PMs who lose track of action items from meetings and messages. Paste raw text (meeting notes, Slack dumps) → AI extracts and categorizes tasks → organize by project → generate status docs. Built with Next.js, SQLite, Drizzle, and OpenAI API. 3-day MVP target.

## Critical Decisions

- **Next.js 16 App Router** — full-stack in one project, no separate backend
- **SQLite + Drizzle** — zero infra, single file DB, ideal for self-hosted single-user
- **OpenAI API (gpt-4o-mini)** — powers task extraction, categorization, and doc generation
- **NextAuth credentials provider** — minimal auth, protects data without SSO complexity
- **Pasted text only for V1** — no file upload, no integrations yet
- **Separate project directory** (`taskflow/`) — isolated from existing repo configs

## Tasks

- [x] 🟩 **Step 1: Project Scaffolding**
  - [x] 🟩 Init Next.js project in `taskflow/` with TypeScript
  - [x] 🟩 Install and configure Tailwind CSS + Radix UI primitives
  - [x] 🟩 Install and configure Drizzle ORM with SQLite (better-sqlite3)
  - [x] 🟩 Set up project folder structure
  - [x] 🟩 Add environment variables template

- [x] 🟩 **Step 2: Database Schema**
  - [x] 🟩 Define `users`, `projects`, `tasks` tables
  - [x] 🟩 Generate and run initial migration

- [x] 🟩 **Step 3: Auth Setup**
  - [x] 🟩 Configure NextAuth with credentials provider (edge-safe split)
  - [x] 🟩 Create sign-up and login pages
  - [x] 🟩 Add auth middleware to protect app routes

- [x] 🟩 **Step 4: App Layout & Navigation**
  - [x] 🟩 Build sidebar layout (projects list, nav links)
  - [x] 🟩 Create main content area with responsive layout

- [x] 🟩 **Step 5: Project CRUD**
  - [x] 🟩 Server actions: create, rename, delete project
  - [x] 🟩 Projects page with inline editing and color picker

- [x] 🟩 **Step 6: Task CRUD**
  - [x] 🟩 Server actions: create, read, update, delete, bulk create
  - [x] 🟩 Task list with filtering (status, priority) and sorting
  - [x] 🟩 Task detail modal with inline editing
  - [x] 🟩 Status workflow: `todo` → `in_progress` → `done` → `archived`

- [x] 🟩 **Step 7: AI Task Extraction**
  - [x] 🟩 OpenAI service utility with prompt templates
  - [x] 🟩 Paste & Extract page: textarea → preview → bulk save

- [x] 🟩 **Step 8: AI Auto-Categorization**
  - [x] 🟩 API endpoint for suggesting project + priority

- [x] 🟩 **Step 9: AI Document Generation**
  - [x] 🟩 3 templates: status update, meeting brief, action items
  - [x] 🟩 Select tasks → generate → copy to clipboard

- [x] 🟩 **Step 10: Dashboard Home**
  - [x] 🟩 Task summary stat cards
  - [x] 🟩 Upcoming due dates list
  - [x] 🟩 Recent activity feed
  - [x] 🟩 Quick action link to Paste & Extract

- [x] 🟩 **Step 11: Docker & Deployment**
  - [x] 🟩 Dockerfile (multi-stage build, standalone output)
  - [x] 🟩 docker-compose.yml with volume for SQLite persistence
  - [x] 🟩 Seed script with demo data (12 tasks, 4 projects)
  - [x] 🟩 README with setup and run instructions
