import { useNavigate } from "react-router-dom";
import { api } from "../api/tauri";
import type { ToolWithStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  tool: ToolWithStatus;
}

export function ToolCard({ tool }: Props) {
  const navigate = useNavigate();

  const canInstall = tool.status.type === "NotInstalled" || tool.status.type === "Error";
  const canLaunch = tool.status.type === "Installed";
  const canUninstall = tool.status.type === "Installed" || tool.status.type === "Error";
  const isRunning = tool.status.type === "Running";
  const isBusy = tool.status.type === "Installing" || tool.status.type === "Launching";

  async function handleInstall() {
    navigate(`/install/${tool.id}`);
  }

  async function handleLaunch() {
    try {
      await api.launchTool(tool.id);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUninstall() {
    if (!confirm(`确认卸载 ${tool.name}？`)) return;
    try {
      await api.uninstallTool(tool.id);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="bg-surface-card border border-white/10 rounded-xl p-5 flex flex-col gap-3 hover:border-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-white font-semibold text-base">{tool.name}</h3>
          <p className="text-gray-400 text-xs mt-0.5">{tool.category}</p>
        </div>
        <StatusBadge status={tool.status} />
      </div>

      <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">
        {tool.description}
      </p>

      {tool.status.type === "Error" && (
        <p className="text-red-400 text-xs bg-red-900/30 px-2 py-1 rounded">
          {(tool.status as { type: "Error"; data: { message: string } }).data.message}
        </p>
      )}

      {isRunning && (
        <p className="text-emerald-400 text-xs">
          PID: {(tool.status as { type: "Running"; data: { pid: number } }).data.pid}
        </p>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        {canInstall && (
          <button
            onClick={handleInstall}
            className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm py-1.5 px-3 rounded-lg transition-colors"
          >
            安装
          </button>
        )}
        {canLaunch && (
          <button
            onClick={handleLaunch}
            disabled={isBusy}
            className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
          >
            启动
          </button>
        )}
        {canUninstall && (
          <button
            onClick={handleUninstall}
            disabled={isBusy}
            className="bg-red-900/50 hover:bg-red-800 text-red-300 text-sm py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
          >
            卸载
          </button>
        )}
        {isBusy && (
          <button
            disabled
            className="flex-1 bg-gray-700 text-gray-400 text-sm py-1.5 px-3 rounded-lg"
          >
            处理中…
          </button>
        )}
        {isRunning && (
          <span className="flex-1 text-center text-emerald-400 text-sm py-1.5">
            运行中
          </span>
        )}
      </div>
    </div>
  );
}
