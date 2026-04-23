import clsx from "clsx";
import type { ToolStatus } from "../types";

const STATUS_LABEL: Record<ToolStatus["type"], string> = {
  NotInstalled: "未安装",
  Installing: "安装中",
  Installed: "已安装",
  Launching: "启动中",
  Running: "运行中",
  Error: "异常",
};

const STATUS_COLOR: Record<ToolStatus["type"], string> = {
  NotInstalled: "border border-white/10 bg-white/[0.05] text-slate-300",
  Installing: "border border-yellow-500/30 bg-yellow-500/12 text-yellow-100 animate-pulse",
  Installed: "border border-emerald-500/30 bg-emerald-500/15 text-emerald-100",
  Launching: "border border-blue-500/30 bg-blue-500/15 text-blue-100 animate-pulse",
  Running: "border border-emerald-500/35 bg-emerald-500/18 text-emerald-50",
  Error: "border border-red-500/30 bg-red-500/15 text-red-100",
};

interface Props {
  status: ToolStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_COLOR[status.type]
      )}
    >
      {STATUS_LABEL[status.type]}
    </span>
  );
}
