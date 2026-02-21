"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import EastIcon from "@mui/icons-material/East";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [model, setModel] = useState("deepseek-v3");
  const [submitError, setSubmitError] = useState("");
  const queryClient = useQueryClient();

  // Mutations
  const { mutate: createChat, isPending } = useMutation({
    mutationFn: async () => {
      const res = await axios.post<{ id?: number; error?: string }>(
        "/api/create-chat",
        {
          title: input,
          model: model,
        }
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (!data?.id) {
        setSubmitError(data?.error ?? "创建会话失败，请稍后重试");
        return;
      }
      setSubmitError("");
      router.push(`/chat/${data.id}`);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: () => {
      setSubmitError("创建会话失败，请稍后重试");
    },
  });

  const handleSubmit = () => {
    if (!input.trim() || isPending) return;
    createChat();
  };

  return (
    <div className="flex h-full items-start justify-center overflow-auto bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(2,132,199,0.09),transparent_30%)] px-4 py-10 md:items-center md:px-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_14px_55px_-25px_rgba(15,23,42,.45)] backdrop-blur md:p-7">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            New Chat
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            开始新的对话
          </h1>
          <p className="text-sm text-slate-500">
            输入你的问题，按 Enter 发送，Shift+Enter 换行。
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <textarea
            className="h-36 w-full resize-none rounded-xl border border-transparent bg-white px-4 py-3 text-slate-800 outline-none ring-0 transition focus:border-slate-200"
            placeholder="给 DeepSeek 发一条消息..."
            value={input}
            disabled={isPending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  model === "deepseek-v3"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setModel("deepseek-v3")}
              >
                DeepSeek V3
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  model === "deepseek-r1"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setModel("deepseek-r1")}
              >
                深度思考 R1
              </button>
            </div>

            <button
              type="button"
              disabled={isPending || !input.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={handleSubmit}
              aria-label="创建对话"
            >
              {isPending ? "创建中" : "创建并进入"}
              <EastIcon fontSize="small" />
            </button>
          </div>

          {submitError ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
