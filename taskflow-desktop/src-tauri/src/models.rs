//! Domain models shared across IPC commands and the database layer.
//!
//! These structs mirror the Drizzle schema from the original Next.js app
//! and are (de)serialized over Tauri's IPC boundary.

use serde::{Deserialize, Serialize};

/* ------------------------------------------------------------------ */
/*  Task                                                               */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub project_id: Option<String>,
    pub due_date: Option<i64>,
    pub source_text: Option<String>,
    pub ai_generated: bool,
    pub sort_order: f64,
    pub recurrence_rule: Option<String>,
    pub recurrence_source_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub status: Option<String>,
    pub source_text: Option<String>,
    pub ai_generated: Option<bool>,
    pub recurrence_rule: Option<String>,
    pub recurrence_source_id: Option<String>,
    pub sort_order: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub status: Option<String>,
    pub sort_order: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TaskFilter {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub project_id: Option<String>,
}

/* ------------------------------------------------------------------ */
/*  Project                                                            */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub task_count: i64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub color: Option<String>,
}

/* ------------------------------------------------------------------ */
/*  AI                                                                 */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedTask {
    pub title: String,
    pub description: String,
    pub suggested_project: String,
    pub priority: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskForDoc {
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub project_name: Option<String>,
}

/* ------------------------------------------------------------------ */
/*  App settings                                                       */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub openai_api_key: Option<String>,
    pub auto_launch: bool,
    pub notifications_enabled: bool,
    pub global_hotkey: String,
    pub check_overdue_interval_min: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            openai_api_key: None,
            auto_launch: false,
            notifications_enabled: true,
            global_hotkey: "CmdOrCtrl+Shift+T".to_string(),
            check_overdue_interval_min: 5,
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Dashboard stats (returned by a single IPC call)                    */
/* ------------------------------------------------------------------ */

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total: i64,
    pub todo: i64,
    pub in_progress: i64,
    pub done: i64,
    pub overdue: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardData {
    pub stats: DashboardStats,
    pub upcoming: Vec<Task>,
    pub recent: Vec<Task>,
}
