//! Tauri IPC commands for task CRUD operations.
//!
//! All commands operate on the single desktop user ("desktop").
//! Recurrence-on-complete logic mirrors the Next.js server action.

use crate::models::{CreateTaskInput, DashboardData, DashboardStats, Task, TaskFilter, UpdateTaskInput};
use rusqlite::{params, Connection};
use std::sync::Mutex;
use tauri::State;

/// The desktop user ID (single-user mode, no auth).
const USER_ID: &str = "desktop";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/// Maps a SQLite row to a Task struct.
fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get::<_, Option<String>>("description")?.unwrap_or_default(),
        status: row.get("status")?,
        priority: row.get("priority")?,
        project_id: row.get("project_id")?,
        due_date: row.get("due_date")?,
        source_text: row.get("source_text")?,
        ai_generated: row.get::<_, i64>("ai_generated")? != 0,
        sort_order: row.get::<_, Option<f64>>("sort_order")?.unwrap_or(0.0),
        recurrence_rule: row.get("recurrence_rule")?,
        recurrence_source_id: row.get("recurrence_source_id")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

/// Computes the next due date for a recurrence rule (mirrors task-parser.ts).
fn get_next_due_date(rule: &str) -> i64 {
    use chrono::{Datelike, Local, NaiveDate};

    let today = Local::now().date_naive();

    match rule {
        "daily" => {
            let next = today.succ_opt().unwrap_or(today);
            naive_to_epoch(next)
        }
        "weekdays" => {
            let dow = today.weekday().num_days_from_monday(); // Mon=0 .. Sun=6
            let days_until = if dow >= 4 {
                // Fri(4) → +3 Mon, Sat(5) → +2 Mon, Sun(6) → +1 Mon
                7 - dow as i64 + if dow == 4 { 3 } else { (7 - dow) as i64 }
            } else {
                1 // next weekday is tomorrow
            };
            let days_add = match dow {
                4 => 3, // Fri → Mon
                5 => 2, // Sat → Mon
                6 => 1, // Sun → Mon
                _ => 1,
            };
            let next = today + chrono::Duration::days(days_add);
            naive_to_epoch(next)
        }
        rule if rule.starts_with("weekly:") => {
            if let Ok(target_dow) = rule[7..].parse::<u32>() {
                // target_dow: 0=Sun, 1=Mon, …, 6=Sat (JS convention)
                let current = today.weekday().num_days_from_sunday();
                let mut diff = target_dow as i64 - current as i64;
                if diff <= 0 {
                    diff += 7;
                }
                let next = today + chrono::Duration::days(diff);
                naive_to_epoch(next)
            } else {
                // Fallback: tomorrow
                naive_to_epoch(today.succ_opt().unwrap_or(today))
            }
        }
        _ => {
            // Fallback: tomorrow
            naive_to_epoch(today.succ_opt().unwrap_or(today))
        }
    }
}

/// Convert a NaiveDate to a Unix epoch (seconds).
fn naive_to_epoch(d: chrono::NaiveDate) -> i64 {
    d.and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp()
}

/* ------------------------------------------------------------------ */
/*  IPC Commands                                                       */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub fn list_tasks(
    db: State<'_, Mutex<Connection>>,
    filter: Option<TaskFilter>,
) -> Result<Vec<Task>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let filter = filter.unwrap_or_default();

    let mut sql = String::from(
        "SELECT * FROM tasks WHERE user_id = ?1"
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(USER_ID.to_string())];
    let mut idx = 2;

    if let Some(ref status) = filter.status {
        sql.push_str(&format!(" AND status = ?{idx}"));
        param_values.push(Box::new(status.clone()));
        idx += 1;
    }
    if let Some(ref priority) = filter.priority {
        sql.push_str(&format!(" AND priority = ?{idx}"));
        param_values.push(Box::new(priority.clone()));
        idx += 1;
    }
    if let Some(ref project_id) = filter.project_id {
        sql.push_str(&format!(" AND project_id = ?{idx}"));
        param_values.push(Box::new(project_id.clone()));
    }

    sql.push_str(" ORDER BY sort_order ASC, created_at DESC");

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let tasks = stmt
        .query_map(params_ref.as_slice(), row_to_task)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(tasks)
}

