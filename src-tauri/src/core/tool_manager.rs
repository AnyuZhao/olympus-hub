use crate::core::dependency_detector::shell_command;
use crate::core::{log_manager, AppState};
use crate::models::{
    InstallCompletePayload, InstallStage, LogEntry, LogLevel, ToolStatus,
    ToolStatusChangedPayload, now_ms,
};
use std::io::{BufRead, BufReader};
use std::sync::{atomic::Ordering, Arc};
use tauri::{AppHandle, Emitter};

fn emit_status(app: &AppHandle, tool_id: &str, status: ToolStatus) {
    let _ = app.emit(
        "tool_status_changed",
        ToolStatusChangedPayload {
            tool_id: tool_id.to_string(),
            status,
        },
    );
}

fn log(app_data_dir: &std::path::Path, app: &AppHandle, tool_id: &str, level: LogLevel, stage: InstallStage, msg: &str) {
    log_manager::append(
        app_data_dir,
        app,
        tool_id,
        LogEntry {
            timestamp_ms: now_ms(),
            level,
            stage,
            message: msg.to_string(),
        },
    );
}

/// Inject ${INSTALL_DIR} into a command string.
fn inject_install_dir(cmd: &str, dir: Option<&str>) -> String {
    match dir {
        Some(d) => cmd.replace("${INSTALL_DIR}", d),
        None => cmd
            .replace(" --prefix ${INSTALL_DIR}", "")
            .replace("${INSTALL_DIR}", ""),
    }
}

