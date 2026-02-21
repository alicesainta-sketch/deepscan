"use client";

interface ErrorDisplayProps {
  error: Error | string;
  onDismiss?: () => void;
}

export default function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-200"
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <span>{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-red-600 hover:text-red-800 focus:outline-none dark:text-red-300 dark:hover:text-red-200"
            aria-label="关闭"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
