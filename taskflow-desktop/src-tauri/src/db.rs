//! SQLite database setup and migrations.
//!
//! The database lives at `~/Library/Application Support/com.taskflow.app/taskflow.db`
//! on macOS. WAL mode and foreign keys are enabled on every connection.

use rusqlite::{Connection, Result as SqlResult};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Returns the path to the app's data directory, creating it if needed.
pub fn app_data_dir() -> PathBuf {
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.taskflow.app");
    fs::create_dir_all(&dir).expect("Failed to create app data directory");
    dir
}

/// Returns the full path to the SQLite database file.
pub fn db_path() -> PathBuf {
    app_data_dir().join("taskflow.db")
}

/// Opens a connection and runs all pending migrations.
pub fn init_db() -> SqlResult<Mutex<Connection>> {
    let conn = Connection::open(db_path())?;

    // Performance and safety pragmas
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    run_migrations(&conn)?;

    Ok(Mutex::new(conn))
}

/// Creates tables and adds columns that may not exist yet.
/// Mirrors the Drizzle schema from the original Next.js app.
fn run_migrations(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "
        -- Users table (retained for data migration from web app)
        CREATE TABLE IF NOT EXISTS users (
            id              TEXT PRIMARY KEY,
            email           TEXT NOT NULL UNIQUE,
            password_hash   TEXT NOT NULL DEFAULT '',
            name            TEXT NOT NULL DEFAULT 'Desktop User',
            work_summary    TEXT,
            created_at      INTEGER DEFAULT (unixepoch())
        );

        -- Projects
        CREATE TABLE IF NOT EXISTS projects (
            id              TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name            TEXT NOT NULL,
            color           TEXT NOT NULL DEFAULT '#6366f1',
            created_at      INTEGER DEFAULT (unixepoch())
        );

        -- Tasks
        CREATE TABLE IF NOT EXISTS tasks (
            id                      TEXT PRIMARY KEY,
            user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_id              TEXT REFERENCES projects(id) ON DELETE SET NULL,
            title                   TEXT NOT NULL,
            description             TEXT DEFAULT '',
            status                  TEXT NOT NULL DEFAULT 'todo',
            priority                TEXT NOT NULL DEFAULT 'medium',
            due_date                INTEGER,
            source_text             TEXT,
            ai_generated            INTEGER NOT NULL DEFAULT 0,
            sort_order              REAL DEFAULT 0,
            recurrence_rule         TEXT,
            recurrence_source_id    TEXT,
            created_at              INTEGER DEFAULT (unixepoch()),
            updated_at              INTEGER DEFAULT (unixepoch())
        );

        -- Meetings (raw text for AI context accumulation)
        CREATE TABLE IF NOT EXISTS meetings (
            id              TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            raw_text        TEXT NOT NULL,
            task_count      INTEGER NOT NULL DEFAULT 0,
            created_at      INTEGER DEFAULT (unixepoch())
        );
        ",
    )?;

    // Ensure the default desktop user exists (single-user mode — no auth)
    conn.execute(
        "INSERT OR IGNORE INTO users (id, email, name) VALUES ('desktop', 'desktop@local', 'Desktop User')",
        [],
    )?;

    Ok(())
}
