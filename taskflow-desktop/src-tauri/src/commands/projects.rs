//! Tauri IPC commands for project CRUD operations.

use crate::models::{CreateProjectInput, Project, UpdateProjectInput};
use rusqlite::{params, Connection};
use std::sync::Mutex;
use tauri::State;

const USER_ID: &str = "desktop";

/// Maps a SQLite row to a Project struct (including task count subquery).
fn row_to_project(row: &rusqlite::Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        display_order: row.get("display_order")?,
        task_count: row.get("task_count")?,
        created_at: row.get("created_at")?,
    })
}

#[tauri::command]
pub fn list_projects(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<Project>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT p.*, (SELECT count(*) FROM tasks WHERE tasks.project_id = p.id) as task_count
             FROM projects p WHERE p.user_id = ?1 ORDER BY p.display_order ASC, p.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map(params![USER_ID], row_to_project)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(projects)
}

#[tauri::command]
pub fn create_project(
    db: State<'_, Mutex<Connection>>,
    input: CreateProjectInput,
) -> Result<Project, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let color = input.color.as_deref().unwrap_or("#6366f1");
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO projects (id, user_id, name, color, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, USER_ID, name, color, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name,
        color: color.to_string(),
        display_order: 0.0,
        task_count: 0,
        created_at: now,
    })
}

#[tauri::command]
pub fn update_project(
    db: State<'_, Mutex<Connection>>,
    id: String,
    updates: UpdateProjectInput,
) -> Result<Project, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut set_clauses: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref name) = updates.name {
        set_clauses.push("name = ?".to_string());
        param_values.push(Box::new(name.trim().to_string()));
    }
    if let Some(ref color) = updates.color {
        set_clauses.push("color = ?".to_string());
        param_values.push(Box::new(color.clone()));
    }
    if let Some(order) = updates.display_order {
        set_clauses.push("display_order = ?".to_string());
        param_values.push(Box::new(order));
    }

    if set_clauses.is_empty() {
        return Err("No updates provided".to_string());
    }

    param_values.push(Box::new(id.clone()));
    param_values.push(Box::new(USER_ID.to_string()));

    let sql = format!(
        "UPDATE projects SET {} WHERE id = ? AND user_id = ?",
        set_clauses.join(", ")
    );

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params_ref.as_slice()).map_err(|e| e.to_string())?;

    // Return the updated project
    let mut stmt = conn
        .prepare(
            "SELECT p.*, (SELECT count(*) FROM tasks WHERE tasks.project_id = p.id) as task_count
             FROM projects p WHERE p.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let project = stmt
        .query_row(params![id], row_to_project)
        .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn delete_project(
    db: State<'_, Mutex<Connection>>,
    id: String,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM projects WHERE id = ?1 AND user_id = ?2",
        params![id, USER_ID],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
