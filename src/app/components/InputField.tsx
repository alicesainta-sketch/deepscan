"use client";

import { FormEvent } from "react";
import { IconArrowRight, IconStop } from "@/components/icons";

type InputFieldProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
  placeholder?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
};

export default function InputField({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  onStop,
  placeholder = "给 Assistant 发送消息...",
  textareaRef,
}: InputFieldProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!input.trim() || isLoading) return;
      onSubmit(event as unknown as FormEvent);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <textarea
        ref={textareaRef}
        rows={3}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-1 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter 发送，Shift + Enter 换行
        </p>
        {isLoading && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 transition hover:bg-red-100 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            <IconStop size={14} aria-hidden />
            停止
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-900 bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:disabled:border-slate-700 dark:disabled:bg-slate-700"
            aria-label="发送"
          >
            <IconArrowRight size={16} aria-hidden />
          </button>
        )}
      </div>
    </form>
  );
}