#[tauri::command]
pub fn create_task(
    db: State<'_, Mutex<Connection>>,
    input: CreateTaskInput,
) -> Result<Task, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err("Title is required".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let due_date: Option<i64> = input.due_date.as_ref().and_then(|d| {
        chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .ok()
            .map(|nd| naive_to_epoch(nd))
    });

    conn.execute(
        "INSERT INTO tasks (id, user_id, title, description, project_id, priority, due_date, status, source_text, ai_generated, sort_order, recurrence_rule, recurrence_source_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            id,
            USER_ID,
            title,
            input.description.as_deref().unwrap_or(""),
            input.project_id,
            input.priority.as_deref().unwrap_or("medium"),
            due_date,
            input.status.as_deref().unwrap_or("todo"),
            input.source_text,
            input.ai_generated.unwrap_or(false) as i64,
            input.sort_order.unwrap_or(0.0),
            input.recurrence_rule,
            input.recurrence_source_id,
            now,
            now,
        ],
    ).map_err(|e| e.to_string())?;

    // Return the newly created task
    let mut stmt = conn.prepare("SELECT * FROM tasks WHERE id = ?1").map_err(|e| e.to_string())?;
    let task = stmt.query_row(params![id], row_to_task).map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
pub fn update_task(
    db: State<'_, Mutex<Connection>>,
    id: String,
    updates: UpdateTaskInput,
) -> Result<Task, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();

    // Build dynamic UPDATE query
    let mut set_clauses = vec!["updated_at = ?".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    if let Some(ref title) = updates.title {
        set_clauses.push("title = ?".to_string());
        param_values.push(Box::new(title.trim().to_string()));
    }
    if let Some(ref desc) = updates.description {
        set_clauses.push("description = ?".to_string());
        param_values.push(Box::new(desc.clone()));
    }
    if let Some(ref project_id) = updates.project_id {
        set_clauses.push("project_id = ?".to_string());
        let val: Option<String> = if project_id.is_empty() { None } else { Some(project_id.clone()) };
        param_values.push(Box::new(val));
    }
    if let Some(ref priority) = updates.priority {
        set_clauses.push("priority = ?".to_string());
        param_values.push(Box::new(priority.clone()));
    }
    if let Some(ref status) = updates.status {
        set_clauses.push("status = ?".to_string());
        param_values.push(Box::new(status.clone()));
    }
    if let Some(ref due_date) = updates.due_date {
        set_clauses.push("due_date = ?".to_string());
        let val: Option<i64> = if due_date.is_empty() {
            None
        } else {
            chrono::NaiveDate::parse_from_str(due_date, "%Y-%m-%d")
                .ok()
                .map(|nd| naive_to_epoch(nd))
        };
        param_values.push(Box::new(val));
    }
    if let Some(sort_order) = updates.sort_order {
        set_clauses.push("sort_order = ?".to_string());
        param_values.push(Box::new(sort_order));
    }

    // Add WHERE clause params
    param_values.push(Box::new(id.clone()));
    param_values.push(Box::new(USER_ID.to_string()));

    let sql = format!(
        "UPDATE tasks SET {} WHERE id = ? AND user_id = ?",
        set_clauses.join(", ")
    );

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params_ref.as_slice()).map_err(|e| e.to_string())?;

    // Recurrence-on-complete: when status moves to "done", schedule next occurrence
    if updates.status.as_deref() == Some("done") {
        let _ = handle_recurrence_on_complete(&conn, &id);
    }

    // Return the updated task
    let mut stmt = conn.prepare("SELECT * FROM tasks WHERE id = ?1").map_err(|e| e.to_string())?;
    let task = stmt.query_row(params![id], row_to_task).map_err(|e| e.to_string())?;

    Ok(task)
}

