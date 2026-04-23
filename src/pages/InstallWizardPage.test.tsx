import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstallWizardPage } from "./InstallWizardPage";
import type { EnvCheckResult, LogEntry, ToolWithStatus } from "../types";

const navigateMock = vi.fn();
const listenMock = vi.fn().mockResolvedValue(() => undefined);
const checkEnvironmentMock = vi.fn();
const getInstallLogsMock = vi.fn();
const installToolMock = vi.fn();
const cancelInstallMock = vi.fn();
const setStepMock = vi.fn();
const setEnvCheckMock = vi.fn();
const setLogsMock = vi.fn();
const appendLogMock = vi.fn();
const setDoneMock = vi.fn();
const resetMock = vi.fn();
const updateStatusMock = vi.fn();

const envCheck: EnvCheckResult = {
  os: "windows",
  arch: "x86_64",
  os_version: "Windows 11",
  disk_available_gb: 32,
  network_accessible: true,
  dependencies: [],
  overall: "AllSatisfied",
  suggestions: [],
};

const logEntries: LogEntry[] = [
  {
    timestamp_ms: Date.now(),
    level: "Info",
    stage: "EnvCheck",
    message: "环境检查完成",
  },
];

const demoTool: ToolWithStatus = {
  id: "codex",
  name: "OpenAI Codex CLI",
  description: "demo",
  version: "latest",
  category: "code",
  dependencies: [],
  install_config: {
    install_commands: ["npm install -g @openai/codex"],
    uninstall_commands: ["npm uninstall -g @openai/codex"],
    launch_command: "codex",
    launch_args: [],
    working_dir: null,
    env_vars: {},
    post_install_check: "codex --version",
    install_dir_override: null,
  },
  source: {
    source_type: "Npm",
    url: "@openai/codex",
    checksum: null,
  },
  status: { type: "NotInstalled" },
};

let installStoreState: {
  step: "precheck";
  envCheck: EnvCheckResult | null;
  logs: LogEntry[];
  success: boolean;
  error: string | null;
  setStep: typeof setStepMock;
  setEnvCheck: typeof setEnvCheckMock;
  setLogs: typeof setLogsMock;
  appendLog: typeof appendLogMock;
  setDone: typeof setDoneMock;
  reset: typeof resetMock;
} = {
  step: "precheck" as const,
  envCheck,
  logs: logEntries,
  success: false,
  error: null as string | null,
  setStep: setStepMock,
  setEnvCheck: setEnvCheckMock,
  setLogs: setLogsMock,
  appendLog: appendLogMock,
  setDone: setDoneMock,
  reset: resetMock,
};

let toolStoreState = {
  tools: [demoTool],
  updateStatus: updateStatusMock,
};

vi.mock("react-router-dom", () => ({
  useParams: () => ({ toolId: "codex" }),
  useNavigate: () => navigateMock,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

vi.mock("../api/tauri", () => ({
  api: {
    checkEnvironment: (...args: unknown[]) => checkEnvironmentMock(...args),
    getInstallLogs: (...args: unknown[]) => getInstallLogsMock(...args),
    installTool: (...args: unknown[]) => installToolMock(...args),
    cancelInstall: (...args: unknown[]) => cancelInstallMock(...args),
  },
}));

vi.mock("../stores/useInstallStore", () => ({
  useInstallStore: () => installStoreState,
}));

vi.mock("../stores/useToolStore", () => ({
  useToolStore: (selector: (state: typeof toolStoreState) => unknown) => selector(toolStoreState),
}));

describe("InstallWizardPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    listenMock.mockClear();
    checkEnvironmentMock.mockReset();
    getInstallLogsMock.mockReset();
    installToolMock.mockReset();
    cancelInstallMock.mockReset();
    setStepMock.mockReset();
    setEnvCheckMock.mockReset();
    setLogsMock.mockReset();
    appendLogMock.mockReset();
    setDoneMock.mockReset();
    resetMock.mockReset();
    updateStatusMock.mockReset();

    checkEnvironmentMock.mockResolvedValue(envCheck);
    getInstallLogsMock.mockResolvedValue(logEntries);

    installStoreState = {
      step: "precheck",
      envCheck,
      logs: logEntries,
      success: false,
      error: null,
      setStep: setStepMock,
      setEnvCheck: setEnvCheckMock,
      setLogs: setLogsMock,
      appendLog: appendLogMock,
      setDone: setDoneMock,
      reset: resetMock,
    };

    toolStoreState = {
      tools: [demoTool],
      updateStatus: updateStatusMock,
    };
  });

  it("shows precheck content when env check is available", async () => {
    render(<InstallWizardPage />);

    expect(await screen.findByText("安装 OpenAI Codex CLI")).toBeInTheDocument();
    expect(screen.getByText("环境就绪，可以安装")).toBeInTheDocument();
  });

  it("shows retry UI instead of blank page when precheck data is missing", async () => {
    installStoreState = {
      ...installStoreState,
      envCheck: null,
    };

    const user = userEvent.setup();
    render(<InstallWizardPage />);

    expect(await screen.findByText("未能加载安装详情")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重新加载详情" }));

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledTimes(2);
      expect(setStepMock).toHaveBeenCalledWith("checking");
      expect(checkEnvironmentMock).toHaveBeenCalledWith("codex");
      expect(setEnvCheckMock).toHaveBeenCalledWith(envCheck);
      expect(setLogsMock).toHaveBeenCalledWith(logEntries);
      expect(setStepMock).toHaveBeenCalledWith("precheck");
    });
  });
});
