"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import type { ChatModel } from "@/types/chat";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CheckIcon from "@mui/icons-material/Check";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@/components/ThemeProvider";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isLoaded, userId } = useAuth();
  const { theme, isHydrated, toggleTheme } = useTheme();
  const [keyword, setKeyword] = React.useState("");
  const [editingChatId, setEditingChatId] = React.useState<number | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const [busyChatId, setBusyChatId] = React.useState<number | null>(null);

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

  const updateChatMutation = useMutation({
    mutationFn: async ({
      chatId,
      title,
      pinned,
    }: {
      chatId: number;
      title?: string;
      pinned?: boolean;
    }) => {
      await axios.post("/api/update-chat", { chatId, title, pinned });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      await axios.post("/api/delete-chat", { chatId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const filteredChats = React.useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return chats;
    return chats.filter((chat) => {
      return (
        chat.title.toLowerCase().includes(normalizedKeyword) ||
        chat.model.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [chats, keyword]);

  const handleCreateNewChat = () => {
    if (!userId) {
      return;
    }
    router.push(`/chat/new?draftId=${Date.now().toString(36)}`);
  };

  const runAction = async (chatId: number, task: () => Promise<void>) => {
    setActionError("");
    setBusyChatId(chatId);
    try {
      await task();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setActionError(error.response?.data?.error ?? "操作失败，请重试");
      } else {
        setActionError("操作失败，请重试");
      }
    } finally {
      setBusyChatId(null);
    }
  };

  const handleTogglePin = async (chat: ChatModel) => {
    await runAction(chat.id, async () => {
      await updateChatMutation.mutateAsync({
        chatId: chat.id,
        pinned: !chat.pinned,
      });
    });
  };

  const handleStartEdit = (chat: ChatModel) => {
    setActionError("");
    setEditingChatId(chat.id);
    setDraftTitle(chat.title);
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setDraftTitle("");
  };

  const handleSaveTitle = async (chatId: number) => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      setActionError("标题不能为空");
      return;
    }

    await runAction(chatId, async () => {
      await updateChatMutation.mutateAsync({
        chatId,
        title: nextTitle,
      });
      setEditingChatId(null);
      setDraftTitle("");
    });
  };

  const handleDeleteChat = async (chatId: number) => {
    if (!window.confirm("确认删除该会话？此操作不可撤销。")) {
      return;
    }

    await runAction(chatId, async () => {
      await deleteChatMutation.mutateAsync(chatId);
      if (pathname === `/chat/${chatId}`) {
        router.push("/");
      }
    });
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

      <div className="px-3 pt-2">
        <label className="relative block">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" fontSize="small" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索标题或模型..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
          />
        </label>
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {actionError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-300">
            {actionError}
          </div>
        ) : null}
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
        {shouldLoadChats &&
        !isLoading &&
        !isError &&
        chats.length > 0 &&
        filteredChats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            没有匹配的会话
          </div>
        ) : null}
        {!isError &&
          filteredChats.map((chat: ChatModel) => {
            const isActive = pathname === `/chat/${chat.id}`;
            const isEditing = editingChatId === chat.id;
            const isBusy = busyChatId === chat.id;

            return (
              <div
                key={chat.id}
                className={`rounded-xl border px-2 py-2 transition ${
                  isActive
                    ? "border-blue-200 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-900/20"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void handleSaveTitle(chat.id);
                        }
                        if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      className="h-8 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveTitle(chat.id);
                      }}
                      disabled={isBusy}
                      className="rounded-md p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      aria-label="保存标题"
                    >
                      <CheckIcon fontSize="small" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isBusy}
                      className="rounded-md p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      aria-label="取消编辑"
                    >
                      <CloseIcon fontSize="small" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-1">
                    <button
                      type="button"
                      className={`flex min-w-0 flex-1 flex-col items-start rounded-lg px-1.5 py-1.5 text-left transition ${
                        isActive
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                      onClick={() => {
                        router.push(`/chat/${chat.id}`);
                      }}
                      disabled={isBusy}
                    >
                      <div className="flex w-full items-center gap-2">
                        <ChatBubbleOutlineIcon
                          fontSize="small"
                          className={`shrink-0 ${
                            isActive
                              ? "text-blue-600 dark:text-blue-300"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        />
                        <p className="line-clamp-1 text-sm font-medium">{chat.title}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{chat.model === "deepseek-r1" ? "R1" : "V3"}</span>
                        {chat.pinned ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            置顶
                          </span>
                        ) : null}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          void handleTogglePin(chat);
                        }}
                        disabled={isBusy}
                        className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        aria-label={chat.pinned ? "取消置顶" : "置顶会话"}
                        title={chat.pinned ? "取消置顶" : "置顶"}
                      >
                        {chat.pinned ? (
                          <PushPinIcon fontSize="small" />
                        ) : (
                          <PushPinOutlinedIcon fontSize="small" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(chat)}
                        disabled={isBusy}
                        className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        aria-label="重命名会话"
                        title="重命名"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteChat(chat.id);
                        }}
                        disabled={isBusy}
                        className="rounded-md p-1 text-slate-500 transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-900/40 dark:hover:text-red-300"
                        aria-label="删除会话"
                        title="删除"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {userId ? <p className="line-clamp-1">用户: {userId}</p> : <p>未登录</p>}
      </div>
    </div>
  );
};

export default Navbar;