/// Run a shell command, stream output lines to log, return exit success.
fn run_command_streaming(
    cmd: &str,
    app_data_dir: &std::path::Path,
    app: &AppHandle,
    tool_id: &str,
    stage: InstallStage,
    cancel_flag: &Arc<std::sync::atomic::AtomicBool>,
) -> Result<bool, String> {
    let mut command = shell_command(cmd);
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    let mut child = command.spawn().map_err(|e| format!("启动命令失败: {e}"))?;

    // Read stdout
    if let Some(stdout) = child.stdout.take() {
        for line in BufReader::new(stdout).lines().flatten() {
            if cancel_flag.load(Ordering::Relaxed) {
                break;
            }
            log(app_data_dir, app, tool_id, LogLevel::Info, stage.clone(), &line);
        }
    }

    // Read stderr
    if let Some(stderr) = child.stderr.take() {
        for line in BufReader::new(stderr).lines().flatten() {
            if cancel_flag.load(Ordering::Relaxed) {
                break;
            }
            log(app_data_dir, app, tool_id, LogLevel::Warn, stage.clone(), &line);
        }
    }

    if cancel_flag.load(Ordering::Relaxed) {
        let _ = child.kill();
        return Ok(false);
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    Ok(status.success())
}

pub async fn install_tool(tool_id: String, state: Arc<AppState>, app: AppHandle) {
    let Some(tool) = state.get_tool(&tool_id) else {
        eprintln!("Tool not found: {tool_id}");
        return;
    };

    // Set cancel flag
    let cancel_flag = Arc::new(std::sync::atomic::AtomicBool::new(false));
    state
        .install_cancel_flags
        .lock()
        .unwrap()
        .insert(tool_id.clone(), cancel_flag.clone());

    // → Installing
    state.set_status(&tool_id, ToolStatus::Installing);
    emit_status(&app, &tool_id, ToolStatus::Installing);

    log(&state.app_data_dir, &app, &tool_id, LogLevel::Info, InstallStage::Install, "开始安装...");

    let install_dir = state.resolve_install_dir(&tool);

    for cmd in &tool.install_config.install_commands {
        if cancel_flag.load(Ordering::Relaxed) {
            break;
        }

        let resolved = inject_install_dir(cmd, install_dir.as_deref());
        log(
            &state.app_data_dir,
            &app,
            &tool_id,
            LogLevel::Info,
            InstallStage::Install,
            &format!("执行: {}", resolved),
        );

        match run_command_streaming(
            &resolved,
            &state.app_data_dir,
            &app,
            &tool_id,
            InstallStage::Install,
            &cancel_flag,
        ) {
            Err(e) => {
                finish_install(&state, &app, &tool_id, false, Some(e), false);
                return;
            }
            Ok(false) if !cancel_flag.load(Ordering::Relaxed) => {
                finish_install(
                    &state,
                    &app,
                    &tool_id,
                    false,
                    Some(format!("命令退出异常: {}", resolved)),
                    false,
                );
                return;
            }
            Ok(_) => {}
        }
    }

    if cancel_flag.load(Ordering::Relaxed) {
        state.set_status(&tool_id, ToolStatus::NotInstalled);
        emit_status(&app, &tool_id, ToolStatus::NotInstalled);
        let _ = app.emit(
            "install_complete",
            InstallCompletePayload {
                tool_id: tool_id.clone(),
                success: false,
                cancelled: true,
                error: None,
            },
        );
        return;
    }

    // Post-install check
    if let Some(check_cmd) = &tool.install_config.post_install_check {
        log(
            &state.app_data_dir,
            &app,
            &tool_id,
            LogLevel::Info,
            InstallStage::PostInstall,
            &format!("安装后验证: {}", check_cmd),
        );
        let _ = run_command_streaming(
            check_cmd,
            &state.app_data_dir,
            &app,
            &tool_id,
            InstallStage::PostInstall,
            &cancel_flag,
        );
    }

    finish_install(&state, &app, &tool_id, true, None, false);
    state.install_cancel_flags.lock().unwrap().remove(&tool_id);
}

fn finish_install(
    state: &AppState,
    app: &AppHandle,
    tool_id: &str,
    success: bool,
    error: Option<String>,
    cancelled: bool,
) {
    let new_status = if success {
        log(&state.app_data_dir, app, tool_id, LogLevel::Info, InstallStage::PostInstall, "安装成功！");
        ToolStatus::Installed
    } else {
        if let Some(ref e) = error {
            log(&state.app_data_dir, app, tool_id, LogLevel::Error, InstallStage::Install, e);
        }
        ToolStatus::Error {
            message: error.clone().unwrap_or_else(|| "安装失败".to_string()),
        }
    };

    state.set_status(tool_id, new_status.clone());
    emit_status(app, tool_id, new_status);

    let _ = app.emit(
        "install_complete",
        InstallCompletePayload {
            tool_id: tool_id.to_string(),
            success,
            cancelled,
            error,
        },
    );
}

pub fn cancel_install(tool_id: &str, state: &AppState) {
    if let Some(flag) = state.install_cancel_flags.lock().unwrap().get(tool_id) {
        flag.store(true, Ordering::Relaxed);
    }
}

pub async fn launch_tool(tool_id: String, state: Arc<AppState>, app: AppHandle) {
    let Some(tool) = state.get_tool(&tool_id) else {
        return;
    };

    state.set_status(&tool_id, ToolStatus::Launching);
    emit_status(&app, &tool_id, ToolStatus::Launching);

    let mut command = shell_command(&format!(
        "{} {}",
        tool.install_config.launch_command,
        tool.install_config.launch_args.join(" ")
    ));

    for (k, v) in &tool.install_config.env_vars {
        command.env(k, v);
    }

    match command.spawn() {
        Err(e) => {
            let msg = format!("启动失败: {e}");
            state.set_status(&tool_id, ToolStatus::Error { message: msg.clone() });
            emit_status(&app, &tool_id, ToolStatus::Error { message: msg });
        }
        Ok(mut child) => {
            let pid = child.id();
            state.set_status(&tool_id, ToolStatus::Running { pid });
            emit_status(&app, &tool_id, ToolStatus::Running { pid });
            state.running_pids.lock().unwrap().insert(tool_id.clone(), pid);

            // Monitor for exit in background
            tokio::spawn(async move {
                let _ = child.wait();
                state.running_pids.lock().unwrap().remove(&tool_id);
                state.set_status(&tool_id, ToolStatus::Installed);
                emit_status(&app, &tool_id, ToolStatus::Installed);
            });
        }
    }
}

pub async fn uninstall_tool(tool_id: String, keep_config: bool, state: Arc<AppState>, app: AppHandle) {
    let Some(tool) = state.get_tool(&tool_id) else {
        return;
    };

    state.set_status(&tool_id, ToolStatus::Installing);
    emit_status(&app, &tool_id, ToolStatus::Installing);

    log(&state.app_data_dir, &app, &tool_id, LogLevel::Info, InstallStage::Uninstall, "开始卸载...");

    let cancel_flag = Arc::new(std::sync::atomic::AtomicBool::new(false));

    for cmd in &tool.install_config.uninstall_commands {
        log(
            &state.app_data_dir,
            &app,
            &tool_id,
            LogLevel::Info,
            InstallStage::Uninstall,
            &format!("执行: {}", cmd),
        );
        let _ = run_command_streaming(
            cmd,
            &state.app_data_dir,
            &app,
            &tool_id,
            InstallStage::Uninstall,
            &cancel_flag,
        );
    }

    if !keep_config {
        log_manager::clear(&state.app_data_dir, &tool_id);
    }

    log(&state.app_data_dir, &app, &tool_id, LogLevel::Info, InstallStage::Uninstall, "卸载完成");
    state.set_status(&tool_id, ToolStatus::NotInstalled);
    emit_status(&app, &tool_id, ToolStatus::NotInstalled);
}
