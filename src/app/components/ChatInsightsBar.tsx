"use client";

import { useMemo } from "react";
import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/chatMessages";

type ChatInsightsBarProps = {
  messages: UIMessage[];
  isLoading: boolean;
};

export default function ChatInsightsBar({
  messages,
  isLoading,
}: ChatInsightsBarProps) {
  const stats = useMemo(() => {
    let userCount = 0;
    let assistantCount = 0;
    let charCount = 0;
    let codeFenceCount = 0;

    messages.forEach((message) => {
      if (message.role === "user") userCount += 1;
      if (message.role === "assistant") assistantCount += 1;
      const text = getMessageText(message);
      charCount += text.length;
      if (message.role === "assistant") {
        codeFenceCount += (text.match(/```/g) ?? []).length;
      }
    });

    return {
      total: messages.length,
      userCount,
      assistantCount,
      charCount,
      codeBlocks: Math.floor(codeFenceCount / 2),
    };
  }, [messages]);

  if (messages.length === 0) return null;

  const items = [
    { label: "消息", value: stats.total },
    { label: "用户", value: stats.userCount },
    { label: "助手", value: stats.assistantCount },
    { label: "字数", value: stats.charCount.toLocaleString() },
    { label: "代码块", value: stats.codeBlocks },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
          >
            <span className="text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
            <span className="ml-1 font-semibold text-slate-700 dark:text-slate-100">
              {item.value}
            </span>
          </span>
        ))}
      </div>
      <span
        className={`rounded-full px-2 py-1 text-[11px] ${
          isLoading
            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
        }`}
      >
        {isLoading ? "生成中..." : "就绪"}
      </span>
    </div>
  );
}
