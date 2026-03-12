"use client";

import type { UIMessage } from "ai";
import { useMemo, useRef, useState } from "react";
import MessageList from "@/app/components/MessageList";
import { readStoredMessages, writeStoredMessages } from "@/lib/chatMessageStorage";
import { buildSyntheticMessages } from "@/lib/perf/chatPerfDataset";

type PerfResult = {
  datasetMessages: number;
  historyLoadMs: number;
  renderMs: number;
  scrollFps: number;
  memoryDeltaMb: number | null;
};

const PERF_SESSION_ID = "perf:baseline";

const getUsedHeapSize = () => {
  if (typeof performance === "undefined") return null;
  const withMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
    };
  };

  return typeof withMemory.memory?.usedJSHeapSize === "number"
    ? withMemory.memory.usedJSHeapSize
    : null;
};

const waitForStableFrame = async () => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
};

const measureScrollFps = async (element: HTMLElement) => {
  const durationMs = 1_500;
  const start = performance.now();
  let frameCount = 0;
  const maxScrollTop = Math.max(1, element.scrollHeight - element.clientHeight);

  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      frameCount += 1;
      const progress = Math.min(1, (now - start) / durationMs);
      element.scrollTop = maxScrollTop * progress;
      if (progress >= 1) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  return (frameCount / durationMs) * 1_000;
};

export default function PerfPage() {
  const [turnCount, setTurnCount] = useState(300);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PerfResult | null>(null);
  const [error, setError] = useState("");
  const scrollerElementRef = useRef<HTMLElement | null>(null);
  const datasetPreviewCount = useMemo(() => Math.max(1, Math.floor(turnCount)) * 2, [turnCount]);

  const handleRunBaseline = async () => {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const dataset = buildSyntheticMessages(turnCount);
      const heapBefore = getUsedHeapSize();

      writeStoredMessages(PERF_SESSION_ID, dataset);
      const loadStartedAt = performance.now();
      const loaded = readStoredMessages(PERF_SESSION_ID);
      const historyLoadMs = performance.now() - loadStartedAt;

      const renderStartedAt = performance.now();
      setMessages(loaded);
      await waitForStableFrame();
      const renderMs = performance.now() - renderStartedAt;

      const scrollerElement = scrollerElementRef.current;
      if (!scrollerElement) {
        throw new Error("未找到消息滚动容器，无法测量滚动 FPS");
      }
      const scrollFps = await measureScrollFps(scrollerElement);
      const heapAfter = getUsedHeapSize();
      const memoryDeltaMb =
        heapBefore !== null && heapAfter !== null
          ? (heapAfter - heapBefore) / (1024 * 1024)
          : null;

      setResult({
        datasetMessages: loaded.length,
        historyLoadMs,
        renderMs,
        scrollFps,
        memoryDeltaMb,
      });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "性能基线执行失败");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-[#f4f2ec] px-4 py-6 dark:bg-slate-900 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            性能基线面板
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            固定数据集 + 固定流程，复现历史加载、长会话渲染与滚动 FPS。
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              轮次
              <input
                type="number"
                min={50}
                step={50}
                value={turnCount}
                onChange={(event) => setTurnCount(Number(event.target.value))}
                className="ml-2 h-9 w-28 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>
            <button
              type="button"
              disabled={running}
              onClick={() => {
                void handleRunBaseline();
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
            >
              {running ? "执行中..." : "运行基线"}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              预计消息数：{datasetPreviewCount}
            </span>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {result ? (
          <section className="grid gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">消息总数</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {result.datasetMessages}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">历史加载</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {result.historyLoadMs.toFixed(1)} ms
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">首次渲染</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {result.renderMs.toFixed(1)} ms
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">滚动 FPS</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {result.scrollFps.toFixed(1)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">内存增量</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {result.memoryDeltaMb === null ? "N/A" : `${result.memoryDeltaMb.toFixed(2)} MB`}
              </p>
            </div>
          </section>
        ) : null}

        <section className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="h-[62vh]">
            <MessageList
              messages={messages}
              canRegenerate={false}
              isStreaming={false}
              scrollerRef={(element) => {
                scrollerElementRef.current =
                  element instanceof HTMLElement ? element : null;
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
