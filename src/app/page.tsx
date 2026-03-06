"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowRight } from "@/components/icons";

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const question = input.trim();
    if (!question) return;
    const query = new URLSearchParams({ q: question, auto: "1" }).toString();
    router.push(`/chat/new?${query}`);
  };

  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-[#f4f2ec] px-4 py-8 dark:bg-slate-900 md:px-8">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-950 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          DeepScan
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
          从一个问题开始，持续深入
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          专注核心聊天体验，让思考与回答更高效。
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-[#faf9f5] p-3 dark:border-slate-700 dark:bg-slate-900">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="你想讨论什么？"
            className="h-36 w-full resize-none rounded-xl border border-transparent bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-700"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">Enter 发送，Shift + Enter 换行</p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
            >
              开始对话
              <IconArrowRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
