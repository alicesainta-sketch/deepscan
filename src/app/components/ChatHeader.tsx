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
    <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {status === "loading" ? "正在输入…" : "在线"}
        </span>
        <button
          type="button"
          onClick={onModelToggle}
          className={`rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            model === "deepseek-r1"
              ? "border-blue-300 bg-blue-100 text-blue-800"
              : "border-gray-200 bg-white text-gray-700"
          }`}
        >
          {model === "deepseek-r1" ? "深度思考 R1" : "DeepSeek V3"}
        </button>
      </div>
    </header>
  );
}
