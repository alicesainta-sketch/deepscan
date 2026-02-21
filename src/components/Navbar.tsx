"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import type { ChatModel } from "@/types/chat";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();

  const shouldLoadChats =
    isLoaded && Boolean(userId) && !pathname.startsWith("/sign-in");

  const { data: chats = [] } = useQuery<ChatModel[]>({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await axios.post<ChatModel[]>("/api/get-chats");
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: shouldLoadChats,
  });

  const { mutate: createNewChat, isPending: isCreatingChat } = useMutation({
    mutationFn: async () => {
      const response = await axios.post<{ id?: number; error?: string }>(
        "/api/create-chat",
        {
          title: "新对话",
          model: "deepseek-v3",
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (!data?.id) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.push(`/chat/${data.id}`);
    },
  });

  const handleCreateNewChat = () => {
    if (!userId || isCreatingChat) {
      return;
    }
    createNewChat();
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <div className="px-5 pb-4 pt-6">
        <p className="text-2xl font-semibold tracking-tight text-slate-900">
          DeepSeek
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
          Workspace
        </p>
      </div>

      <div className="px-4">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleCreateNewChat}
          disabled={!userId || isCreatingChat}
        >
          <AddIcon fontSize="small" />
          {isCreatingChat ? "创建中..." : "创建新对话"}
        </button>
      </div>

      <div className="px-5 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          历史对话
        </p>
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {shouldLoadChats && chats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            还没有历史对话，先创建一个新会话。
          </div>
        ) : null}
        {chats.map((chat: ChatModel) => (
          <button
            type="button"
            className={`group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
              pathname === `/chat/${chat.id}`
                ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,.22)]"
                : "text-slate-700 hover:bg-slate-100"
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
                  ? "text-blue-600"
                  : "text-slate-400 group-hover:text-slate-500"
              }`}
            />
            <p className="line-clamp-1 text-sm font-medium">{chat?.title}</p>
          </button>
        ))}
      </div>

      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
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
