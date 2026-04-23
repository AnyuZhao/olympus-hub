import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";

const fetchMock = vi.fn().mockResolvedValue(undefined);
const saveMock = vi.fn().mockResolvedValue(undefined);
const updateMock = vi.fn();
const patchMock = vi.fn();
const listenMock = vi.fn().mockResolvedValue(() => undefined);
const isEnabledMock = vi.fn().mockResolvedValue(false);

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  disable: vi.fn(),
  enable: vi.fn(),
  isEnabled: (...args: unknown[]) => isEnabledMock(...args),
}));

vi.mock("../stores/useSettingsStore", () => ({
  useSettingsStore: () => ({
    settings: {
      install_dir: null,
      autostart_enabled: false,
    },
    loaded: true,
    fetch: fetchMock,
    save: saveMock,
    update: updateMock,
    patch: patchMock,
  }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    saveMock.mockClear();
    updateMock.mockClear();
    patchMock.mockClear();
    listenMock.mockClear();
    isEnabledMock.mockClear();
  });

  it("does not show Ollama related settings in current version", () => {
    render(<SettingsPage />);

    expect(screen.getByText("统一安装目录")).toBeInTheDocument();
    expect(screen.getByText("开机自启")).toBeInTheDocument();
    expect(screen.queryByText("Ollama 接口地址")).not.toBeInTheDocument();
    expect(screen.queryByText("默认模型")).not.toBeInTheDocument();
  });
});
