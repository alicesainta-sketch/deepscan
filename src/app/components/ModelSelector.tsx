"use client";

import {
  SUPPORTED_CHAT_MODELS,
  type SupportedChatModel,
} from "@/lib/model/models";

type ModelSelectorProps = {
  value: SupportedChatModel;
  onChange: (model: SupportedChatModel) => void;
  disabled?: boolean;
};

const MODEL_LABELS: Record<SupportedChatModel, string> = {
  "deepseek-v3": "DeepSeek V3",
  "deepseek-r1": "DeepSeek R1",
};

export default function ModelSelector({
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="whitespace-nowrap">模型</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as SupportedChatModel)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
      >
        {SUPPORTED_CHAT_MODELS.map((model) => (
          <option key={model} value={model}>
            {MODEL_LABELS[model]}
          </option>
        ))}
      </select>
    </label>
  );
}
