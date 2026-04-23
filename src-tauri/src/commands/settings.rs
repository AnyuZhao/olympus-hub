use crate::core::AppState;
use crate::models::{AppSettings, SettingsChangedPayload};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn get_settings(state: State<'_, Arc<AppState>>) -> Result<AppSettings, String> {
    Ok(state.settings.lock().unwrap().clone())
}

#[tauri::command]
pub async fn set_settings(
    settings: AppSettings,
    state: State<'_, Arc<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    // Validate install_dir if provided
    if let Some(ref dir) = settings.install_dir {
        let path = std::path::Path::new(dir);
        if !path.exists() {
            std::fs::create_dir_all(path)
                .map_err(|e| format!("INVALID_INSTALL_DIR: 无法创建目录 {e}"))?;
        }
        // Test write permission
        let test_file = path.join(".olympus_write_test");
        std::fs::write(&test_file, b"test")
            .map_err(|_| "INVALID_INSTALL_DIR: 目录无写入权限".to_string())?;
        let _ = std::fs::remove_file(test_file);
    }

    *state.settings.lock().unwrap() = settings.clone();
    state.persist_settings();

    let _ = app.emit("settings_changed", SettingsChangedPayload { settings });
    Ok(())
}
