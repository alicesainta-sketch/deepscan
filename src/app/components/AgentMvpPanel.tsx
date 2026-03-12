"use client";

import { useMemo, useRef, useState } from "react";
import { createAgentAdapter } from "@/lib/agent/createAdapter";
import { getAgentAdapterMode, getAgentApiBaseUrl, getAgentToolName } from "@/lib/agent/config";
import { runAgent } from "@/lib/agent/runner";
import type { AgentErrorCode, AgentRunState, AgentRunStatus } from "@/lib/agent/types";

type AgentScenario = "success" | "timeout" | "retry_exhausted" | "remote_call";

type ScenarioConfig = {
  label: string;
  description: string;
  maxRetries: number;
  timeoutMs: number;
  retryDelayMs: number;
  mockMode?: "success" | "timeout" | "fail";
};

type ScenarioMap = Partial<Record<AgentScenario, ScenarioConfig>>;

type LinkedRunSummary = {
  status: AgentRunStatus;
  attempts: number;
  durationMs: number;
  degraded: boolean;
  summary?: string;
  adapterMode?: "mock" | "http";
  errorCode?: AgentErrorCode;
};

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

export default function AgentMvpPanel({
  linkedRunSummary,
}: {
  linkedRunSummary?: LinkedRunSummary | null;
}) {
  const adapterMode = useMemo(() => getAgentAdapterMode(), []);
  const configuredApiBaseUrl = useMemo(() => getAgentApiBaseUrl(), []);
  const configuredToolName = useMemo(() => getAgentToolName(), []);
  const [activeScenario, setActiveScenario] = useState<AgentScenario>(
    adapterMode === "http" ? "remote_call" : "success"
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runState, setRunState] = useState<AgentRunState | null>(null);
  const [runDurationMs, setRunDurationMs] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [runtimeMetadata, setRuntimeMetadata] = useState<{
    mode: "mock" | "http";
    baseUrl?: string;
    toolName?: string;
  } | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  const scenarioConfig = useMemo<ScenarioMap>(
    () =>
      adapterMode === "http"
        ? {
            remote_call: {
              label: "远端联调",
              description: "调用后端 MCP 工具接口，验证真实链路可用性。",
              maxRetries: 1,
              timeoutMs: 10_000,
              retryDelayMs: 0,
            },
          }
        : {
            success: {
              label: "成功路径",
              description: "工具调用一次成功，run 最终为 succeeded。",
              maxRetries: 2,
              timeoutMs: 120,
              retryDelayMs: 0,
              mockMode: "success",
            },
            timeout: {
              label: "工具超时",
              description: "工具调用超过超时阈值，run 直接失败并返回 TOOL_TIMEOUT。",
              maxRetries: 0,
              timeoutMs: 20,
              retryDelayMs: 0,
              mockMode: "timeout",
            },
            retry_exhausted: {
              label: "重试失败",
              description: "连续上游失败直至重试耗尽，run 返回 TOOL_RETRY_EXHAUSTED。",
              maxRetries: 2,
              timeoutMs: 120,
              retryDelayMs: 0,
              mockMode: "fail",
            },
          },
    [adapterMode]
  );

  const runScenario = async (scenario: AgentScenario) => {
    const selectedScenario = scenarioConfig[scenario];
    if (!selectedScenario) return;

    setActionError("");
    setActiveScenario(scenario);
    setRunDurationMs(null);
    setIsRunning(true);
    const startedAt = performance.now();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    try {
      const resolvedAdapter =
        adapterMode === "http"
          ? createAgentAdapter({
              httpBaseUrl: configuredApiBaseUrl,
              toolName: configuredToolName,
            })
          : createAgentAdapter({
              mockMode: selectedScenario.mockMode,
              mockDelayMs: 0,
            });

      setRuntimeMetadata({
        mode: resolvedAdapter.mode,
        baseUrl: resolvedAdapter.metadata.baseUrl,
        toolName: resolvedAdapter.metadata.toolName,
      });

      const result = await runAgent({
        runId: `run_${scenario}_${Date.now()}`,
        sessionId: "ui_demo",
        input: `演示场景:${scenario}`,
        adapter: resolvedAdapter.adapter,
        maxRetries: selectedScenario.maxRetries,
        timeoutMs: selectedScenario.timeoutMs,
        retryDelayMs: selectedScenario.retryDelayMs,
        signal: controller.signal,
      });
      setRunState(result);
      setRunDurationMs(Math.round(performance.now() - startedAt));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Agent 演示运行失败");
      setRunState(null);
      setRunDurationMs(Math.round(performance.now() - startedAt));
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
      setIsRunning(false);
    }
  };

  const stepState = runState?.steps[0] ?? null;
  const scenarioList = useMemo(
    () => Object.entries(scenarioConfig) as Array<[AgentScenario, ScenarioConfig]>,
    [scenarioConfig]
  );
  const isHttpMode = adapterMode === "http";
  const isHttpConfigured = !isHttpMode || Boolean(configuredApiBaseUrl);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Agent MVP 演示面板</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isHttpMode
              ? "当前为 HTTP 联调模式：将调用后端 MCP 工具接口。"
              : "当前为 Mock 模式：验证成功/超时/重试失败三条核心路径。"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            模式：{isHttpMode ? "HTTP" : "Mock"}
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300">
            MVP：单 run / 单 step / 单工具调用
          </div>
          {isRunning ? (
            <button
              type="button"
              onClick={() => activeControllerRef.current?.abort()}
              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] text-red-700 transition hover:bg-red-100 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              取消运行
            </button>
          ) : null}
        </div>
      </div>

      {linkedRunSummary ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
          <p>主聊天最近一次 Agent：{linkedRunSummary.status}</p>
          <p className="mt-1">
            attempts：{linkedRunSummary.attempts} / duration：{linkedRunSummary.durationMs}ms
            {linkedRunSummary.errorCode ? ` / ${linkedRunSummary.errorCode}` : ""}
          </p>
          <p className="mt-1">
            {linkedRunSummary.adapterMode ? `${linkedRunSummary.adapterMode} / ` : ""}
            {linkedRunSummary.summary ?? (linkedRunSummary.degraded ? "已降级" : "暂无摘要")}
          </p>
        </div>
      ) : null}

      {isHttpMode ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
          <p>
            baseUrl：{configuredApiBaseUrl || "未配置（请设置 NEXT_PUBLIC_AGENT_API_BASE_URL）"}
          </p>
          <p className="mt-1">toolName：{configuredToolName}</p>
        </div>
      ) : null}

      {isHttpMode && !isHttpConfigured ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300">
          缺少 HTTP 联调配置：请设置 NEXT_PUBLIC_AGENT_API_BASE_URL。
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {scenarioList.map(([scenario, config]) => {
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
            耗时：{runDurationMs === null ? "暂无" : `${runDurationMs}ms`}
          </p>
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
          {runtimeMetadata ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              adapter：{runtimeMetadata.mode}
              {runtimeMetadata.toolName ? ` / ${runtimeMetadata.toolName}` : ""}
            </p>
          ) : null}
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
