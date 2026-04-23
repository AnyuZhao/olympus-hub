import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  EnvCheckResult,
  LogEntry,
  ToolStatus,
  ToolWithStatus,
} from "../types";

export const api = {
  getToolList: () => invoke<ToolWithStatus[]>("get_tool_list"),

  getToolStatus: (tool_id: string) =>
    invoke<ToolStatus>("get_tool_status", { tool_id }),

  checkEnvironment: (tool_id: string) =>
    invoke<EnvCheckResult>("check_environment", { tool_id }),

  installTool: (tool_id: string) =>
    invoke<void>("install_tool", { tool_id }),

  cancelInstall: (tool_id: string) =>
    invoke<void>("cancel_install", { tool_id }),

  launchTool: (tool_id: string) => invoke<void>("launch_tool", { tool_id }),

  uninstallTool: (tool_id: string, keep_config = false) =>
    invoke<void>("uninstall_tool", { tool_id, keepConfig: keep_config }),

  getSettings: () => invoke<AppSettings>("get_settings"),

  setSettings: (settings: AppSettings) =>
    invoke<void>("set_settings", { settings }),

  getInstallLogs: (tool_id: string, limit = 500) =>
    invoke<LogEntry[]>("get_install_logs", { tool_id, limit }),
};
