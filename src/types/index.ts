// ── Tool models ───────────────────────────────────────────────────────────────

export interface DependencySpec {
  id: string;
  display_name: string;
  min_version: string;
  check_command: string;
  version_regex: string;
  install_guide: string;
  required: boolean;
}

export interface InstallConfig {
  install_commands: string[];
  uninstall_commands: string[];
  launch_command: string;
  launch_args: string[];
  working_dir: string | null;
  env_vars: Record<string, string>;
  post_install_check: string | null;
  install_dir_override: string | null;
}

export interface ToolSource {
  source_type: "Npm" | "PyPi" | "GitHub" | "Direct";
  url: string;
  checksum: string | null;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  dependencies: DependencySpec[];
  install_config: InstallConfig;
  source: ToolSource;
}

export type ToolStatus =
  | { type: "NotInstalled" }
  | { type: "Installing" }
  | { type: "Installed" }
  | { type: "Launching" }
  | { type: "Running"; data: { pid: number } }
  | { type: "Error"; data: { message: string } };

export interface ToolWithStatus extends Tool {
  status: ToolStatus;
}

// ── Dependency check ──────────────────────────────────────────────────────────

export type DependencyStatus =
  | "Satisfied"
  | "Missing"
  | "VersionInsufficient"
  | "CheckFailed";

export interface DependencyCheckResult {
  id: string;
  display_name: string;
  status: DependencyStatus;
  current_version: string | null;
  required_version: string;
  message: string;
  install_guide: string;
}

export type CheckOverall = "AllSatisfied" | "HasWarnings" | "HasBlockers";

export interface EnvCheckResult {
  os: string;
  arch: string;
  os_version: string;
  disk_available_gb: number;
  network_accessible: boolean;
  dependencies: DependencyCheckResult[];
  overall: CheckOverall;
  suggestions: string[];
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface AppSettings {
  install_dir: string | null;
  autostart_enabled: boolean;
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export type LogLevel = "Info" | "Warn" | "Error" | "Debug";
export type InstallStage =
  | "EnvCheck"
  | "DepCheck"
  | "Install"
  | "PostInstall"
  | "Launch"
  | "Uninstall";

export interface LogEntry {
  timestamp_ms: number;
  level: LogLevel;
  stage: InstallStage;
  message: string;
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface ToolStatusChangedPayload {
  tool_id: string;
  status: ToolStatus;
}

export interface InstallCompletePayload {
  tool_id: string;
  success: boolean;
  cancelled: boolean;
  error: string | null;
}

export interface LogAppendedPayload {
  tool_id: string;
  entry: LogEntry;
}

export interface SettingsChangedPayload {
  settings: AppSettings;
}
