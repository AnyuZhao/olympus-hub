import { create } from "zustand";
import { api } from "../api/tauri";
import type { ToolStatus, ToolWithStatus } from "../types";

interface ToolStore {
  tools: ToolWithStatus[];
  loading: boolean;
  fetchTools: () => Promise<void>;
  updateStatus: (tool_id: string, status: ToolStatus) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  tools: [],
  loading: false,

  fetchTools: async () => {
    set({ loading: true });
    try {
      const tools = await api.getToolList();
      set({ tools, loading: false });
    } catch (e) {
      console.error("fetchTools error:", e);
      set({ loading: false });
    }
  },

  updateStatus: (tool_id, status) =>
    set((state) => ({
      tools: state.tools.map((t) =>
        t.id === tool_id ? { ...t, status } : t
      ),
    })),
}));
