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
  NotInstalled: "bg-gray-600 text-gray-200",
  Installing: "bg-yellow-600 text-yellow-100 animate-pulse",
  Installed: "bg-green-700 text-green-100",
  Launching: "bg-blue-600 text-blue-100 animate-pulse",
  Running: "bg-emerald-600 text-emerald-100",
  Error: "bg-red-700 text-red-100",
};

interface Props {
  status: ToolStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded text-xs font-medium",
        STATUS_COLOR[status.type]
      )}
    >
      {STATUS_LABEL[status.type]}
    </span>
  );
}
