import { create } from "zustand";
import { api } from "../api/tauri";
import type { AppSettings } from "../types";

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  fetch: () => Promise<void>;
  update: (settings: AppSettings) => void;
  patch: (partial: Partial<AppSettings>) => void;
  save: (settings: AppSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {
    install_dir: null,
    autostart_enabled: false,
  },
  loaded: false,

  fetch: async () => {
    const settings = await api.getSettings();
    set({ settings, loaded: true });
  },

  update: (settings) => set({ settings }),

  patch: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  save: async (settings) => {
    await api.setSettings(settings);
    set({ settings });
  },
}));
