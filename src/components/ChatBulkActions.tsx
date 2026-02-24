"use client";

type ChatBulkActionsProps = {
  selectedCount: number;
  totalCount: number;
  isBusy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onExport: () => void;
  onDelete: () => void;
  onExit: () => void;
};

export default function ChatBulkActions({
  selectedCount,
  totalCount,
  isBusy,
  onSelectAll,
  onClear,
  onPin,
  onUnpin,
  onExport,
  onDelete,
  onExit,
}: ChatBulkActionsProps) {
  const disabled = isBusy || selectedCount === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            已选 {selectedCount} / 共 {totalCount}
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            disabled={isBusy}
          >
            全选
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            disabled={isBusy || selectedCount === 0}
          >
            清空
          </button>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          disabled={isBusy}
        >
          退出批量
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPin}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          disabled={disabled}
        >
          批量置顶
        </button>
        <button
          type="button"
          onClick={onUnpin}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          disabled={disabled}
        >
          批量取消置顶
        </button>
        <button
          type="button"
          onClick={onExport}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          disabled={disabled}
        >
          批量导出
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-red-200 px-3 py-1.5 text-[11px] text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700/70 dark:text-red-300 dark:hover:bg-red-900/30"
          disabled={disabled}
        >
          批量删除
        </button>
      </div>
    </div>
  );
}
