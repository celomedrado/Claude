//! Tauri IPC commands for app-level operations:
//! settings, file export, data import.

use crate::db::app_data_dir;
use crate::models::AppSettings;
use rusqlite::Connection;
use std::fs;
use std::sync::Mutex;
use tauri::State;

/* ------------------------------------------------------------------ */
/*  Settings persistence                                               */
/* ------------------------------------------------------------------ */

/// Path to the JSON settings file.
fn settings_path() -> std::path::PathBuf {
    app_data_dir().join("settings.json")
}

/// Load settings from disk, or return defaults.
pub fn load_settings() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        let data = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

/// Persist settings to disk.
fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let data = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(settings_path(), data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings(
    settings: State<'_, Mutex<AppSettings>>,
) -> Result<AppSettings, String> {
    let s = settings.lock().map_err(|e| e.to_string())?;
    Ok(s.clone())
}

#[tauri::command]
pub fn update_settings(
    settings: State<'_, Mutex<AppSettings>>,
    updates: serde_json::Value,
) -> Result<AppSettings, String> {
    let mut s = settings.lock().map_err(|e| e.to_string())?;

    // Merge partial updates into the existing settings
    if let Some(key) = updates.get("openaiApiKey").and_then(|v| v.as_str()) {
        s.openai_api_key = if key.is_empty() { None } else { Some(key.to_string()) };
    }
    if let Some(val) = updates.get("autoLaunch").and_then(|v| v.as_bool()) {
        s.auto_launch = val;
    }
    if let Some(val) = updates.get("notificationsEnabled").and_then(|v| v.as_bool()) {
        s.notifications_enabled = val;
    }
    if let Some(val) = updates.get("globalHotkey").and_then(|v| v.as_str()) {
        s.global_hotkey = val.to_string();
    }

    save_settings(&s)?;
    Ok(s.clone())
}

/* ------------------------------------------------------------------ */
/*  File export — saves content to disk via native file dialog         */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn export_document(
    app: tauri::AppHandle,
    content: String,
    filename: String,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter("Markdown", &["md"])
        .add_filter("Text", &["txt"])
        .add_filter("All files", &["*"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            fs::write(path.as_path().unwrap(), &content).map_err(|e| e.to_string())?;
            Ok(path.to_string())
        }
        None => Err("Export cancelled".to_string()),
    }
}

/* ------------------------------------------------------------------ */
/*  Data import — migrate from the web app's SQLite DB                 */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub fn import_from_web(
    db: State<'_, Mutex<Connection>>,
    source_path: String,
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Attach the source database
    conn.execute(
        "ATTACH DATABASE ?1 AS web",
        rusqlite::params![source_path],
    )
    .map_err(|e| format!("Failed to open source database: {e}"))?;

    // Import projects (remap user_id to 'desktop')
    let project_count: i64 = conn
        .execute(
            "INSERT OR IGNORE INTO main.projects (id, user_id, name, color, created_at)
             SELECT id, 'desktop', name, color, created_at FROM web.projects",
            [],
        )
        .map_err(|e| e.to_string())? as i64;

    // Import tasks
    let task_count: i64 = conn
        .execute(
            "INSERT OR IGNORE INTO main.tasks (id, user_id, project_id, title, description, status, priority, due_date, source_text, ai_generated, sort_order, recurrence_rule, recurrence_source_id, created_at, updated_at)
             SELECT id, 'desktop', project_id, title, description, status, priority, due_date, source_text, ai_generated, sort_order, recurrence_rule, recurrence_source_id, created_at, updated_at FROM web.tasks",
            [],
        )
        .map_err(|e| e.to_string())? as i64;

    // Detach
    conn.execute("DETACH DATABASE web", []).map_err(|e| e.to_string())?;

    Ok(format!("Imported {project_count} projects and {task_count} tasks"))
}
