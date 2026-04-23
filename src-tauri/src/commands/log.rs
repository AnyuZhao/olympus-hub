use crate::core::{log_manager, AppState};
use crate::models::LogEntry;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn get_install_logs(
    tool_id: String,
    limit: Option<usize>,
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<LogEntry>, String> {
    Ok(log_manager::read(
        &state.app_data_dir,
        &tool_id,
        limit.unwrap_or(500),
    ))
}
