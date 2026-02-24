"use client";

import { useState } from "react";
import type { ChatProviderConfig } from "@/lib/chatProviderAdapter";
import { DEFAULT_CHAT_PROVIDER_CONFIG } from "@/lib/chatProviderAdapter";

type ChatProviderSettingsModalProps = {
  config: ChatProviderConfig;
  onClose: () => void;
  onSave: (config: ChatProviderConfig) => void;
};

export default function ChatProviderSettingsModal({
  config,
  onClose,
  onSave,
}: ChatProviderSettingsModalProps) {
  const [draft, setDraft] = useState<ChatProviderConfig>(() => config);
  const [error, setError] = useState("");

  const handleSave = () => {
    const apiUrl = draft.apiUrl.trim();
    if (!apiUrl) {
      setError("API 地址不能为空");
      return;
    }
    onSave({
      ...draft,
      apiUrl,
      apiKeyHeader:
        draft.apiKeyHeader?.trim() ||
        DEFAULT_CHAT_PROVIDER_CONFIG.apiKeyHeader,
      apiKeyPrefix:
        draft.apiKeyPrefix !== undefined
          ? draft.apiKeyPrefix
          : DEFAULT_CHAT_PROVIDER_CONFIG.apiKeyPrefix,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="关闭设置"
      />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            接口设置
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            关闭
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          API Key 仅保存在浏览器本地存储，请勿在不可信环境中使用。
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            接口模式
            <select
              value={draft.mode ?? DEFAULT_CHAT_PROVIDER_CONFIG.mode}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  mode: e.target.value as ChatProviderConfig["mode"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
            >
              <option value="server">服务端（/api/chat）</option>
              <option value="openai-compatible">直连（OpenAI Compatible）</option>
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            API 地址
            <input
              value={draft.apiUrl}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, apiUrl: e.target.value }))
              }
              placeholder="/api/chat"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            API Key（可选）
            <input
              type="password"
              value={draft.apiKey ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              placeholder="sk-..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            系统提示词（可选）
            <textarea
              rows={2}
              value={draft.systemPrompt ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, systemPrompt: e.target.value }))
              }
              placeholder={DEFAULT_CHAT_PROVIDER_CONFIG.systemPrompt}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Header 名称
              <input
                value={draft.apiKeyHeader ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    apiKeyHeader: e.target.value,
                  }))
                }
                placeholder="Authorization"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              前缀
              <input
                value={draft.apiKeyPrefix ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    apiKeyPrefix: e.target.value,
                  }))
                }
                placeholder="Bearer "
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
              />
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_CHAT_PROVIDER_CONFIG)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            恢复默认
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
