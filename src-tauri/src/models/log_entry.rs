use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp_ms: u64,
    pub level: LogLevel,
    pub stage: InstallStage,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
    Debug,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InstallStage {
    EnvCheck,
    DepCheck,
    DepInstall,
    Install,
    PostInstall,
    Launch,
    Uninstall,
}

#[derive(Clone, Serialize)]
pub struct LogAppendedPayload {
    pub tool_id: String,
    pub entry: LogEntry,
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