/// When a recurring task is marked "done", create the next occurrence.
fn handle_recurrence_on_complete(conn: &Connection, task_id: &str) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT id, title, description, project_id, priority, recurrence_rule, recurrence_source_id FROM tasks WHERE id = ?1 AND user_id = ?2")
        .map_err(|e| e.to_string())?;

    let row = stmt.query_row(params![task_id, USER_ID], |row| {
        Ok((
            row.get::<_, String>("id")?,
            row.get::<_, String>("title")?,
            row.get::<_, Option<String>>("description")?,
            row.get::<_, Option<String>>("project_id")?,
            row.get::<_, String>("priority")?,
            row.get::<_, Option<String>>("recurrence_rule")?,
            row.get::<_, Option<String>>("recurrence_source_id")?,
        ))
    }).map_err(|e| e.to_string())?;

    let (row_id, title, description, project_id, priority, recurrence_rule, recurrence_source_id) = row;

    if let Some(ref rule) = recurrence_rule {
        let source_id = recurrence_source_id.unwrap_or_else(|| row_id.clone());

        // Guard: don't duplicate if a todo occurrence already exists
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM tasks WHERE recurrence_source_id = ?1 AND status = 'todo' AND user_id = ?2",
                params![source_id, USER_ID],
                |row| row.get(0),
            )
            .ok();

        if existing.is_none() {
            let new_id = uuid::Uuid::new_v4().to_string();
            let next_due = get_next_due_date(rule);
            let now = chrono::Utc::now().timestamp();

            conn.execute(
                "INSERT INTO tasks (id, user_id, title, description, project_id, priority, due_date, status, recurrence_rule, recurrence_source_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'todo', ?8, ?9, ?10, ?11)",
                params![
                    new_id,
                    USER_ID,
                    title,
                    description.unwrap_or_default(),
                    project_id,
                    priority,
                    next_due,
                    rule,
                    source_id,
                    now,
                    now,
                ],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn delete_task(
    db: State<'_, Mutex<Connection>>,
    id: String,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM tasks WHERE id = ?1 AND user_id = ?2",
        params![id, USER_ID],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn bulk_create_tasks(
    db: State<'_, Mutex<Connection>>,
    tasks: Vec<CreateTaskInput>,
) -> Result<Vec<Task>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();
    let mut created = Vec::new();

    for input in tasks {
        let id = uuid::Uuid::new_v4().to_string();
        let due_date: Option<i64> = input.due_date.as_ref().and_then(|d| {
            chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
                .ok()
                .map(|nd| naive_to_epoch(nd))
        });

        conn.execute(
            "INSERT INTO tasks (id, user_id, title, description, project_id, priority, due_date, status, source_text, ai_generated, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id,
                USER_ID,
                input.title.trim(),
                input.description.as_deref().unwrap_or(""),
                input.project_id,
                input.priority.as_deref().unwrap_or("medium"),
                due_date,
                input.status.as_deref().unwrap_or("todo"),
                input.source_text,
                input.ai_generated.unwrap_or(false) as i64,
                input.sort_order.unwrap_or(0.0),
                now,
                now,
            ],
        ).map_err(|e| e.to_string())?;

        let mut stmt = conn.prepare("SELECT * FROM tasks WHERE id = ?1").map_err(|e| e.to_string())?;
        let task = stmt.query_row(params![id], row_to_task).map_err(|e| e.to_string())?;
        created.push(task);
    }

    Ok(created)
}

#[tauri::command]
pub fn get_dashboard(
    db: State<'_, Mutex<Connection>>,
) -> Result<DashboardData, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();
    let seven_days = now + 7 * 86400;

    // Stats
    let stats = conn.query_row(
        "SELECT
            count(*) as total,
            sum(case when status = 'todo' then 1 else 0 end) as todo,
            sum(case when status = 'in_progress' then 1 else 0 end) as in_progress,
            sum(case when status = 'done' then 1 else 0 end) as done,
            sum(case when due_date < ?1 and status not in ('done', 'archived') then 1 else 0 end) as overdue
         FROM tasks WHERE user_id = ?2",
        params![now, USER_ID],
        |row| {
            Ok(DashboardStats {
                total: row.get::<_, Option<i64>>(0)?.unwrap_or(0),
                todo: row.get::<_, Option<i64>>(1)?.unwrap_or(0),
                in_progress: row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                done: row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                overdue: row.get::<_, Option<i64>>(4)?.unwrap_or(0),
            })
        },
    ).map_err(|e| e.to_string())?;

    // Upcoming tasks (due within 7 days, not done/archived)
    let mut stmt = conn.prepare(
        "SELECT * FROM tasks WHERE user_id = ?1 AND status NOT IN ('done', 'archived') AND due_date <= ?2 ORDER BY due_date ASC LIMIT 10"
    ).map_err(|e| e.to_string())?;
    let upcoming = stmt
        .query_map(params![USER_ID, seven_days], row_to_task)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Recent tasks (last 8 by updated_at)
    let mut stmt = conn.prepare(
        "SELECT * FROM tasks WHERE user_id = ?1 ORDER BY updated_at DESC LIMIT 8"
    ).map_err(|e| e.to_string())?;
    let recent = stmt
        .query_map(params![USER_ID], row_to_task)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(DashboardData { stats, upcoming, recent })
}
