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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">工具库</h2>
          <p className="text-gray-500 text-sm mt-0.5">管理你的 AI 工具</p>
        </div>
        <button
          onClick={fetchTools}
          disabled={loading}
          className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>

      {loading && tools.length === 0 ? (
        <div className="text-gray-500 text-center py-16">加载中…</div>
      ) : tools.length === 0 ? (
        <div className="text-gray-500 text-center py-16">暂无工具配置</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
