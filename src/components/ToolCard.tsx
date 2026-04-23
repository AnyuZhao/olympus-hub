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
  const errorMessage = tool.status.type === "Error" ? tool.status.data.message : null;
  const runningPid = tool.status.type === "Running" ? tool.status.data.pid : null;
  const primaryLabel = canInstall ? "安装工具" : canLaunch ? "启动工具" : null;

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
    <article className="page-card flex h-full flex-col gap-4 transition-colors duration-150 hover:border-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-white">{tool.name}</h3>
        </div>
        <StatusBadge status={tool.status} />
      </div>

      <p className="text-sm leading-6 text-slate-300 line-clamp-2">
        {tool.description}
      </p>

      {errorMessage && (
        <div className="inline-state inline-state-error">
          <p className="text-sm leading-6 text-red-100">{errorMessage}</p>
        </div>
      )}

      {runningPid !== null && (
        <div className="panel-subtle py-3">
          <p className="text-sm text-emerald-100">当前进程 PID：{runningPid}</p>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {primaryLabel && (
          <button
            onClick={canInstall ? handleInstall : handleLaunch}
            disabled={isBusy}
            className="btn-base btn-primary w-full"
          >
            {isBusy ? "处理中…" : primaryLabel}
          </button>
        )}

        {isBusy && (
          <p className="text-sm text-slate-400">当前任务执行中，请稍候。</p>
        )}

        {isRunning && (
          <p className="text-sm text-emerald-200">工具正在运行，若需重装请先结束当前进程。</p>
        )}

        {canUninstall && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <p className="text-xs leading-5 text-slate-500">
              卸载会移除当前工具及其状态记录。
            </p>
            <button
              onClick={handleUninstall}
              disabled={isBusy}
              className="btn-base btn-danger px-3 py-2 text-xs"
            >
              卸载
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
