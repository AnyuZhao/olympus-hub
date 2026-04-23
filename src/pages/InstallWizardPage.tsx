import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { api } from "../api/tauri";
import { useInstallStore } from "../stores/useInstallStore";
import { useToolStore } from "../stores/useToolStore";
import { PreCheckPanel } from "../components/PreCheckPanel";
import { LogViewer } from "../components/LogViewer";
import type {
  InstallCompletePayload,
  LogAppendedPayload,
  ToolStatusChangedPayload,
} from "../types";

export function InstallWizardPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const { step, envCheck, logs, success, error, setStep, setEnvCheck, setLogs, appendLog, setDone, reset } =
    useInstallStore();
  const updateStatus = useToolStore((s) => s.updateStatus);
  const tools = useToolStore((s) => s.tools);
  const tool = tools.find((t) => t.id === toolId);

  function buildFailureSuggestions() {
    const suggestions = new Set<string>(envCheck?.suggestions ?? []);
    const normalizedError = error?.toLowerCase() ?? "";

    if (normalizedError.includes("already_installing")) {
      suggestions.add("该工具已经在安装中，请等待当前安装完成后再试。 ");
    }

    if (normalizedError.includes("not installed")) {
      suggestions.add("工具尚未安装完成，请先完成安装再尝试启动。 ");
    }

    if (normalizedError.includes("启动失败") || normalizedError.includes("spawn") || normalizedError.includes("enoent")) {
      suggestions.add("启动命令执行失败，通常表示可执行文件未正确安装，建议先查看日志并重新安装。 ");
    }

    if (normalizedError.includes("权限") || normalizedError.includes("access is denied")) {
      suggestions.add("当前用户权限不足，建议以有权限的账户重新安装，或改用可写安装目录。 ");
    }

    if (normalizedError.includes("network") || normalizedError.includes("timed out") || normalizedError.includes("eai_again")) {
      suggestions.add("安装源访问异常，请检查网络、代理和防火墙设置后重试。 ");
    }

    return Array.from(suggestions).map((item) => item.trim()).filter(Boolean);
  }

  const failureSuggestions = buildFailureSuggestions();

  // Run env check on mount
  useEffect(() => {
    if (!toolId) return;
    reset();

    let cancelled = false;

    async function runCheck() {
      try {
        const result = await api.checkEnvironment(toolId!);
        const historyLogs = await api.getInstallLogs(toolId!, 500);
        if (!cancelled) {
          setEnvCheck(result);
          setLogs(historyLogs);
          setStep("precheck");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setStep("precheck");
      }
    }

    runCheck();
    return () => {
      cancelled = true;
    };
  }, [toolId]);

  // Listen to backend events
  useEffect(() => {
    const unlisteners = [
      listen<LogAppendedPayload>("log_appended", (e) => {
        if (e.payload.tool_id === toolId) appendLog(e.payload.entry);
      }),
      listen<InstallCompletePayload>("install_complete", (e) => {
        if (e.payload.tool_id === toolId) {
          setDone(e.payload.success, e.payload.error);
        }
      }),
      listen<ToolStatusChangedPayload>("tool_status_changed", (e) => {
        if (e.payload.tool_id === toolId) updateStatus(e.payload.tool_id, e.payload.status);
      }),
    ];

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [toolId]);

  async function handleInstall() {
    if (!toolId) return;
    setStep("installing");
    try {
      await api.installTool(toolId);
    } catch (e: unknown) {
      setDone(false, String(e));
    }
  }

  async function handleCancel() {
    if (toolId && step === "installing") {
      await api.cancelInstall(toolId).catch(console.error);
    }
    navigate("/");
  }

  const canProceed = envCheck?.overall !== "HasBlockers";
  const missingPrecheckData = step === "precheck" && !envCheck;

  return (
    <div className="page-shell max-w-4xl">
      <header className="page-header">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate("/")}
            className="btn-base btn-ghost self-start px-0"
          >
            ← 返回工具库
          </button>
          <div>
            <h2 className="page-title">安装 {tool?.name ?? toolId}</h2>
            <p className="page-subtitle">
              先检查环境与依赖，再开始安装。
            </p>
          </div>
        </div>
        <div className="panel-subtle max-w-sm">
          <p className="mt-2 text-sm font-medium text-white">
            {step === "checking"
              ? "环境检测中"
              : step === "precheck"
              ? "等待安装"
              : step === "installing"
              ? "正在安装"
              : success
              ? "安装完成"
              : "需要处理失败原因"}
          </p>
        </div>
      </header>

      {step === "checking" && (
        <section className="page-card py-16 text-center text-slate-300">
          <div className="mb-3 text-4xl animate-pulse">⟳</div>
          <p className="text-lg font-medium text-white">正在检测环境和依赖…</p>
          <p className="mt-2 text-sm text-slate-400">
            检测完成后会显示当前环境结论与依赖状态。
          </p>
        </section>
      )}

      {step === "precheck" && envCheck && (
        <section className="page-card flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="section-title mt-2">确认环境是否满足安装条件</h3>
            </div>
            {!canProceed && (
              <div className="inline-state inline-state-warning max-w-sm">
                <p className="text-sm font-medium text-white">当前存在阻塞项</p>
                <p className="mt-1 text-sm leading-6 text-slate-200">
                  请先修复红色错误项，再回到本页继续安装。
                </p>
              </div>
            )}
          </div>

          <PreCheckPanel result={envCheck} />
          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={() => navigate("/")}
              className="btn-base btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleInstall}
              disabled={!canProceed}
              className="btn-base btn-primary"
            >
              {canProceed ? "继续安装" : "环境未满足，无法安装"}
            </button>
          </div>
        </section>
      )}

      {missingPrecheckData && (
        <section className="page-card flex flex-col gap-5">
          <div className="inline-state inline-state-error">
            <p className="text-sm font-medium text-white">未能加载安装详情</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              当前没有拿到环境检测结果，安装向导无法继续展示详情。你可以返回工具库后重试，或再次发起环境检测。
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={() => navigate("/")}
              className="btn-base btn-secondary"
            >
              返回工具库
            </button>
            <button
              onClick={() => {
                if (!toolId) return;
                reset();
                setStep("checking");
                api.checkEnvironment(toolId)
                  .then((result) => {
                    api.getInstallLogs(toolId, 500).then((entries) => setLogs(entries));
                    setEnvCheck(result);
                    setStep("precheck");
                  })
                  .catch((reason) => {
                    console.error(reason);
                    setDone(false, String(reason));
                  });
              }}
              className="btn-base btn-primary"
            >
              重新加载详情
            </button>
          </div>
        </section>
      )}

      {step === "installing" && (
        <section className="page-card flex flex-col gap-5">
          <div className="inline-state inline-state-warning">
            <p className="text-sm font-medium text-white">安装中，请勿关闭窗口</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              你可以在下方查看安装详情，等待安装完成。
            </p>
          </div>

          <LogViewer entries={logs} />
          <div className="flex justify-end border-t border-white/10 pt-4">
            <button
              onClick={handleCancel}
              className="btn-base btn-danger"
            >
              取消安装
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="page-card flex flex-col gap-5">
          <div
            className={`inline-state ${
              success ? "inline-state-success" : "inline-state-error"
            }`}
          >
            <p className="text-sm font-medium text-white">
              {success ? "安装成功" : "安装失败"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {success
                ? "工具已经完成安装，你现在可以返回工具库并继续启动或管理它。"
                : error ?? "安装过程中出现问题，请查看下方内容后重试。"}
            </p>
            {!success && failureSuggestions.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-2 text-sm font-medium text-white">可尝试的处理方式</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
                  {failureSuggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <LogViewer entries={logs} />

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
            <button
              onClick={() => navigate("/")}
              className="btn-base btn-secondary"
            >
              返回工具库
            </button>
            {!success && (
              <button
                onClick={() => {
                  reset();
                  setStep("checking");
                  api.checkEnvironment(toolId!).then((r) => {
                    api.getInstallLogs(toolId!, 500).then((entries) => setLogs(entries));
                    setEnvCheck(r);
                    setStep("precheck");
                  });
                }}
                className="btn-base btn-primary"
              >
                重试
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
