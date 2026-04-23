import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import clsx from "clsx";
import { disable as disableAutostart, enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { useSettingsStore } from "../stores/useSettingsStore";
import type { SettingsChangedPayload } from "../types";

export function SettingsPage() {
  const { settings, loaded, fetch, save, update, patch } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      fetch().catch(console.error);
    }

    isAutostartEnabled()
      .then((enabled) => {
        patch({ autostart_enabled: enabled });
      })
      .catch(console.error);

    const unlisten = listen<SettingsChangedPayload>("settings_changed", (e) => {
      update(e.payload.settings);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetch, loaded, patch, update]);

  async function handleBrowse() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setSavedOk(false);
      setErrorMessage(null);
      patch({ install_dir: selected });
    }
  }

  async function handleSave() {
    setSaving(true);
    setSavedOk(false);
    setErrorMessage(null);
    try {
      const currentAutostart = await isAutostartEnabled();
      if (settings.autostart_enabled !== currentAutostart) {
        if (settings.autostart_enabled) {
          await enableAutostart();
        } else {
          await disableAutostart();
        }
      }

      await save(settings);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleClearDir() {
    setSavedOk(false);
    setErrorMessage(null);
    patch({ install_dir: null });
  }

  return (
    <div className="page-shell max-w-4xl">
      <header className="page-header">
        <div>
          <h2 className="page-title">设置</h2>
          <p className="page-subtitle">
            管理 Olympus Hub 的全局安装目录和系统启动行为。
          </p>
        </div>
      </header>

      <section className="page-card flex flex-col gap-5">
        <div className="panel-subtle max-w-sm self-end">
          <p className="text-sm text-slate-300">修改后记得保存设置。</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            保存结果会直接显示在当前页面，方便你确认配置是否已经生效。
          </p>
        </div>

        {(savedOk || errorMessage) && (
          <div
            className={clsx(
              "inline-state",
              savedOk ? "inline-state-success" : "inline-state-error"
            )}
          >
            <p className="text-sm font-medium text-white">
              {savedOk ? "设置已保存" : "设置保存失败"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-200">
              {savedOk
                ? "新的配置已经写入应用设置。"
                : errorMessage}
            </p>
          </div>
        )}

        <div className="panel-subtle flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1" htmlFor="install-dir">
              统一安装目录
            </label>
            <p className="text-sm leading-6 text-slate-400 mb-3">
              所有工具默认安装到此目录。留空则由各工具回退到系统默认路径。
            </p>

            <div className="flex flex-col gap-2 md:flex-row">
              <input
                id="install-dir"
                type="text"
                value={settings.install_dir ?? ""}
                onChange={(e) => patch({ install_dir: e.target.value || null })}
                placeholder="未设置（使用系统默认）"
                className="field-input flex-1"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleBrowse}
                  className="btn-base btn-secondary"
                >
                  浏览…
                </button>
                {settings.install_dir && (
                  <button
                    onClick={handleClearDir}
                    className="btn-base btn-ghost px-3"
                    aria-label="清空安装目录"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <label className="flex items-start justify-between gap-4 cursor-pointer" htmlFor="autostart-switch">
              <div>
                <p className="text-sm font-medium text-white">开机自启</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  登录系统后自动启动 Olympus Hub，适合需要频繁安装、启动或排查工具状态的场景。
                </p>
              </div>
              <button
                id="autostart-switch"
                type="button"
                role="switch"
                aria-checked={settings.autostart_enabled}
                aria-label="开机自启"
                onClick={() => {
                  setSavedOk(false);
                  setErrorMessage(null);
                  patch({ autostart_enabled: !settings.autostart_enabled });
                }}
                className={clsx(
                  "switch-track",
                  settings.autostart_enabled ? "bg-accent" : "bg-white/15"
                )}
              >
                <span
                  className={clsx(
                    "switch-thumb",
                    settings.autostart_enabled ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <p className="text-xs leading-5 text-slate-500">
            安装目录与开机自启会一起保存到应用配置中。
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-base btn-primary"
          >
            {saving ? "保存中…" : "保存设置"}
          </button>
        </div>
      </section>
    </div>
  );
}
