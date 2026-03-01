//! Background scheduler for overdue task notifications.
//!
//! Checks every N minutes for tasks that are past due and fires
//! macOS native notifications via tauri-plugin-notification.

use crate::models::AppSettings;
use rusqlite::{params, Connection};
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const USER_ID: &str = "desktop";

/// Spawns a background loop that periodically checks for overdue tasks
/// and sends native notifications for newly-overdue items.
pub fn start_overdue_checker(app: &AppHandle) {
    let app_handle = app.clone();

    // Track which tasks we've already notified about (avoids repeat alerts)
    std::thread::spawn(move || {
        let mut notified: HashSet<String> = HashSet::new();

        loop {
            // Read check interval from settings
            let interval_min = {
                let settings = app_handle.state::<Mutex<AppSettings>>();
                let s = settings.lock().unwrap_or_else(|e| e.into_inner());
                if !s.notifications_enabled {
                    // If notifications disabled, still loop but do nothing
                    std::thread::sleep(std::time::Duration::from_secs(60));
                    continue;
                }
                s.check_overdue_interval_min.max(1) as u64
            };

            std::thread::sleep(std::time::Duration::from_secs(interval_min * 60));

            // Query overdue tasks
            let db = app_handle.state::<Mutex<Connection>>();
            let conn = match db.lock() {
                Ok(c) => c,
                Err(_) => continue,
            };

            let now = chrono::Utc::now().timestamp();
            let mut stmt = match conn.prepare(
                "SELECT id, title FROM tasks WHERE user_id = ?1 AND due_date < ?2 AND status NOT IN ('done', 'archived')"
            ) {
                Ok(s) => s,
                Err(_) => continue,
            };

            let overdue: Vec<(String, String)> = stmt
                .query_map(params![USER_ID, now], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })
                .ok()
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default();

            // Send notification for each newly-overdue task
            for (id, title) in &overdue {
                if notified.contains(id) {
                    continue;
                }
                notified.insert(id.clone());

                // Use tauri-plugin-notification
                #[cfg(feature = "notification")]
                {
                    use tauri_plugin_notification::NotificationExt;
                    let _ = app_handle
                        .notification()
                        .builder()
                        .title("Task Overdue")
                        .body(&format!("{title} is past due"))
                        .show();
                }

                // Fallback: log if notification plugin not available
                #[cfg(not(feature = "notification"))]
                {
                    eprintln!("[notification] Task overdue: {title}");
                }
            }

            // Clean up notified set: remove IDs no longer in overdue list
            let overdue_ids: HashSet<String> = overdue.iter().map(|(id, _)| id.clone()).collect();
            notified.retain(|id| overdue_ids.contains(id));
        }
    });
}
