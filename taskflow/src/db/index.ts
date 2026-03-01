import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "taskflow.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Ensure recurrence columns exist (safe to run repeatedly — ALTER TABLE
// throws if column already exists, so we catch and ignore).
for (const col of ["recurrence_rule TEXT", "recurrence_source_id TEXT"]) {
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN ${col}`);
  } catch {
    // Column already exists — nothing to do
  }
}

export const db = drizzle(sqlite, { schema });
