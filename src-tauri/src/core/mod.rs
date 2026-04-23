pub mod config_manager;
pub mod dependency_detector;
pub mod env_validator;
pub mod log_manager;
pub mod tool_manager;

use crate::models::{AppSettings, Tool, ToolStatus};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::sync::atomic::AtomicBool;

pub struct AppState {
    pub tools: Mutex<Vec<Tool>>,
    pub tool_states: Mutex<HashMap<String, ToolStatus>>,
    pub settings: Mutex<AppSettings>,
    pub app_data_dir: PathBuf,
    /// cancel flag per tool_id — set to true to abort a running install
    pub install_cancel_flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
    /// PID of running tool processes
    pub running_pids: Mutex<HashMap<String, u32>>,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf, tools: Vec<Tool>) -> Self {
        let state_path = app_data_dir.join("tool_states.json");
        let tool_states: HashMap<String, ToolStatus> = if state_path.exists() {
            std::fs::read_to_string(&state_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            HashMap::new()
        };

        let settings_path = app_data_dir.join("settings.json");
        let settings: AppSettings = if settings_path.exists() {
            std::fs::read_to_string(&settings_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            AppSettings::default()
        };

        Self {
            tools: Mutex::new(tools),
            tool_states: Mutex::new(tool_states),
            settings: Mutex::new(settings),
            app_data_dir,
            install_cancel_flags: Mutex::new(HashMap::new()),
            running_pids: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_tool(&self, tool_id: &str) -> Option<Tool> {
        self.tools
            .lock()
            .unwrap()
            .iter()
            .find(|t| t.id == tool_id)
            .cloned()
    }

    pub fn get_tools(&self) -> Vec<Tool> {
        self.tools.lock().unwrap().clone()
    }

    pub fn get_status(&self, tool_id: &str) -> ToolStatus {
        self.tool_states
            .lock()
            .unwrap()
            .get(tool_id)
            .cloned()
            .unwrap_or(ToolStatus::NotInstalled)
    }

    pub fn set_status(&self, tool_id: &str, status: ToolStatus) {
        {
            let mut states = self.tool_states.lock().unwrap();
            states.insert(tool_id.to_string(), status);
        }
        self.persist_states();
    }

    fn persist_states(&self) {
        let states = self.tool_states.lock().unwrap();
        // Only persist terminal states
        let to_persist: HashMap<&String, &ToolStatus> = states
            .iter()
            .filter(|(_, s)| {
                matches!(s, ToolStatus::Installed | ToolStatus::NotInstalled)
            })
            .collect();
        if let Ok(json) = serde_json::to_string_pretty(&to_persist) {
            let _ = std::fs::write(self.app_data_dir.join("tool_states.json"), json);
        }
    }

    pub fn persist_settings(&self) {
        let settings = self.settings.lock().unwrap().clone();
        if let Ok(json) = serde_json::to_string_pretty(&settings) {
            let _ = std::fs::write(self.app_data_dir.join("settings.json"), json);
        }
    }

    /// Resolve the effective install directory for a tool.
    pub fn resolve_install_dir(&self, tool: &Tool) -> Option<String> {
        tool.install_config
            .install_dir_override
            .clone()
            .or_else(|| self.settings.lock().unwrap().install_dir.clone())
    }
}
