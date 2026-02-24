"use client";

import SearchIcon from "@mui/icons-material/Search";

type ChatMessageSearchBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number;
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onClear: () => void;
  hasQuery: boolean;
};

export default function ChatMessageSearchBar({
  query,
  onQueryChange,
  matchCount,
  activeIndex,
  onPrev,
  onNext,
  onClear,
  hasQuery,
}: ChatMessageSearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <SearchIcon fontSize="small" className="text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索当前会话消息..."
        className="min-w-[160px] flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
      />
      {hasQuery ? (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {matchCount > 0 ? `${activeIndex + 1}/${matchCount}` : "无匹配"}
        </span>
      ) : null}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={matchCount === 0}
          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          上一个
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={matchCount === 0}
          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          下一个
        </button>
      </div>
      {hasQuery ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          清除
        </button>
      ) : null}
    </div>
  );
}
