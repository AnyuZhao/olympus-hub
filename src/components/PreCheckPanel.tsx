import type { DependencyCheckResult, EnvCheckResult } from "../types";

interface Props {
  result: EnvCheckResult;
}

function DepRow({ dep }: { dep: DependencyCheckResult }) {
  const color =
    dep.status === "Satisfied"
      ? "text-green-400"
      : dep.status === "Missing" || dep.status === "VersionInsufficient"
      ? "text-red-400"
      : "text-yellow-400";

  const icon =
    dep.status === "Satisfied"
      ? "✓"
      : dep.status === "Missing"
      ? "✗"
      : dep.status === "VersionInsufficient"
      ? "↑"
      : "?";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <span className={`font-bold text-sm mt-0.5 w-4 shrink-0 ${color}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{dep.display_name}</span>
          {dep.current_version && (
            <span className="text-slate-400 text-xs">({dep.current_version})</span>
          )}
          {dep.required_version && (
            <span className="text-slate-500 text-xs">需要 ≥ {dep.required_version}</span>
          )}
        </div>
        <p className={`text-xs mt-0.5 ${color}`}>{dep.message}</p>
        {dep.status !== "Satisfied" && dep.install_guide && (
          <p className="text-slate-500 text-xs mt-1 leading-5">
            安装引导：{dep.install_guide}
          </p>
        )}
        {dep.install_methods.length > 0 && (
          <p className="text-slate-500 text-xs mt-1 leading-5">
            可用安装方式：{dep.install_methods.map((method) => method.label).join("、")}
          </p>
        )}
      </div>
    </div>
  );
}

function EnvRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-3">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`text-sm ${ok ? "text-gray-200" : "text-red-400"}`}>
        {value}
      </span>
    </div>
  );
}

export function PreCheckPanel({ result }: Props) {
  const overallColor =
    result.overall === "AllSatisfied"
      ? "border-green-600 bg-green-900/20"
      : result.overall === "HasWarnings"
      ? "border-yellow-600 bg-yellow-900/20"
      : "border-red-600 bg-red-900/20";

  const overallText =
    result.overall === "AllSatisfied"
      ? "环境就绪，可以安装"
      : result.overall === "HasWarnings"
      ? "存在风险项，建议处理后安装"
      : "存在阻塞项，请先解决后再安装";

  return (
    <div className="flex flex-col gap-4">
      <div className={`inline-state ${overallColor}`}>
        <p className="text-sm font-medium text-white">{overallText}</p>
      </div>

      <div className="panel-subtle">
        <h4 className="mb-3 text-sm font-medium text-white">
          系统环境
        </h4>
        <EnvRow label="操作系统" value={result.os_version || result.os} ok={true} />
        <EnvRow label="CPU 架构" value={result.arch} ok={true} />
        <EnvRow
          label="可用磁盘"
          value={`${result.disk_available_gb.toFixed(1)} GB`}
          ok={result.disk_available_gb >= 1.0}
        />
        <EnvRow
          label="网络连通性"
          value={result.network_accessible ? "可访问" : "无法连接"}
          ok={result.network_accessible}
        />
      </div>

      <div className="panel-subtle">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium text-white">依赖检测</h4>
            <p className="mt-2 text-sm text-slate-400">这里会显示安装所需依赖的当前状态。</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
            共 {result.dependencies.length} 项
          </span>
        </div>
        <h4 className="sr-only">
          依赖检测
        </h4>
        {result.dependencies.map((dep) => (
          <DepRow key={dep.id} dep={dep} />
        ))}
      </div>
    </div>
  );
}
