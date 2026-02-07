"use client";

export default function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500">
      <span>正在输入</span>
      <span className="inline-flex gap-0.5">
        <span
          className="h-1.5 w-1.5 animate-[bounce_0.6s_ease-in-out_infinite] rounded-full bg-gray-400"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 animate-[bounce_0.6s_ease-in-out_infinite] rounded-full bg-gray-400"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1.5 w-1.5 animate-[bounce_0.6s_ease-in-out_infinite] rounded-full bg-gray-400"
          style={{ animationDelay: "300ms" }}
        />
      </span>
    </div>
  );
}
