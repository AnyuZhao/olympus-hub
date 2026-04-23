import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "./useSettingsStore";
import { api } from "../api/tauri";

vi.mock("../api/tauri", () => ({
  api: {
    getSettings: vi.fn(),
    setSettings: vi.fn(),
  },
}));

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
        install_dir: null,
        autostart_enabled: false,
      },
      loaded: false,
    });
    vi.clearAllMocks();
  });

  it("patch merges partial settings", () => {
    useSettingsStore.getState().patch({ install_dir: "D:/Tools" });

    expect(useSettingsStore.getState().settings).toMatchObject({
      install_dir: "D:/Tools",
      autostart_enabled: false,
    });
  });

  it("fetch loads settings from api", async () => {
    vi.mocked(api.getSettings).mockResolvedValue({
      install_dir: "D:/Tools",
      autostart_enabled: true,
    });

    await useSettingsStore.getState().fetch();

    expect(useSettingsStore.getState().loaded).toBe(true);
    expect(useSettingsStore.getState().settings.install_dir).toBe("D:/Tools");
  });

  it("save persists settings and updates local state", async () => {
    const next = {
      install_dir: "D:/Tools",
      autostart_enabled: false,
    };

    await useSettingsStore.getState().save(next);

    expect(api.setSettings).toHaveBeenCalledWith(next);
    expect(useSettingsStore.getState().settings).toEqual(next);
  });
});
