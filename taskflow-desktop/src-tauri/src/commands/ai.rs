//! Tauri IPC commands for AI features (OpenAI proxy).
//!
//! The Rust backend makes HTTP requests to OpenAI's API directly,
//! avoiding the need for a Next.js API route layer.

use crate::models::{AppSettings, ExtractedTask, TaskForDoc};
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::State;

const USER_ID: &str = "desktop";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/// Read the OpenAI API key from app settings.
fn get_api_key(settings: &State<'_, Mutex<AppSettings>>) -> Result<String, String> {
    let s = settings.lock().map_err(|e| e.to_string())?;
    s.openai_api_key
        .as_ref()
        .filter(|k| k.len() >= 20)
        .cloned()
        .ok_or_else(|| "AI_OFFLINE: OpenAI API key is not configured. Go to Settings to add it.".to_string())
}

/// Call the OpenAI Chat Completions API.
async fn chat_completion(
    api_key: &str,
    model: &str,
    temperature: f64,
    json_mode: bool,
    system: &str,
    user: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let mut body = json!({
        "model": model,
        "temperature": temperature,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user },
        ]
    });

    if json_mode {
        body["response_format"] = json!({ "type": "json_object" });
    }

    let res = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AI_ERROR: {e}"))?;

    if !res.status().is_success() {
        let status = res.status().as_u16();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("AI_ERROR: OpenAI returned {status}: {text}"));
    }

    let data: Value = res.json().await.map_err(|e| format!("AI_ERROR: {e}"))?;
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(content)
}

/* ------------------------------------------------------------------ */
/*  Extract tasks from text                                            */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn extract_tasks(
    db: State<'_, Mutex<Connection>>,
    settings: State<'_, Mutex<AppSettings>>,
    text: String,
) -> Result<Vec<ExtractedTask>, String> {
    let api_key = get_api_key(&settings)?;

    // Gather existing project names and work summary for context
    let (project_names, work_summary) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT name FROM projects WHERE user_id = ?1")
            .map_err(|e| e.to_string())?;
        let names: Vec<String> = stmt
            .query_map(params![USER_ID], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let summary: Option<String> = conn
            .query_row(
                "SELECT work_summary FROM users WHERE id = ?1",
                params![USER_ID],
                |row| row.get(0),
            )
            .ok()
            .flatten();

        (names, summary)
    };

    let context_block = work_summary
        .as_ref()
        .map(|s| format!("\n\nUser's ongoing work context:\n{s}"))
        .unwrap_or_default();

    let projects_str = if project_names.is_empty() {
        "none yet".to_string()
    } else {
        project_names.join(", ")
    };

    let system = format!(
        "You are a task extraction assistant for project managers. Extract actionable tasks from the provided text.\n\n\
         For each task, provide:\n\
         - title: concise action item (start with a verb)\n\
         - description: additional context if available\n\
         - suggestedProject: best matching project from the list, or a suggested new project name\n\
         - priority: low, medium, high, or urgent\n\
         - dueDate: ISO date string if a deadline is mentioned, null otherwise\n\n\
         Existing projects: {projects_str}{context_block}\n\n\
         Return JSON: {{ \"tasks\": [...] }}\n\
         If no actionable tasks are found, return {{ \"tasks\": [] }}."
    );

    let content = chat_completion(&api_key, "gpt-4o-mini", 0.2, true, &system, &text).await?;

    // Parse the JSON response
    let parsed: Value = serde_json::from_str(&content).unwrap_or(json!({"tasks": []}));
    let tasks: Vec<ExtractedTask> = serde_json::from_value(
        parsed.get("tasks").cloned().unwrap_or(json!([]))
    ).unwrap_or_default();

    // Save the meeting transcript for context accumulation
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let meeting_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        let _ = conn.execute(
            "INSERT INTO meetings (id, user_id, raw_text, task_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![meeting_id, USER_ID, text, tasks.len() as i64, now],
        );
    }

    // Fire-and-forget: update the work summary in the background
    let api_key_clone = api_key.clone();
    let text_clone = text.clone();
    let work_summary_clone = work_summary.clone();
    let db_clone = db.inner().clone();
    tokio::spawn(async move {
        if let Ok(new_summary) = update_work_summary_internal(&api_key_clone, work_summary_clone.as_deref(), &text_clone).await {
            if let Ok(conn) = db_clone.lock() {
                let _ = conn.execute(
                    "UPDATE users SET work_summary = ?1 WHERE id = ?2",
                    params![new_summary, USER_ID],
                );
            }
        }
    });

    Ok(tasks)
}

