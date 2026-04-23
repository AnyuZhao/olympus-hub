import { create } from "zustand";
import type { EnvCheckResult, LogEntry } from "../types";

type WizardStep = "checking" | "precheck" | "installing" | "done";

interface InstallState {
  step: WizardStep;
  envCheck: EnvCheckResult | null;
  logs: LogEntry[];
  success: boolean;
  error: string | null;

  setStep: (step: WizardStep) => void;
  setEnvCheck: (result: EnvCheckResult) => void;
  setLogs: (entries: LogEntry[]) => void;
  appendLog: (entry: LogEntry) => void;
  setDone: (success: boolean, error?: string | null) => void;
  reset: () => void;
}

const initial = {
  step: "checking" as WizardStep,
  envCheck: null,
  logs: [],
  success: false,
  error: null,
};

export const useInstallStore = create<InstallState>((set) => ({
  ...initial,

  setStep: (step) => set({ step }),
  setEnvCheck: (envCheck) => set({ envCheck }),
  setLogs: (logs) => set({ logs }),
  appendLog: (entry) =>
    set((s) => ({ logs: [...s.logs, entry] })),
  setDone: (success, error = null) =>
    set({ step: "done", success, error }),
  reset: () => set(initial),
}));
