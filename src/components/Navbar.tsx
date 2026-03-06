"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createLocalChat,
  deleteLocalChat,
  getChatScope,
  listChats,
  updateLocalChat,
} from "@/lib/chatStore";
import type { ChatModel } from "@/types/chat";
import {
  IconCheck,
  IconChevronsLeft,
  IconChevronsRight,
  IconMessage,
  IconMoon,
  IconPencil,
  IconPlus,
  IconSun,
  IconTrash,
  IconClose,
} from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";

type NavbarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

/**
 * 将时间戳格式化为“x 分钟前”，保持会话列表信息密度与可读性平衡。
 */
const formatRelativeTime = (updatedAt: number) => {
  const diffMs = Date.now() - updatedAt;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "刚刚";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} 分钟前`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} 小时前`;
  return `${Math.floor(diffMs / day)} 天前`;
};

export default function Navbar({ collapsed, onToggleCollapse }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { theme, isHydrated, toggleTheme } = useTheme();
  const chatScope = getChatScope();
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [busyChatId, setBusyChatId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const {
    data: chats = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ChatModel[]>({
    queryKey: ["chats", chatScope],
    queryFn: async () => listChats(chatScope),
    staleTime: 10_000,
    retry: 1,
  });

  const chatList = useMemo(() => chats, [chats]);

  /**
   * 统一包装侧边栏会话操作，保证错误处理和刷新逻辑一致。
   */
  const runChatAction = async (chatId: number, task: () => Promise<void>) => {
    setActionError("");
    setBusyChatId(chatId);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "操作失败，请稍后重试");
    } finally {
      setBusyChatId(null);
    }
  };

  const handleCreateChat = async () => {
    setActionError("");
    try {
      const created = await createLocalChat(chatScope, {
        title: "新对话",
        model: "deepseek-v3",
      });
      await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
      router.push(`/chat/${created.id}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "创建会话失败");
    }
  };

  const handleStartRename = (chat: ChatModel) => {
    setActionError("");
    setEditingChatId(chat.id);
    setDraftTitle(chat.title);
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
    setDraftTitle("");
  };

  const handleRenameChat = async (chatId: number) => {
    const title = draftTitle.trim();
    if (!title) {
      setActionError("会话标题不能为空");
      return;
    }

    await runChatAction(chatId, async () => {
      const updated = await updateLocalChat(chatScope, chatId, { title });
      if (!updated) {
        throw new Error("重命名失败，会话不存在");
      }
      setEditingChatId(null);
      setDraftTitle("");
    });
  };

  const handleDeleteChat = async (chatId: number) => {
    if (!window.confirm("确认删除该会话？该操作不可撤销。")) {
      return;
    }

    await runChatAction(chatId, async () => {
      const deleted = await deleteLocalChat(chatScope, chatId);
      if (!deleted) {
        throw new Error("删除失败，会话不存在");
      }
      if (pathname === `/chat/${chatId}`) {
        router.push("/");
      }
    });
  };

  const renderCollapsedList = () => {
    if (isLoading) {
      return (
        <div className="px-2 text-center text-xs text-slate-400 dark:text-slate-500">
          ...
        </div>
      );
    }
    if (isError) {
      return (
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mx-2 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-700 dark:text-red-300"
          title="重试加载"
          aria-label="重试加载会话"
        >
          !
        </button>
      );
    }
    if (chatList.length === 0) {
      return (
        <div className="px-2 text-center text-xs text-slate-400 dark:text-slate-500">
          无
        </div>
      );
    }

    return chatList.map((chat) => {
      const isActive = pathname === `/chat/${chat.id}`;
      return (
        <button
          key={chat.id}
          type="button"
          onClick={() => router.push(`/chat/${chat.id}`)}
          className={`flex h-10 w-full items-center justify-center rounded-xl border transition ${
            isActive
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
              : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          }`}
          title={chat.title}
        >
          <IconMessage size={16} aria-hidden />
        </button>
      );
    });
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-200/80 bg-[#f7f6f3] dark:border-slate-700 dark:bg-slate-950">
      <div className={`pb-3 pt-4 ${collapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed ? (
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">DeepScan</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Claude 风格对话</p>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={!isHydrated ? "切换主题" : theme === "dark" ? "切换到浅色" : "切换到深色"}
              title={!isHydrated ? "切换主题" : theme === "dark" ? "切换到浅色" : "切换到深色"}
            >
              {!isHydrated ? (
                <IconMoon size={14} aria-hidden />
              ) : theme === "dark" ? (
                <IconSun size={14} aria-hidden />
              ) : (
                <IconMoon size={14} aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
              className="hidden rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 md:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {collapsed ? <IconChevronsRight size={16} aria-hidden /> : <IconChevronsLeft size={16} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      <div className={collapsed ? "px-2" : "px-4"}>
        <button
          type="button"
          onClick={() => {
            void handleCreateChat();
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${
            collapsed ? "h-10" : "h-11"
          }`}
          aria-label="新建对话"
          title="新建对话"
        >
          <IconPlus size={16} aria-hidden />
          {!collapsed ? <span>新建对话</span> : null}
        </button>
      </div>

      <div className={`mt-4 flex-1 overflow-y-auto ${collapsed ? "space-y-2 px-2" : "space-y-1 px-3"}`}>
        {collapsed ? (
          renderCollapsedList()
        ) : (
          <>
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              历史会话
            </p>

            {actionError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-300">
                {actionError}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                正在加载会话...
              </div>
            ) : null}

            {isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-300">
                <p>会话加载失败</p>
                <button
                  type="button"
                  onClick={() => {
                    void refetch();
                  }}
                  className="mt-2 rounded-md border border-red-300 px-2 py-1 text-xs transition hover:bg-red-100 dark:border-red-600 dark:hover:bg-red-900/50"
                >
                  重试
                </button>
              </div>
            ) : null}

            {!isLoading && !isError && chatList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                暂无历史会话
              </div>
            ) : null}

            {!isError &&
              chatList.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                const isEditing = editingChatId === chat.id;
                const isBusy = busyChatId === chat.id;

                return (
                  <div
                    key={chat.id}
                    className={`rounded-xl border p-2 transition ${
                      isActive
                        ? "border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-900/20"
                        : "border-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={draftTitle}
                          onChange={(event) => setDraftTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void handleRenameChat(chat.id);
                            }
                            if (event.key === "Escape") {
                              handleCancelRename();
                            }
                          }}
                          autoFocus
                          className="h-8 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            void handleRenameChat(chat.id);
                          }}
                          className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                          aria-label="保存标题"
                        >
                          <IconCheck size={16} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                          aria-label="取消重命名"
                        >
                          <IconClose size={16} aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/chat/${chat.id}`)}
                          disabled={isBusy}
                          className="flex min-w-0 flex-1 flex-col items-start rounded-lg px-1 py-1 text-left"
                        >
                          <p
                            className={`line-clamp-1 text-sm font-medium ${
                              isActive
                                ? "text-amber-800 dark:text-amber-200"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {chat.title}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {formatRelativeTime(chat.updatedAt)}
                          </p>
                        </button>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleStartRename(chat)}
                            disabled={isBusy}
                            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label="重命名会话"
                          >
                            <IconPencil size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteChat(chat.id);
                            }}
                            disabled={isBusy}
                            className="rounded-md p-1 text-slate-500 transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-900/40 dark:hover:text-red-300"
                            aria-label="删除会话"
                          >
                            <IconTrash size={15} aria-hidden />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>

      <div className={`border-t border-slate-200 p-3 dark:border-slate-700 ${collapsed ? "space-y-2" : "space-y-2"}`}>
        {!collapsed ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            默认模式
          </p>
        ) : null}
      </div>
    </div>
  );
}
