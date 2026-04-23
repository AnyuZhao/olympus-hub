use crate::models::{LogAppendedPayload, LogEntry};
use std::io::Write;
use std::path::Path;
use tauri::{AppHandle, Emitter};

pub fn append(app_data_dir: &Path, app: &AppHandle, tool_id: &str, entry: LogEntry) {
    let log_dir = app_data_dir.join("logs");
    let _ = std::fs::create_dir_all(&log_dir);
    let log_path = log_dir.join(format!("{}.jsonl", tool_id));

    // Append to log file
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        if let Ok(line) = serde_json::to_string(&entry) {
            let _ = writeln!(file, "{}", line);
        }
    }

    // Emit to frontend
    let _ = app.emit(
        "log_appended",
        LogAppendedPayload {
            tool_id: tool_id.to_string(),
            entry,
        },
    );
}

pub fn read(app_data_dir: &Path, tool_id: &str, limit: usize) -> Vec<LogEntry> {
    let log_path = app_data_dir.join("logs").join(format!("{}.jsonl", tool_id));
    let Ok(content) = std::fs::read_to_string(&log_path) else {
        return Vec::new();
    };

    let mut entries: Vec<LogEntry> = content
        .lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();

    // Return last `limit` entries
    if entries.len() > limit {
        entries.drain(0..entries.len() - limit);
    }
    entries
}

pub fn clear(app_data_dir: &Path, tool_id: &str) {
    let log_path = app_data_dir.join("logs").join(format!("{}.jsonl", tool_id));
    let _ = std::fs::remove_file(log_path);
}
