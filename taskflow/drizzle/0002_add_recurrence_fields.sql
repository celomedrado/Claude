-- UP: Add recurrence support to tasks table
ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;
ALTER TABLE tasks ADD COLUMN recurrence_source_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;
