"use client";

import { useMemo, useState } from "react";
import { MockAgentAdapter } from "@/lib/agent/mockAdapter";
import { runAgent } from "@/lib/agent/runner";
import type { AgentRunState } from "@/lib/agent/types";

type AgentScenario = "success" | "timeout" | "retry_exhausted";

type ScenarioConfig = {
  label: string;
  description: string;
  run: () => Promise<AgentRunState>;
};

/**
 * 将状态值映射为统一徽标样式，避免页面里散落大量条件类名判断。
 */
const getStatusBadgeClass = (status: string) => {
  if (status === "succeeded") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300";
  }
  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300";
  }
  if (status === "running") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/60 dark:bg-blue-900/20 dark:text-blue-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

/**
 * Agent MVP 演示面板：展示本地状态机、mock adapter 和三条核心测试路径。
 */
export default function AgentMvpPanel() {
  const [activeScenario, setActiveScenario] = useState<AgentScenario>("success");
  const [isRunning, setIsRunning] = useState(false);
  const [runState, setRunState] = useState<AgentRunState | null>(null);
  const [actionError, setActionError] = useState("");

  const scenarioConfig = useMemo<Record<AgentScenario, ScenarioConfig>>(
    () => ({
      success: {
        label: "成功路径",
        description: "工具调用一次成功，run 最终为 succeeded。",
        run: () =>
          runAgent({
            runId: `run_success_${Date.now()}`,
            sessionId: "ui_demo",
            input: "演示成功路径",
            adapter: new MockAgentAdapter({ mode: "success", delayMs: 0 }),
            maxRetries: 2,
            timeoutMs: 120,
            retryDelayMs: 0,
          }),
      },
      timeout: {
        label: "工具超时",
        description: "工具调用超过超时阈值，run 直接失败并返回 TOOL_TIMEOUT。",
        run: () =>
          runAgent({
            runId: `run_timeout_${Date.now()}`,
            sessionId: "ui_demo",
            input: "演示超时路径",
            adapter: new MockAgentAdapter({ mode: "timeout" }),
            maxRetries: 0,
            timeoutMs: 20,
            retryDelayMs: 0,
          }),
      },
      retry_exhausted: {
        label: "重试失败",
        description: "连续上游失败直至重试耗尽，run 返回 TOOL_RETRY_EXHAUSTED。",
        run: () =>
          runAgent({
            runId: `run_retry_${Date.now()}`,
            sessionId: "ui_demo",
            input: "演示重试耗尽路径",
            adapter: new MockAgentAdapter({ mode: "fail", failMessage: "mock upstream error" }),
            maxRetries: 2,
            timeoutMs: 120,
            retryDelayMs: 0,
          }),
      },
    }),
    []
  );

  const runScenario = async (scenario: AgentScenario) => {
    setActionError("");
    setActiveScenario(scenario);
    setIsRunning(true);
    try {
      const result = await scenarioConfig[scenario].run();
      setRunState(result);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Agent 演示运行失败");
      setRunState(null);
    } finally {
      setIsRunning(false);
    }
  };

  const stepState = runState?.steps[0] ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Agent MVP 演示面板</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            本地状态机 + Mock Adapter，验证成功/超时/重试失败三条核心路径。
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300">
          MVP：单 run / 单 step / 单工具调用
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {(Object.keys(scenarioConfig) as AgentScenario[]).map((scenario) => {
          const config = scenarioConfig[scenario];
          const isActive = activeScenario === scenario;

          return (
            <button
              key={scenario}
              type="button"
              onClick={() => {
                void runScenario(scenario);
              }}
              disabled={isRunning}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <p className="text-sm font-medium">{config.label}</p>
              <p
                className={`mt-1 text-xs ${
                  isActive ? "text-slate-200 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {config.description}
              </p>
            </button>
          );
        })}
      </div>

      {actionError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300">
          {actionError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Run 状态</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                runState?.status ?? "idle"
              )}`}
            >
              {isRunning ? "running" : runState?.status ?? "idle"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              events：{runState?.events.length ?? 0}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            错误码：{runState?.lastError?.code ?? "无"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Step 状态
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                stepState?.status ?? "pending"
              )}`}
            >
              {isRunning ? "running" : stepState?.status ?? "pending"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              attempts：{stepState?.attempt ?? 0}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            summary：{stepState?.summary ?? "暂无"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          事件轨迹（最近一次执行）
        </p>
        {runState?.events.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {runState.events.map((event, index) => (
              <span
                key={`${event.type}-${index}`}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {event.type}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            点击上方任一场景开始运行演示。
          </p>
        )}
      </div>
    </section>
  );
}
