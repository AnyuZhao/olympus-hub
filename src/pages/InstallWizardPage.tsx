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
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-gray-500 hover:text-white transition-colors text-sm"
        >
          ← 返回
        </button>
        <h2 className="text-xl font-semibold text-white">
          安装 {tool?.name ?? toolId}
        </h2>
      </div>

      {/* Step: Checking */}
      {step === "checking" && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">⟳</div>
          <p>正在检测环境和依赖…</p>
        </div>
      )}

      {/* Step: Pre-check */}
      {step === "precheck" && envCheck && (
        <div className="flex flex-col gap-4">
          <PreCheckPanel result={envCheck} />
          <div className="flex gap-3 justify-end mt-2">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleInstall}
              disabled={!canProceed}
              className="px-5 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {canProceed ? "继续安装" : "环境未满足，无法安装"}
            </button>
          </div>
        </div>
      )}

      {missingPrecheckData && (
        <div className="bg-surface-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-white text-base font-medium">未能加载安装详情</p>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              当前没有拿到环境检测结果，安装向导无法继续展示详情。你可以返回工具库后重试，或再次发起环境检测。
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors"
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
              className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              重新加载详情
            </button>
          </div>
        </div>
      )}

      {/* Step: Installing */}
      {step === "installing" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <span className="animate-spin">⟳</span>
            安装中，请勿关闭窗口…
          </div>
          <LogViewer entries={logs} />
          <div className="flex justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-400 hover:text-red-400 border border-white/10 rounded-lg transition-colors"
            >
              取消安装
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="flex flex-col gap-4">
          <div
            className={`rounded-xl p-5 border ${
              success
                ? "border-green-600 bg-green-900/20"
                : "border-red-600 bg-red-900/20"
            }`}
          >
            <p className="text-lg font-semibold text-white mb-1">
              {success ? "✓ 安装成功" : "✗ 安装失败"}
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {!success && failureSuggestions.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-white text-sm font-medium mb-2">建议下一步</p>
                <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                  {failureSuggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <LogViewer entries={logs} />

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors"
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
                className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
              >
                重试
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
