"use client";

interface ChatHeaderProps {
  title?: string;
  status: "loading" | "idle";
  model: string;
  onModelToggle: () => void;
}

export default function ChatHeader({
  title = "DeepScan",
  status,
  model,
  onModelToggle,
}: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {status === "loading" ? "正在输入…" : "在线"}
        </span>
        <button
          type="button"
          onClick={onModelToggle}
          className={`rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 ${
            model === "deepseek-r1"
              ? "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          {model === "deepseek-r1" ? "深度思考 R1" : "DeepSeek V3"}
        </button>
      </div>
    </header>
  );
}
