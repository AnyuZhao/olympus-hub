use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub category: String,
    pub dependencies: Vec<DependencySpec>,
    pub install_config: InstallConfig,
    pub source: ToolSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "data")]
pub enum ToolStatus {
    NotInstalled,
    Installing,
    Installed,
    Launching,
    Running { pid: u32 },
    Error { message: String },
}

/// Tool enriched with runtime status, sent to frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolWithStatus {
    #[serde(flatten)]
    pub tool: Tool,
    pub status: ToolStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencySpec {
    pub id: String,
    pub display_name: String,
    pub min_version: String,
    pub check_command: String,
    pub version_regex: String,
    pub install_guide: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallConfig {
    pub install_commands: Vec<String>,
    pub uninstall_commands: Vec<String>,
    pub launch_command: String,
    pub launch_args: Vec<String>,
    pub working_dir: Option<String>,
    pub env_vars: HashMap<String, String>,
    pub post_install_check: Option<String>,
    pub install_dir_override: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSource {
    pub source_type: SourceType,
    pub url: String,
    pub checksum: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SourceType {
    Npm,
    PyPi,
    GitHub,
    Direct,
}

// ── Dependency check types ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyCheckResult {
    pub id: String,
    pub display_name: String,
    pub status: DependencyStatus,
    pub current_version: Option<String>,
    pub required_version: String,
    pub message: String,
    pub install_guide: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DependencyStatus {
    Satisfied,
    Missing,
    VersionInsufficient,
    CheckFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvCheckResult {
    pub os: String,
    pub arch: String,
    pub os_version: String,
    pub disk_available_gb: f64,
    pub network_accessible: bool,
    pub dependencies: Vec<DependencyCheckResult>,
    pub overall: CheckOverall,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CheckOverall {
    AllSatisfied,
    HasWarnings,
    HasBlockers,
}

// ── Event payloads ────────────────────────────────────────────────────────────

#[derive(Clone, Serialize)]
pub struct ToolStatusChangedPayload {
    pub tool_id: String,
    pub status: ToolStatus,
}

#[derive(Clone, Serialize)]
pub struct InstallCompletePayload {
    pub tool_id: String,
    pub success: bool,
    pub cancelled: bool,
    pub error: Option<String>,
}
