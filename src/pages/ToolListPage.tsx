import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useToolStore } from "../stores/useToolStore";
import { ToolCard } from "../components/ToolCard";
import type { ToolStatusChangedPayload } from "../types";

export function ToolListPage() {
  const { tools, loading, fetchTools, updateStatus } = useToolStore();

  useEffect(() => {
    fetchTools();

    const unlisten = listen<ToolStatusChangedPayload>(
      "tool_status_changed",
      (event) => {
        updateStatus(event.payload.tool_id, event.payload.status);
      }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h2 className="page-title">工具库</h2>
          <p className="page-subtitle">
            在这里查看每个工具的安装与运行状态，并继续安装、启动或排查异常。
          </p>
        </div>
        <button
          onClick={fetchTools}
          disabled={loading}
          className="btn-base btn-secondary"
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </header>

      <section className="page-card flex flex-col gap-5">
        {tools.length > 0 && (
          <div className="panel-subtle max-w-sm self-end">
            <p className="text-sm text-slate-300">当前共 {tools.length} 个工具。</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              安装中或启动中的工具暂时无法重复触发。
            </p>
          </div>
        )}

        {loading && tools.length === 0 ? (
          <div className="inline-state inline-state-info py-12 text-center">
            <p className="text-base font-medium text-white">正在同步工具状态…</p>
            <p className="mt-2 text-sm text-slate-400">加载完成后，你会在这里看到每个工具的当前状态。</p>
          </div>
        ) : tools.length === 0 ? (
          <div className="inline-state inline-state-info py-12 text-center">
            <p className="text-base font-medium text-white">暂无工具配置</p>
            <p className="mt-2 text-sm text-slate-400">
              当前还没有可管理的工具定义。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
