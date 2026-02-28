# TaskFlow

AI-powered task management for solo PMs. Paste meeting notes or messages, let AI extract and categorize tasks, then generate status documents.

## Features

- **Paste & Extract** — Paste raw text (meeting notes, Slack messages) and AI extracts structured tasks with priorities and due dates
- **Auto-Categorize** — AI suggests project assignment and priority for new tasks
- **Document Generation** — Generate status updates, meeting briefs, or action item summaries from your tasks
- **Project Organization** — Group tasks by project with color-coded indicators
- **Task Management** — Full CRUD with status workflow (todo → in progress → done → archived), filtering, and sorting

## Tech Stack

- **Next.js 16** (App Router) — full-stack framework
- **SQLite + Drizzle ORM** — zero-infra database, single file
- **Tailwind CSS** — utility-first styling
- **NextAuth.js** — credentials-based authentication
- **OpenAI API** — task extraction, categorization, document generation (gpt-4o-mini)

## Quick Start

### Prerequisites

- Node.js 20+
- An OpenAI API key

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your OPENAI_API_KEY and a NEXTAUTH_SECRET

# Initialize the database
npm run db:push

# (Optional) Seed with demo data
npm run db:seed

# Start dev server
npm run dev
```

Open http://localhost:3000. If you ran the seed script, log in with:
- Email: `demo@taskflow.app`
- Password: `demo1234`

### Docker

```bash
# Copy and configure environment
cp .env.example .env

# Build and run
docker compose up -d
```

The app will be available at http://localhost:3000.

## Project Structure

```
taskflow/
├── src/
│   ├── app/              # Next.js pages and API routes
│   │   ├── (app)/        # Authenticated app routes
│   │   │   ├── extract/  # Paste & Extract page
│   │   │   ├── generate/ # Document generation page
│   │   │   ├── projects/ # Project management
│   │   │   └── tasks/    # All tasks view
│   │   └── api/          # API routes (auth, AI endpoints)
│   ├── actions/          # Server actions (task/project CRUD)
│   ├── components/       # Shared UI components
│   ├── db/               # Drizzle schema and database connection
│   └── lib/              # Auth config, AI service, utilities
├── drizzle/              # SQL migrations
├── scripts/              # Seed script
├── data/                 # SQLite database (gitignored)
├── Dockerfile
└── docker-compose.yml
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate new migration |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with demo data |

## License

MIT
