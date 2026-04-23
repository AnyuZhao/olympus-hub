import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { disable as disableAutostart, enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { useSettingsStore } from "../stores/useSettingsStore";
import type { SettingsChangedPayload } from "../types";

export function SettingsPage() {
  const { settings, loaded, fetch, save, update, patch } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

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
      patch({ install_dir: selected });
    }
  }

  async function handleSave() {
    setSaving(true);
    setSavedOk(false);
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
    } finally {
      setSaving(false);
    }
  }

  function handleClearDir() {
    patch({ install_dir: null });
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">设置</h2>
        <p className="text-gray-500 text-sm mt-0.5">管理 Olympus Hub 的全局配置</p>
      </div>

      <div className="bg-surface-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">

        <div>
          <label className="text-white text-sm font-medium block mb-1">
            统一安装目录
          </label>
          <p className="text-gray-500 text-xs mb-3">
            所有工具默认安装到此目录。留空则由各工具使用系统默认路径（如 npm global prefix）。
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={settings.install_dir ?? ""}
              onChange={(e) => patch({ install_dir: e.target.value || null })}
              placeholder="未设置（使用系统默认）"
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/60"
            />
            <button
              onClick={handleBrowse}
              className="px-3 py-2 text-sm text-gray-300 border border-white/10 rounded-lg hover:border-accent/40 hover:text-white transition-colors"
            >
              浏览…
            </button>
            {settings.install_dir && (
              <button
                onClick={handleClearDir}
                className="px-3 py-2 text-sm text-gray-500 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-white text-sm font-medium">开机自启</p>
              <p className="text-gray-500 text-xs mt-1">
                登录系统后自动启动 Olympus Hub，便于快速进入工具管理界面。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autostart_enabled}
              onClick={() => patch({ autostart_enabled: !settings.autostart_enabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                settings.autostart_enabled ? "bg-accent" : "bg-white/15"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.autostart_enabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          {savedOk && <span className="text-green-400 text-sm">已保存</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存设置"}
          </button>
        </div>
      </div>
    </div>
  );
}
