use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    /// Unified install directory. None = use each tool's system default.
    pub install_dir: Option<String>,
    /// Whether the app should launch automatically when the user logs in.
    #[serde(default)]
    pub autostart_enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            install_dir: None,
            autostart_enabled: false,
        }
    }
}

#[derive(Clone, Serialize)]
pub struct SettingsChangedPayload {
    pub settings: AppSettings,
}
