use crate::core::{env_validator, log_manager, tool_manager, AppState};
use crate::models::{EnvCheckResult, ToolStatus, ToolWithStatus};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn get_tool_list(state: State<'_, Arc<AppState>>) -> Result<Vec<ToolWithStatus>, String> {
    let result = state
        .get_tools()
        .iter()
        .map(|t| ToolWithStatus {
            status: state.get_status(&t.id),
            tool: t.clone(),
        })
        .collect();
    Ok(result)
}

#[tauri::command]
pub async fn get_tool_status(
    tool_id: String,
    state: State<'_, Arc<AppState>>,
) -> Result<ToolStatus, String> {
    Ok(state.get_status(&tool_id))
}

#[tauri::command]
pub async fn check_environment(
    tool_id: String,
    state: State<'_, Arc<AppState>>,
    app: AppHandle,
) -> Result<EnvCheckResult, String> {
    let tool = state
        .get_tool(&tool_id)
        .ok_or_else(|| format!("TOOL_NOT_FOUND: {tool_id}"))?;
    log_manager::clear(&state.app_data_dir, &tool_id);
    Ok(env_validator::check_environment(&tool, &state.app_data_dir, &app, &tool_id).await)
}

#[tauri::command]
pub async fn install_tool(
    tool_id: String,
    state: State<'_, Arc<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let current = state.get_status(&tool_id);
    if matches!(current, ToolStatus::Installing) {
        return Err("ALREADY_INSTALLING".to_string());
    }
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        tool_manager::install_tool(tool_id, state_clone, app).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn cancel_install(
    tool_id: String,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    tool_manager::cancel_install(&tool_id, &state);
    Ok(())
}

#[tauri::command]
pub async fn launch_tool(
    tool_id: String,
    state: State<'_, Arc<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let current = state.get_status(&tool_id);
    match current {
        ToolStatus::Running { .. } => return Err("ALREADY_RUNNING".to_string()),
        ToolStatus::NotInstalled => return Err("NOT_INSTALLED".to_string()),
        _ => {}
    }
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        tool_manager::launch_tool(tool_id, state_clone, app).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn uninstall_tool(
    tool_id: String,
    keep_config: Option<bool>,
    state: State<'_, Arc<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let state_clone = state.inner().clone();
    tauri::async_runtime::spawn(async move {
        tool_manager::uninstall_tool(tool_id, keep_config.unwrap_or(false), state_clone, app)
            .await;
    });
    Ok(())
}
