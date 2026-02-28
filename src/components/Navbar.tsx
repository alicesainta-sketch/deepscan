"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import type { UIMessage } from "ai";
import {
  deleteLocalChat,
  exportLocalChats,
  getChatScope,
  importLocalChats,
  listChats,
  updateLocalChat,
} from "@/lib/chatStore";
import type { ChatExportPayload } from "@/lib/chatStore";
import { getStoredMessagesText } from "@/lib/chatMessageStorage";
import { normalizeSearchText } from "@/lib/searchUtils";
import type { ChatModel } from "@/types/chat";
import ChatBulkActions from "@/components/ChatBulkActions";
import {
  IconCheck,
  IconChevronsLeft,
  IconChevronsRight,
  IconClose,
  IconDownload,
  IconMessage,
  IconMoon,
  IconPencil,
  IconPin,
  IconPinOff,
  IconPlus,
  IconSearch,
  IconSun,
  IconTrash,
  IconUpload,
} from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";

type NavbarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

type ChatGroup = {
  key: string;
  label: string;
  chats: ChatModel[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const groupChatsByRecency = (chats: ChatModel[]): ChatGroup[] => {
  const now = Date.now();
  const pinned: ChatModel[] = [];
  const today: ChatModel[] = [];
  const last7Days: ChatModel[] = [];
  const last30Days: ChatModel[] = [];
  const older: ChatModel[] = [];

  chats.forEach((chat) => {
    if (chat.pinned) {
      pinned.push(chat);
      return;
    }

    const dayDiff = Math.max(0, Math.floor((now - chat.updatedAt) / DAY_MS));
    if (dayDiff <= 0) {
      today.push(chat);
      return;
    }
    if (dayDiff <= 7) {
      last7Days.push(chat);
      return;
    }
    if (dayDiff <= 30) {
      last30Days.push(chat);
      return;
    }
    older.push(chat);
  });

  return [
    { key: "pinned", label: "置顶", chats: pinned },
    { key: "today", label: "今天", chats: today },
    { key: "last7", label: "近 7 天", chats: last7Days },
    { key: "last30", label: "近 30 天", chats: last30Days },
    { key: "older", label: "更早", chats: older },
  ].filter((group) => group.chats.length > 0);
};

const Navbar = ({ collapsed, onToggleCollapse }: NavbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { theme, isHydrated, toggleTheme } = useTheme();
  const chatScope = getChatScope(userId);
  const [keyword, setKeyword] = React.useState("");
  const [editingChatId, setEditingChatId] = React.useState<number | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const [actionNotice, setActionNotice] = React.useState("");
  const [busyChatId, setBusyChatId] = React.useState<number | null>(null);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [selectedChatIds, setSelectedChatIds] = React.useState<Set<number>>(
    () => new Set()
  );
  // Defer search filtering work to keep typing responsive with large histories.
  const deferredKeyword = React.useDeferredValue(keyword);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!collapsed) return;
    setEditingChatId(null);
    setDraftTitle("");
  }, [collapsed]);

  const shouldLoadChats = !pathname.startsWith("/sign-in");

  const {
    data: chats = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ChatModel[]>({
    queryKey: ["chats", chatScope],
    queryFn: async () => listChats(chatScope),
    enabled: shouldLoadChats,
    retry: 1,
    staleTime: 10_000,
  });

  const messageIndex = React.useMemo(() => {
    if (!shouldLoadChats) return {};
    const normalizedKeyword = normalizeSearchText(deferredKeyword);
    if (!normalizedKeyword) return {};
    if (typeof window === "undefined") return {};
    const index: Record<number, string> = {};
    chats.forEach((chat) => {
      index[chat.id] = getStoredMessagesText(String(chat.id));
    });
    return index;
  }, [chats, deferredKeyword, shouldLoadChats]);

  const filteredChats = React.useMemo(() => {
    const normalizedKeyword = normalizeSearchText(deferredKeyword);
    if (!normalizedKeyword) return chats;
    return chats.filter((chat) => {
      const messageText = normalizeSearchText(messageIndex[chat.id] ?? "");
      return (
        normalizeSearchText(chat.title).includes(normalizedKeyword) ||
        normalizeSearchText(chat.model).includes(normalizedKeyword) ||
        messageText.includes(normalizedKeyword)
      );
    });
  }, [chats, deferredKeyword, messageIndex]);

  const groupedFilteredChats = React.useMemo(
    () => groupChatsByRecency(filteredChats),
    [filteredChats]
  );
  const selectedChats = React.useMemo(
    () => chats.filter((chat) => selectedChatIds.has(chat.id)),
    [chats, selectedChatIds]
  );

  const handleCreateNewChat = () => {
    router.push(`/chat/new?draftId=${Date.now().toString(36)}`);
  };

  const downloadExportPayload = (payload: ChatExportPayload, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getExportFilename = (suffix: string) => {
    const date = new Date().toISOString().slice(0, 10);
    return `deepscan-chats-${suffix}-${date}.json`;
  };

  const handleToggleBulkMode = () => {
    setActionError("");
    setActionNotice("");
    setEditingChatId(null);
    setDraftTitle("");
    setBulkMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedChatIds(new Set());
      }
      return next;
    });
  };

  const handleToggleSelectChat = (chatId: number) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedChatIds(new Set(filteredChats.map((chat) => chat.id)));
  };

  const handleClearSelection = () => {
    setSelectedChatIds(new Set());
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Esc clears the keyword for quicker navigation.
    if (event.key === "Escape") {
      setKeyword("");
    }
  };

  const runBulkAction = async (
    task: () => Promise<void>,
    notice?: string
  ) => {
    if (bulkBusy) return;
    setActionError("");
    setActionNotice("");
    setBulkBusy(true);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
      if (notice) {
        setActionNotice(notice);
      }
      setSelectedChatIds(new Set());
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkPin = () => {
    const targets = Array.from(selectedChatIds);
    if (targets.length === 0) return;
    void runBulkAction(async () => {
      await Promise.all(
        targets.map((chatId) =>
          updateLocalChat(chatScope, chatId, { pinned: true })
        )
      );
    }, `已置顶 ${targets.length} 个会话`);
  };

  const handleBulkUnpin = () => {
    const targets = Array.from(selectedChatIds);
    if (targets.length === 0) return;
    void runBulkAction(async () => {
      await Promise.all(
        targets.map((chatId) =>
          updateLocalChat(chatScope, chatId, { pinned: false })
        )
      );
    }, `已取消置顶 ${targets.length} 个会话`);
  };

  const handleBulkExport = () => {
    const targets = selectedChats;
    if (targets.length === 0) return;
    void runBulkAction(async () => {
      const payload = await exportLocalChats(chatScope);
      const selectedIdSet = new Set(targets.map((chat) => String(chat.id)));
      const selectedMessages: Record<string, UIMessage[]> = {};
      Object.entries(payload.messagesByChatId ?? {}).forEach(
        ([chatId, messages]) => {
          if (selectedIdSet.has(chatId)) {
            selectedMessages[chatId] = messages;
          }
        }
      );
      const selectedPayload = {
        ...payload,
        chats: targets,
        messagesByChatId: selectedMessages,
      };
      downloadExportPayload(selectedPayload, getExportFilename("selected"));
    }, `已导出 ${targets.length} 个会话`);
  };

  const handleBulkDelete = () => {
    const targets = Array.from(selectedChatIds);
    if (targets.length === 0) return;
    if (!window.confirm(`确认删除 ${targets.length} 个会话？此操作不可撤销。`)) {
      return;
    }
    void runBulkAction(async () => {
      await Promise.all(
        targets.map((chatId) => deleteLocalChat(chatScope, chatId))
      );
      if (targets.some((chatId) => pathname === `/chat/${chatId}`)) {
        router.push("/");
      }
    }, `已删除 ${targets.length} 个会话`);
  };

  const runAction = async (chatId: number, task: () => Promise<void>) => {
    setActionError("");
    setActionNotice("");
    setBusyChatId(chatId);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      setBusyChatId(null);
    }
  };

  const handleTogglePin = async (chat: ChatModel) => {
    await runAction(chat.id, async () => {
      const updated = await updateLocalChat(chatScope, chat.id, {
        pinned: !chat.pinned,
      });
      if (!updated) {
        throw new Error("置顶操作失败，请重试");
      }
    });
  };

  const handleStartEdit = (chat: ChatModel) => {
    setActionError("");
    setActionNotice("");
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
      const updated = await updateLocalChat(chatScope, chatId, {
        title: nextTitle,
      });
      if (!updated) {
        throw new Error("重命名失败，请重试");
      }
      setEditingChatId(null);
      setDraftTitle("");
    });
  };

  const handleDeleteChat = async (chatId: number) => {
    if (!window.confirm("确认删除该会话？此操作不可撤销。")) {
      return;
    }

    await runAction(chatId, async () => {
      const removed = await deleteLocalChat(chatScope, chatId);
      if (!removed) {
        throw new Error("删除失败，会话不存在");
      }
      if (pathname === `/chat/${chatId}`) {
        router.push("/");
      }
    });
  };

  const handleExportChats = async () => {
    setActionError("");
    setActionNotice("");
    try {
      const payload = await exportLocalChats(chatScope);
      downloadExportPayload(payload, getExportFilename("all"));
      setActionNotice(`已导出 ${payload.chats.length} 个会话`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "导出失败");
    }
  };

  const handleSelectImportFile = () => {
    setActionError("");
    setActionNotice("");
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      const result = await importLocalChats(chatScope, payload, "merge");
      await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
      setActionNotice(
        `导入完成：新增 ${result.importedCount} 个会话（当前共 ${result.totalCount}）`
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "导入失败，请检查文件");
    } finally {
      event.target.value = "";
    }
  };

  const renderTopActions = () => {
    if (collapsed) {
      return (
        <div className="space-y-2 px-2">
          <button
            type="button"
            className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            onClick={handleCreateNewChat}
            aria-label="创建新对话"
            title="创建新对话"
          >
            <IconPlus size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              void handleExportChats();
            }}
            aria-label="导出会话"
            title="导出会话"
          >
            <IconDownload size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={handleSelectImportFile}
            aria-label="导入会话"
            title="导入会话"
          >
            <IconUpload size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={toggleTheme}
            aria-label="切换亮暗色主题"
            title={!isHydrated ? "切换主题" : theme === "dark" ? "切换到亮色" : "切换到暗色"}
          >
            {!isHydrated ? (
              <IconMoon size={16} aria-hidden />
            ) : theme === "dark" ? (
              <IconSun size={16} aria-hidden />
            ) : (
              <IconMoon size={16} aria-hidden />
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2 px-4">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          onClick={handleCreateNewChat}
        >
          <IconPlus size={16} aria-hidden />
          创建新对话
        </button>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          onClick={toggleTheme}
          aria-label="切换亮暗色主题"
        >
          {!isHydrated ? (
            <IconMoon size={16} aria-hidden />
          ) : theme === "dark" ? (
            <IconSun size={16} aria-hidden />
          ) : (
            <IconMoon size={16} aria-hidden />
          )}
          {!isHydrated ? "切换主题" : theme === "dark" ? "切换到亮色" : "切换到暗色"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              void handleExportChats();
            }}
          >
            <IconDownload size={14} aria-hidden />
            导出
          </button>
          <button
            type="button"
            className="flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={handleSelectImportFile}
          >
            <IconUpload size={14} aria-hidden />
            导入
          </button>
        </div>
      </div>
    );
  };

  const renderCollapsedChats = () => {
    if (!shouldLoadChats) return null;
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
          className="mx-2 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-700 dark:text-red-300"
          onClick={() => {
            void refetch();
          }}
          title="重试加载会话"
        >
          !
        </button>
      );
    }
    if (filteredChats.length === 0) {
      return (
        <div className="px-2 text-center text-xs text-slate-400 dark:text-slate-500">
          无
        </div>
      );
    }

    return filteredChats.map((chat) => {
      const isActive = pathname === `/chat/${chat.id}`;
      const isBusy = busyChatId === chat.id;
      return (
        <button
          key={chat.id}
          type="button"
          className={`group relative flex h-10 w-full items-center justify-center rounded-xl border transition ${
            isActive
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          }`}
          onClick={() => {
            router.push(`/chat/${chat.id}`);
          }}
          disabled={isBusy}
          title={`${chat.title} (${chat.model === "deepseek-r1" ? "R1" : "V3"})`}
        >
          <IconMessage size={16} aria-hidden />
          {chat.pinned ? (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
          ) : null}
        </button>
      );
    });
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
      <div className={`pb-4 pt-4 ${collapsed ? "px-2" : "px-5 pt-6"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed ? (
            <div>
              <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                DeepSeek
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Workspace
              </p>
            </div>
          ) : null}
          <button
            type="button"
            className="hidden rounded-lg border border-slate-200 p-1 text-slate-600 transition hover:bg-slate-100 md:inline-flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
            title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          >
            {collapsed ? (
              <IconChevronsRight size={16} aria-hidden />
            ) : (
              <IconChevronsLeft size={16} aria-hidden />
            )}
          </button>
        </div>
      </div>

      {renderTopActions()}

      {!collapsed ? (
        <>
          <div className="flex items-center justify-between px-5 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              历史对话
            </p>
            <button
              type="button"
              onClick={handleToggleBulkMode}
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {bulkMode ? "退出批量" : "批量操作"}
            </button>
          </div>
          <div className="px-3 pt-2">
            <label className="relative block">
              <IconSearch
                size={16}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索标题、模型或消息..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500"
              />
              {keyword ? (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  aria-label="清空搜索"
                >
                  <IconClose size={14} aria-hidden />
                </button>
              ) : null}
            </label>
          </div>
          {bulkMode ? (
            <div className="px-3 pt-2">
              <ChatBulkActions
                selectedCount={selectedChatIds.size}
                totalCount={filteredChats.length}
                isBusy={bulkBusy}
                onSelectAll={handleSelectAllFiltered}
                onClear={handleClearSelection}
                onPin={handleBulkPin}
                onUnpin={handleBulkUnpin}
                onExport={handleBulkExport}
                onDelete={handleBulkDelete}
                onExit={handleToggleBulkMode}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <div className={`mt-2 flex-1 overflow-y-auto pb-4 ${collapsed ? "space-y-2 px-2" : "space-y-1 px-3"}`}>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFileChange}
        />
        {collapsed ? (
          renderCollapsedChats()
        ) : (
          <>
            {actionNotice ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-300">
                {actionNotice}
              </div>
            ) : null}
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
              groupedFilteredChats.map((group) => (
                <section key={group.key} className="space-y-1">
                  <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {group.label}
                  </p>
                  {group.chats.map((chat: ChatModel) => {
                    const isActive = pathname === `/chat/${chat.id}`;
                    const isEditing = editingChatId === chat.id;
                    const isBusy = busyChatId === chat.id;
                    const isSelected = selectedChatIds.has(chat.id);

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
                              <IconCheck size={16} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isBusy}
                              className="rounded-md p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                              aria-label="取消编辑"
                            >
                              <IconClose size={16} aria-hidden />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            {bulkMode ? (
                              <button
                                type="button"
                                onClick={() => handleToggleSelectChat(chat.id)}
                                className={`mt-2 flex h-4 w-4 items-center justify-center rounded border ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-500"
                                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                                }`}
                                aria-label={isSelected ? "取消选择会话" : "选择会话"}
                              >
                                {isSelected ? (
                                  <IconCheck
                                    size={12}
                                    className="text-white"
                                    aria-hidden
                                  />
                                ) : null}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={`flex min-w-0 flex-1 flex-col items-start rounded-lg px-1.5 py-1.5 text-left transition ${
                                isActive
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                              onClick={() => {
                                if (bulkMode) {
                                  handleToggleSelectChat(chat.id);
                                  return;
                                }
                                router.push(`/chat/${chat.id}`);
                              }}
                              disabled={isBusy}
                            >
                              <div className="flex w-full items-center gap-2">
                                <IconMessage
                                  size={16}
                                  className={`shrink-0 ${
                                    isActive
                                      ? "text-blue-600 dark:text-blue-300"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                  aria-hidden
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
                            {!bulkMode ? (
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
                                    <IconPin size={16} aria-hidden />
                                  ) : (
                                    <IconPinOff size={16} aria-hidden />
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
                                  <IconPencil size={16} aria-hidden />
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
                                  <IconTrash size={16} aria-hidden />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              ))}
          </>
        )}
      </div>

      <div className={`border-t border-slate-200 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 ${collapsed ? "px-2 text-center" : "px-5"}`}>
        {userId ? (
          <p className="line-clamp-1" title={userId}>
            {collapsed ? userId.slice(0, 6) : `用户: ${userId}`}
          </p>
        ) : (
          <p>{collapsed ? "访客" : "访客模式"}</p>
        )}
      </div>
    </div>
  );
};

export default Navbar;
