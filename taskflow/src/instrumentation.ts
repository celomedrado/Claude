/**
 * Next.js instrumentation hook — runs once at server startup before
 * any request is handled. We use it to ensure the recurrence columns
 * exist in the SQLite DB, regardless of whether a formal migration
 * has been applied.
 */
export async function register() {
  // Only run in the Node.js runtime — skip edge runtime (middleware)
  if (process.env.NEXT_RUNTIME === "edge" || typeof window !== "undefined") return;

  // Dynamic imports so the edge bundler never touches these modules
  const { default: Database } = await import("better-sqlite3");
  const path = await import("path");

  const dbPath = path.join(process.cwd(), "data", "taskflow.db");

  try {
    const db = new Database(dbPath);

    for (const col of ["recurrence_rule TEXT", "recurrence_source_id TEXT", "sort_order REAL DEFAULT 0"]) {
      try {
        db.exec(`ALTER TABLE tasks ADD COLUMN ${col}`);
      } catch {
        // Column already exists — expected
      }
    }

    // Backfill sort_order for existing tasks that still have the default 0
    try {
      db.exec(`UPDATE tasks SET sort_order = rowid WHERE sort_order = 0 OR sort_order IS NULL`);
    } catch {
      // Table may not exist yet
    }

    // Add display_order column to projects for kanban column reordering
    try {
      db.exec(`ALTER TABLE projects ADD COLUMN display_order REAL DEFAULT 0`);
    } catch {
      // Column already exists — expected
    }
    try {
      db.exec(`UPDATE projects SET display_order = rowid WHERE display_order = 0 OR display_order IS NULL`);
    } catch {
      // Table may not exist yet
    }

    db.close();
  } catch {
    // DB file doesn't exist yet — will be created on first use
  }
}
