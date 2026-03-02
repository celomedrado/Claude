//! TaskFlow Desktop — Tauri v2 application library.
//!
//! This is the main entry point for the Tauri backend. It initializes:
//! - SQLite database with migrations
//! - App settings from disk
//! - All IPC command handlers
//! - Tauri plugins (notification, global-shortcut, autostart, window-state, dialog)
//! - System tray with menu
//! - Background overdue task checker

mod commands;
mod db;
mod models;
mod notifications;

use commands::{ai, app, projects, tasks};
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_mutex = db::init_db().expect("Failed to initialize database");

    // Load persisted settings
    let settings = app::load_settings();

    tauri::Builder::default()
        // ── Plugins ──────────────────────────────────────────────
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // ── Managed state ────────────────────────────────────────
        .manage(db_mutex)
        .manage(Mutex::new(settings))
        // ── IPC command handlers ─────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            // Tasks
            tasks::list_tasks,
            tasks::create_task,
            tasks::update_task,
            tasks::delete_task,
            tasks::bulk_create_tasks,
            tasks::get_dashboard,
            // Projects
            projects::list_projects,
            projects::create_project,
            projects::update_project,
            projects::delete_project,
            // AI
            ai::extract_tasks,
            ai::generate_document,
            ai::categorize_task,
            // App
            app::get_settings,
            app::update_settings,
            app::export_document,
            app::import_from_web,
        ])
        // ── App setup (tray, menu, shortcuts, notifications) ─────
        .setup(|app| {
            // System tray with menu
            let show = MenuItemBuilder::with_id("show", "Show TaskFlow").build(app)?;
            let new_task = MenuItemBuilder::with_id("new_task", "New Task").build(app)?;
            let settings = MenuItemBuilder::with_id("settings", "Preferences...").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit TaskFlow").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show)
                .separator()
                .item(&new_task)
                .item(&settings)
                .separator()
                .item(&quit)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .tooltip("TaskFlow")
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "new_task" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("open-quick-add", ());
                            }
                        }
                        "settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("open-settings", ());
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Register global shortcut (Cmd+Shift+T)
            {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
                let app_handle = app.handle().clone();
                app.global_shortcut().on_shortcut("CmdOrCtrl+Shift+T", move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("global-shortcut-triggered", "quick-add");
                        }
                    }
                })?;
            }

            // Start background overdue task checker
            notifications::start_overdue_checker(app.handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
