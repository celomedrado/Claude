/**
 * Next.js instrumentation hook — runs once at server startup before
 * any request is handled. We use it to ensure the recurrence columns
 * exist in the SQLite DB, regardless of whether a formal migration
 * has been applied.
 */
export async function register() {
  // Only run on the server (not edge runtime)
  if (typeof window !== "undefined") return;

  const Database = (await import("better-sqlite3")).default;
  const path = await import("path");

  const dbPath = path.join(process.cwd(), "data", "taskflow.db");

  try {
    const db = new Database(dbPath);

    for (const col of ["recurrence_rule TEXT", "recurrence_source_id TEXT"]) {
      try {
        db.exec(`ALTER TABLE tasks ADD COLUMN ${col}`);
      } catch {
        // Column already exists — expected
      }
    }

    db.close();
  } catch {
    // DB file doesn't exist yet — will be created on first use
  }
}
