import { useEffect, useRef } from "react";
import type { LogEntry } from "../types";

interface Props {
  entries: LogEntry[];
}

const LEVEL_COLOR: Record<string, string> = {
  Info: "text-gray-300",
  Warn: "text-yellow-400",
  Error: "text-red-400",
  Debug: "text-gray-500",
};

const STAGE_LABEL: Record<string, string> = {
  EnvCheck: "环境检查",
  DepCheck: "依赖检查",
  DepInstall: "依赖安装",
  Install: "安装",
  PostInstall: "安装后检查",
  Launch: "启动",
  Uninstall: "卸载",
};

function getStageLabel(stage: string) {
  return STAGE_LABEL[stage] ?? "状态更新";
}

function formatTime(ms: number) {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export function LogViewer({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <section className="log-shell" aria-label="安装日志">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-300">这里会持续显示安装过程中的详细输出与状态变化。</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-500">
          {entries.length} 条
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs">
      {entries.length === 0 && (
        <p className="text-slate-500 text-center py-6">等待日志输出…</p>
      )}
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2 leading-relaxed">
          <span className="text-slate-500 shrink-0">{formatTime(entry.timestamp_ms)}</span>
          <span className="text-blue-300 shrink-0 w-20">
            {getStageLabel(entry.stage)}
          </span>
          <span className={`${LEVEL_COLOR[entry.level]} break-all`}>
            {entry.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
      </div>
    </section>
  );
}
