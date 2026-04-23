mod commands;
mod core;
mod models;

use core::{config_manager, AppState};
use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");
            std::fs::create_dir_all(&app_data_dir)?;

            let tools = config_manager::load_tools(&app_data_dir);
            let state = Arc::new(AppState::new(app_data_dir, tools));
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::tool::get_tool_list,
            commands::tool::get_tool_status,
            commands::tool::check_environment,
            commands::tool::install_tool,
            commands::tool::cancel_install,
            commands::tool::launch_tool,
            commands::tool::uninstall_tool,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::log::get_install_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
