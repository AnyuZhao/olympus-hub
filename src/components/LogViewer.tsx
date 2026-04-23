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
  EnvCheck: "ENV",
  DepCheck: "DEP",
  Install: "INST",
  PostInstall: "POST",
  Launch: "RUN",
  Uninstall: "UNINST",
};

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
    <div className="bg-black/40 rounded-lg p-3 font-mono text-xs overflow-y-auto max-h-96 border border-white/10">
      {entries.length === 0 && (
        <p className="text-gray-600 text-center py-4">等待日志输出…</p>
      )}
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2 leading-relaxed">
          <span className="text-gray-600 shrink-0">{formatTime(entry.timestamp_ms)}</span>
          <span className="text-blue-500 shrink-0 w-12">
            {STAGE_LABEL[entry.stage] ?? entry.stage}
          </span>
          <span className={`${LEVEL_COLOR[entry.level]} break-all`}>
            {entry.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
