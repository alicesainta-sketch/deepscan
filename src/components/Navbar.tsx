"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import type { ChatModel } from "@/types/chat";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useTheme } from "@/components/ThemeProvider";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();
  const { theme, isHydrated, toggleTheme } = useTheme();

  const shouldLoadChats =
    isLoaded && Boolean(userId) && !pathname.startsWith("/sign-in");

  const {
    data: chats = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ChatModel[]>({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await axios.post<ChatModel[]>("/api/get-chats");
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: shouldLoadChats,
    retry: 1,
    staleTime: 10_000,
  });

  const handleCreateNewChat = () => {
    if (!userId) {
      return;
    }
    router.push(`/chat/new?draftId=${Date.now().toString(36)}`);
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
      <div className="px-5 pb-4 pt-6">
        <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          DeepSeek
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Workspace
        </p>
      </div>

      <div className="space-y-2 px-4">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          onClick={handleCreateNewChat}
          disabled={!userId}
        >
          <AddIcon fontSize="small" />
          创建新对话
        </button>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          onClick={toggleTheme}
          aria-label="切换亮暗色主题"
        >
          {!isHydrated ? (
            <DarkModeOutlinedIcon fontSize="small" />
          ) : theme === "dark" ? (
            <LightModeOutlinedIcon fontSize="small" />
          ) : (
            <DarkModeOutlinedIcon fontSize="small" />
          )}
          {!isHydrated ? "切换主题" : theme === "dark" ? "切换到亮色" : "切换到暗色"}
        </button>
      </div>

      <div className="px-5 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          历史对话
        </p>
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {shouldLoadChats && isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            正在加载历史对话...
          </div>
        ) : null}
        {shouldLoadChats && isError ? (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-300">
            <p>历史对话加载失败</p>
            <button
              type="button"
              className="rounded-lg border border-red-300 px-2 py-1 text-xs transition hover:bg-red-100 dark:border-red-600 dark:hover:bg-red-900/50"
              onClick={() => {
                void refetch();
              }}
            >
              重试
            </button>
          </div>
        ) : null}
        {shouldLoadChats && !isLoading && !isError && chats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            还没有历史对话，先创建一个新会话。
          </div>
        ) : null}
        {!isError &&
          chats.map((chat: ChatModel) => (
          <button
            type="button"
            className={`group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
              pathname === `/chat/${chat.id}`
                ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,.22)] dark:bg-blue-900/20 dark:text-blue-300 dark:shadow-[inset_0_0_0_1px_rgba(147,197,253,.35)]"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
            key={chat.id}
            onClick={() => {
              router.push(`/chat/${chat.id}`);
            }}
          >
            <ChatBubbleOutlineIcon
              fontSize="small"
              className={`shrink-0 ${
                pathname === `/chat/${chat.id}`
                  ? "text-blue-600 dark:text-blue-300"
                  : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
              }`}
            />
            <p className="line-clamp-1 text-sm font-medium">{chat?.title}</p>
          </button>
          ))}
      </div>

      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {userId ? (
          <p className="line-clamp-1">用户: {userId}</p>
        ) : (
          <p>未登录</p>
        )}
      </div>
    </div>
  );
};

export default Navbar;
