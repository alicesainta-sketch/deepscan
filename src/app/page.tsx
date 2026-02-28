"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowRight } from "@/components/icons";

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [model, setModel] = useState("deepseek-v3");
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSubmit = () => {
    const question = input.trim();
    if (!question || isNavigating) return;
    setIsNavigating(true);
    const query = new URLSearchParams({
      q: question,
      model,
      draftId: Date.now().toString(36),
    }).toString();
    router.push(`/chat/new?${query}`);
  };

  return (
    <div className="flex h-full items-start justify-center overflow-auto bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(2,132,199,0.09),transparent_30%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.16),transparent_30%)] md:items-center md:px-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_14px_55px_-25px_rgba(15,23,42,.45)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-[0_20px_60px_-30px_rgba(2,6,23,.9)] md:p-7">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            New Chat
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            开始新的对话
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            输入你的问题，按 Enter 发送，Shift+Enter 换行。
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/70">
          <textarea
            className="h-36 w-full resize-none rounded-xl border border-transparent bg-white px-4 py-3 text-slate-800 outline-none ring-0 transition focus:border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600"
            placeholder="给 DeepSeek 发一条消息..."
            value={input}
            disabled={isNavigating}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  model === "deepseek-v3"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                onClick={() => setModel("deepseek-v3")}
              >
                DeepSeek V3
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  model === "deepseek-r1"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                onClick={() => setModel("deepseek-r1")}
              >
                深度思考 R1
              </button>
            </div>

            <button
              type="button"
              disabled={isNavigating || !input.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:bg-slate-600 dark:disabled:text-slate-200"
              onClick={handleSubmit}
              aria-label="创建对话"
            >
              {isNavigating ? "跳转中" : "发送并进入"}
              <IconArrowRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
