"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentRun } from "@/types/agent";
import type { KnowledgeDocument } from "@/types/knowledge";
import type { AgentSettings } from "@/lib/agentSettings";
import { getAgentRunStatusLabel } from "@/lib/agentSettings";

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const getStepStatusLabel = (status: AgentRun["steps"][number]["status"]) => {
  if (status === "success") return "完成";
  if (status === "failed") return "失败";
  if (status === "running") return "进行中";
  return "等待中";
};

const getStepStatusColor = (status: AgentRun["steps"][number]["status"]) => {
  if (status === "success") return "bg-emerald-500";
  if (status === "failed") return "bg-rose-500";
  if (status === "running") return "bg-blue-500";
  return "bg-slate-400";
};

const getRunStatusBadge = (status: AgentRun["status"]) => {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  if (status === "running") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
};

// Ensure settings stay within safe agent defaults for demo.
const normalizeSettings = (draft: AgentSettings) => {
  const maxSearchResults = Math.min(8, Math.max(1, Math.round(draft.maxSearchResults)));
  return {
    ...draft,
    maxSearchResults,
  };
};

interface AgentPanelProps {
  enabled: boolean;
  onToggleEnabled: () => void;
  settings: AgentSettings;
  onSaveSettings: (settings: AgentSettings) => void;
  runs: AgentRun[];
  activeRunId?: string | null;
  onSelectRun: (runId: string) => void;
  onClearRuns: () => void;
  documents: KnowledgeDocument[];
  onImportFiles: (files: FileList) => void;
  onRemoveDocument: (id: string) => void;
  onClose?: () => void;
  isOverlay?: boolean;
}

export default function AgentPanel({
  enabled,
  onToggleEnabled,
  settings,
  onSaveSettings,
  runs,
  activeRunId,
  onSelectRun,
  onClearRuns,
  documents,
  onImportFiles,
  onRemoveDocument,
  onClose,
  isOverlay = false,
}: AgentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<AgentSettings>(() => settings);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const activeRun = useMemo(
    () => runs.find((run) => run.id === activeRunId) ?? runs[0],
    [runs, activeRunId]
  );

  const handleSave = () => {
    // Basic validation keeps settings within reasonable agent limits.
    const normalized = normalizeSettings(draft);
    if (!Number.isFinite(normalized.maxSearchResults)) {
      setError("检索条数必须是有效数字");
      return;
    }
    setError("");
    onSaveSettings(normalized);
  };

  const panelBody = (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Agent 面板
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            面向代码辅助的可视化任务流。
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            关闭
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Agent 模式
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              开启后会自动调用本地工具并展示执行链路。
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleEnabled}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              enabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {enabled ? "已开启" : "已关闭"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            运行设置
          </p>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1 text-xs text-white transition hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            保存
          </button>
        </div>
        <div className="mt-3 grid gap-3">
          <label className="text-xs text-slate-600 dark:text-slate-300">
            检索命中条数
            <input
              type="number"
              min={1}
              max={8}
              value={draft.maxSearchResults}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  maxSearchResults: Number(event.target.value),
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={draft.includeFileOutline}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  includeFileOutline: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            输出文件概览
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-300">
            回答详细度
            <select
              value={draft.answerStyle}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  answerStyle: event.target.value as AgentSettings["answerStyle"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
            >
              <option value="concise">简洁</option>
              <option value="balanced">平衡</option>
              <option value="detailed">详细</option>
            </select>
          </label>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-600 dark:border-rose-700/60 dark:bg-rose-900/20 dark:text-rose-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              代码资料库
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              支持导入 .ts/.tsx/.md/.txt 等文本文件。
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) {
                onImportFiles(event.target.files);
                event.target.value = "";
              }
            }}
          />
        </div>
        {documents.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            暂无资料，导入后可启用本地检索。
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
              >
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-100">
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {doc.language ?? "text"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveDocument(doc.id)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            运行记录
          </p>
          <button
            type="button"
            onClick={onClearRuns}
            className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            清空
          </button>
        </div>
        {runs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            还没有 Agent 运行记录。
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className={`w-full rounded-lg border px-2 py-2 text-left text-[11px] transition ${
                  run.id === activeRun?.id
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/60 dark:bg-blue-900/20 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{run.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${getRunStatusBadge(
                      run.status
                    )}`}
                  >
                    {getAgentRunStatusLabel(run.status)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {formatTime(run.createdAt)} · {run.prompt.slice(0, 40)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          步骤详情
        </p>
        {!activeRun ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            选择一条运行记录查看细节。
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {activeRun.steps.map((step) => (
              <div
                key={step.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${getStepStatusColor(
                        step.status
                      )}`}
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-100">
                      {step.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {getStepStatusLabel(step.status)}
                  </span>
                </div>
                {step.inputSummary ? (
                  <p className="mt-1 text-[10px] text-slate-400">
                    输入：{step.inputSummary}
                  </p>
                ) : null}
                {step.outputSummary ? (
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    输出：{step.outputSummary}
                  </p>
                ) : null}
                {step.error ? (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">
                    失败原因：{step.error}
                  </p>
                ) : null}
                {step.details?.length ? (
                  <div className="mt-2 space-y-2">
                    {step.details.map((detail) => (
                      <div
                        key={`${step.id}-${detail.title}`}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <p className="font-semibold text-slate-700 dark:text-slate-100">
                          {detail.title}
                        </p>
                        {detail.meta ? (
                          <p className="text-[10px] text-slate-400">
                            {detail.meta}
                          </p>
                        ) : null}
                        <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-500 dark:text-slate-400">
                          {detail.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!isOverlay) {
    return panelBody;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-md overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        {panelBody}
      </div>
    </div>
  );
}