/// Internal helper to update the rolling work summary via OpenAI.
async fn update_work_summary_internal(
    api_key: &str,
    current_summary: Option<&str>,
    new_transcript: &str,
) -> Result<String, String> {
    let system = "You maintain a concise rolling summary of a user's work context. \
        Keep the summary under 500 words. Focus on: active projects, recurring themes, \
        key people/teams, ongoing priorities, recent decisions. \
        Write in bullet-point style, grouped by project/theme.";

    let user_msg = format!(
        "{}New transcript:\n{new_transcript}\n\nProduce the updated summary:",
        current_summary
            .map(|s| format!("Existing summary:\n{s}\n\n"))
            .unwrap_or_default()
    );

    chat_completion(api_key, "gpt-4o-mini", 0.1, false, system, &user_msg).await
}

/* ------------------------------------------------------------------ */
/*  Generate document from tasks                                       */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn generate_document(
    settings: State<'_, Mutex<AppSettings>>,
    tasks: Vec<TaskForDoc>,
    template: String,
) -> Result<String, String> {
    let api_key = get_api_key(&settings)?;

    let system = match template.as_str() {
        "status_update" => "Generate a concise project status update from these tasks. Include: summary of progress, what's been completed, what's in progress, blockers or overdue items, next steps. Format as clean markdown.",
        "meeting_brief" => "Generate a meeting brief document from these tasks. Include: agenda items, key discussion points, decisions needed, action items. Format as clean markdown.",
        "action_items" => "Generate a clean action items summary from these tasks. Grouped by project, each item with priority and due date. Overdue items highlighted. Format as markdown checklist.",
        _ => return Err("Invalid template. Use: status_update, meeting_brief, or action_items".to_string()),
    };

    let task_list: String = tasks
        .iter()
        .map(|t| {
            format!(
                "- [{}] {} (priority: {}{}{}): {}",
                t.status,
                t.title,
                t.priority,
                t.due_date.as_ref().map(|d| format!(", due: {d}")).unwrap_or_default(),
                t.project_name.as_ref().map(|p| format!(", project: {p}")).unwrap_or_default(),
                if t.description.is_empty() { "no description" } else { &t.description },
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let user_msg = format!("Tasks:\n{task_list}");

    chat_completion(&api_key, "gpt-4o-mini", 0.3, false, system, &user_msg).await
}

/* ------------------------------------------------------------------ */
/*  Categorize a single task                                           */
/* ------------------------------------------------------------------ */

#[tauri::command]
pub async fn categorize_task(
    db: State<'_, Mutex<Connection>>,
    settings: State<'_, Mutex<AppSettings>>,
    title: String,
    description: String,
) -> Result<Value, String> {
    let api_key = get_api_key(&settings)?;

    let project_names = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT name FROM projects WHERE user_id = ?1")
            .map_err(|e| e.to_string())?;
        let names: Vec<String> = stmt
            .query_map(params![USER_ID], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        names
    };

    let projects_str = if project_names.is_empty() {
        "none yet".to_string()
    } else {
        project_names.join(", ")
    };

    let system = format!(
        "Given a task title and description, suggest the best matching project and priority level.\n\
         Existing projects: {projects_str}\n\
         Return JSON: {{ \"project\": \"project name or empty string\", \"priority\": \"low|medium|high|urgent\" }}"
    );

    let user_msg = format!("Title: {title}\nDescription: {description}");
    let content = chat_completion(&api_key, "gpt-4o-mini", 0.1, true, &system, &user_msg).await?;

    let result: Value = serde_json::from_str(&content)
        .unwrap_or(json!({"project": "", "priority": "medium"}));

    Ok(result)
}
