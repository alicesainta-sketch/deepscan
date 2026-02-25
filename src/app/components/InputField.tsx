"use client";

import { FormEvent } from "react";
import EastIcon from "@mui/icons-material/East";
import StopIcon from "@mui/icons-material/Stop";

interface InputFieldProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
  placeholder?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}

export default function InputField({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  onStop,
  placeholder = "输入消息…",
  textareaRef,
}: InputFieldProps) {
  const trimmedInput = input.trim();
  const charCount = trimmedInput.length;
  const tokenEstimate = charCount > 0 ? Math.ceil(charCount / 4) : 0;
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) onSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col rounded-lg border border-gray-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <textarea
        ref={textareaRef}
        className="w-full resize-none rounded-t-lg p-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-400"
        rows={3}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
      />
      <div className="flex items-center justify-between border-t border-gray-200 px-2 py-2 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
          <span>Enter 发送，Shift+Enter 换行</span>
          {charCount > 0 ? (
            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              字数 {charCount} · 约 {tokenEstimate} tokens
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-600">
              输入后显示字数与 token 估算
            </span>
          )}
        </div>
        {isLoading && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            <StopIcon fontSize="small" /> 停止
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex items-center justify-center rounded-full border-2 border-gray-800 p-1.5 text-gray-800 hover:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 dark:border-slate-200 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:border-slate-600 dark:disabled:text-slate-500"
            aria-label="发送"
          >
            <EastIcon />
          </button>
        )}
      </div>
    </form>
  );
}
