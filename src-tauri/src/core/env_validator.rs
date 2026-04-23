use crate::models::{
    CheckOverall, DependencyStatus, EnvCheckResult, InstallStage, LogEntry, LogLevel, Tool,
    now_ms,
};
use crate::core::dependency_detector::check_dependency;
use std::net::TcpStream;
use std::time::Duration;
use tauri::AppHandle;

fn log(app_data_dir: &std::path::Path, app: &AppHandle, tool_id: &str, level: LogLevel, stage: InstallStage, msg: &str) {
    crate::core::log_manager::append(
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

pub async fn check_environment(
    tool: &Tool,
    app_data_dir: &std::path::Path,
    app: &AppHandle,
    tool_id: &str,
) -> EnvCheckResult {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let os_version = get_os_version();
    let disk_available_gb = get_disk_free_gb();
    let network_accessible = check_network();

    log(app_data_dir, app, tool_id, LogLevel::Info, InstallStage::EnvCheck, &format!("开始环境检测：{}", tool.name));
    log(app_data_dir, app, tool_id, LogLevel::Info, InstallStage::EnvCheck, &format!("操作系统：{} / 架构：{}", os_version, arch));
    log(app_data_dir, app, tool_id, LogLevel::Info, InstallStage::EnvCheck, &format!("可用磁盘：{disk_available_gb:.1} GB"));
    log(
        app_data_dir,
        app,
        tool_id,
        if network_accessible { LogLevel::Info } else { LogLevel::Error },
        InstallStage::EnvCheck,
        if network_accessible {
            "网络检测通过，可访问外部安装源"
        } else {
            "网络检测失败，当前无法访问外部安装源"
        },
    );

    // Check each dependency
    let mut dep_results = Vec::new();
    for dep in &tool.dependencies {
        log(
            app_data_dir,
            app,
            tool_id,
            LogLevel::Info,
            InstallStage::DepCheck,
            &format!("检测依赖：{}（最低版本 {}）", dep.display_name, dep.min_version),
        );

        let result = check_dependency(dep).await;
        let level = match result.status {
            DependencyStatus::Satisfied => LogLevel::Info,
            DependencyStatus::Missing | DependencyStatus::VersionInsufficient if dep.required => {
                LogLevel::Error
            }
            DependencyStatus::Missing | DependencyStatus::VersionInsufficient => LogLevel::Warn,
            DependencyStatus::CheckFailed => LogLevel::Warn,
        };

        log(
            app_data_dir,
            app,
            tool_id,
            level,
            InstallStage::DepCheck,
            &format!("{}：{}", dep.display_name, result.message),
        );

        if !matches!(result.status, DependencyStatus::Satisfied) && !result.install_guide.is_empty() {
            log(
                app_data_dir,
                app,
                tool_id,
                LogLevel::Info,
                InstallStage::DepCheck,
                &format!("修复建议：{}", result.install_guide),
            );
        }

        dep_results.push(result);
    }

    // Determine overall result
    let has_required_missing = dep_results.iter().any(|r| {
        let dep = tool.dependencies.iter().find(|d| d.id == r.id);
        let required = dep.map(|d| d.required).unwrap_or(true);
        required
            && matches!(
                r.status,
                DependencyStatus::Missing | DependencyStatus::VersionInsufficient
            )
    });

    let has_optional_missing = dep_results.iter().any(|r| {
        let dep = tool.dependencies.iter().find(|d| d.id == r.id);
        let required = dep.map(|d| d.required).unwrap_or(false);
        !required
            && matches!(
                r.status,
                DependencyStatus::Missing | DependencyStatus::VersionInsufficient
            )
    });

    let overall = if has_required_missing || !network_accessible {
        CheckOverall::HasBlockers
    } else if has_optional_missing || disk_available_gb < 1.0 {
        CheckOverall::HasWarnings
    } else {
        CheckOverall::AllSatisfied
    };

    let mut suggestions = Vec::new();

    if !network_accessible {
        suggestions.push("当前网络不可用，安装前请先检查网络、代理或防火墙设置。".to_string());
    }

    if disk_available_gb < 1.0 {
        suggestions.push("可用磁盘空间不足 1 GB，建议清理磁盘后再继续安装。".to_string());
    }

    for dep in &dep_results {
        match dep.status {
            DependencyStatus::Missing => suggestions.push(format!(
                "缺少 {}。{}{}",
                dep.display_name,
                dep.install_guide,
                if dep.message.contains("PATH") {
                    " 如果已经安装，请确认命令所在目录已加入 PATH。"
                } else {
                    ""
                }
            )),
            DependencyStatus::VersionInsufficient => suggestions.push(format!(
                "{} 版本不足，请升级到 {} 或更高版本。{}",
                dep.display_name, dep.required_version, dep.install_guide
            )),
            DependencyStatus::CheckFailed => suggestions.push(format!(
                "无法准确识别 {} 的版本，请手动执行检测命令并确认 PATH 配置是否正确。",
                dep.display_name
            )),
            DependencyStatus::Satisfied => {}
        }
    }

    if suggestions.is_empty() {
        suggestions.push("环境检查已通过，可以继续安装。".to_string());
    }

    let summary = match overall {
        CheckOverall::AllSatisfied => "环境检查通过，可以继续安装。",
        CheckOverall::HasWarnings => "环境检查存在风险项，建议处理后再安装。",
        CheckOverall::HasBlockers => "环境检查存在阻塞项，需先修复后再安装。",
    };

    log(app_data_dir, app, tool_id, LogLevel::Info, InstallStage::EnvCheck, summary);

    EnvCheckResult {
        os,
        arch,
        os_version,
        disk_available_gb,
        network_accessible,
        dependencies: dep_results,
        overall,
        suggestions,
    }
}

fn get_os_version() -> String {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "ver"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_else(|_| "Windows (unknown version)".to_string())
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
            .map(|o| format!("macOS {}", String::from_utf8_lossy(&o.stdout).trim()))
            .unwrap_or_else(|_| "macOS (unknown version)".to_string())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        std::fs::read_to_string("/etc/os-release")
            .map(|s| {
                s.lines()
                    .find(|l| l.starts_with("PRETTY_NAME="))
                    .and_then(|l| l.split('=').nth(1))
                    .map(|v| v.trim_matches('"').to_string())
                    .unwrap_or_else(|| "Linux".to_string())
            })
            .unwrap_or_else(|_| "Linux (unknown)".to_string())
    }
}

fn get_disk_free_gb() -> f64 {
    #[cfg(target_os = "windows")]
    {
        // Use WMIC to get free space on C: drive
        let output = std::process::Command::new("cmd")
            .args(["/C", "wmic logicaldisk where DeviceID='C:' get FreeSpace /value"])
            .output();
        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if line.contains("FreeSpace=") {
                    if let Some(val) = line.split('=').nth(1) {
                        if let Ok(bytes) = val.trim().parse::<u64>() {
                            return bytes as f64 / 1_073_741_824.0;
                        }
                    }
                }
            }
        }
        0.0
    }
    #[cfg(not(target_os = "windows"))]
    {
        let output = std::process::Command::new("df")
            .args(["-k", "/"])
            .output();
        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Some(line) = text.lines().nth(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    if let Ok(kb) = parts[3].parse::<u64>() {
                        return kb as f64 / 1_048_576.0;
                    }
                }
            }
        }
        0.0
    }
}

fn check_network() -> bool {
    TcpStream::connect_timeout(
        &"8.8.8.8:53".parse().unwrap(),
        Duration::from_secs(3),
    )
    .is_ok()
}
