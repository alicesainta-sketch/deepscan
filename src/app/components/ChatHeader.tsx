"use client";

interface ChatHeaderProps {
  title?: string;
  status: "loading" | "idle";
  model: string;
  onModelToggle: () => void;
  onOpenSettings?: () => void;
  providerLabel?: string;
}

export default function ChatHeader({
  title = "DeepScan",
  status,
  model,
  onModelToggle,
  onOpenSettings,
  providerLabel,
}: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {status === "loading" ? "正在输入…" : "在线"}
        </span>
        {providerLabel ? (
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-300">
            {providerLabel}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onModelToggle}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 ${
            model === "deepseek-r1"
              ? "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          {model === "deepseek-r1" ? "深度思考 R1" : "DeepSeek V3"}
        </button>
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="接口设置"
            title="接口设置"
          >
            设置
          </button>
        ) : null}
      </div>
    </header>
  );
}
