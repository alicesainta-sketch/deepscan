"use client";

import { useChat } from "@ai-sdk/react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ErrorDisplay from "@/app/components/ErrorDisplay";
import InputField from "@/app/components/InputField";
import LoadingIndicator from "@/app/components/LoadingIndicator";
import MessageList from "@/app/components/MessageList";
import { createLocalChat, getChatScope, updateLocalChat } from "@/lib/chatStore";
import { getFirstUserMessageText } from "@/lib/chatMessages";
import { readStoredMessages, writeStoredMessages } from "@/lib/chatMessageStorage";
import { useHydrated } from "@/lib/useHydrated";

const DEFAULT_MODEL = "deepseek-v3";

/**
 * 从消息列表尾部提取最后一条 assistant 消息 id，用于触发“重新生成”。
 */
const getLastAssistantMessageId = (messages: UIMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") {
      return messages[index].id;
    }
  }
  return null;
};

function ChatSession({
  routeChatId,
  initialPrompt,
  autoSend,
  chatScope,
}: {
  routeChatId: string;
  initialPrompt: string;
  autoSend: boolean;
  chatScope: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isDraftSession = routeChatId === "new";
  const sessionId = isDraftSession ? "draft:new" : routeChatId;
  const [input, setInput] = useState("");
  const [localActionError, setLocalActionError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const hasAutoSentRef = useRef(false);

  const initialMessages = useMemo(() => {
    if (isDraftSession) return [];
    return readStoredMessages(sessionId);
  }, [isDraftSession, sessionId]);

  const { messages, sendMessage, regenerate, error, status, stop, clearError } =
    useChat({
      id: sessionId,
      messages: initialMessages,
      onError: (chatError) => {
        console.error("chat error", chatError);
      },
    });

  const safeMessages = useMemo(() => messages ?? [], [messages]);
  const messageCount = safeMessages.length;
  const isLoading = status === "streaming" || status === "submitted";
  const lastAssistantMessageId = useMemo(
    () => getLastAssistantMessageId(safeMessages),
    [safeMessages]
  );
  const firstUserTitle = useMemo(
    () => getFirstUserMessageText(safeMessages).slice(0, 40) || "新对话",
    [safeMessages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount, isLoading]);

  useEffect(() => {
    if (isDraftSession) return;
    writeStoredMessages(sessionId, safeMessages);
  }, [isDraftSession, sessionId, safeMessages]);

  /**
   * 新建草稿页提交时先创建会话，再跳转到正式会话并自动发送首条消息。
   */
  const createChatAndRedirect = useCallback(
    async (text: string) => {
      const normalizedTitle = text.slice(0, 40) || "新对话";
      const created = await createLocalChat(chatScope, {
        title: normalizedTitle,
        model: DEFAULT_MODEL,
      });
      await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });

      const query = new URLSearchParams({ q: text }).toString();
      router.replace(`/chat/${created.id}?${query}`);
    },
    [chatScope, queryClient, router]
  );

  useEffect(() => {
    if (!isDraftSession) return;
    if (!initialPrompt.trim()) return;

    if (autoSend && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      void createChatAndRedirect(initialPrompt.trim()).catch((submitError) => {
        setLocalActionError(
          submitError instanceof Error ? submitError.message : "创建会话失败"
        );
      });
      return;
    }
  }, [autoSend, createChatAndRedirect, initialPrompt, isDraftSession]);

  useEffect(() => {
    if (isDraftSession) return;
    if (!initialPrompt.trim()) return;
    if (messageCount > 0) return;
    if (hasAutoSentRef.current) return;

    hasAutoSentRef.current = true;
    sendMessage(
      { text: initialPrompt.trim() },
      { body: { model: DEFAULT_MODEL } }
    );
    router.replace(`/chat/${routeChatId}`);
  }, [
    initialPrompt,
    isDraftSession,
    messageCount,
    routeChatId,
    router,
    sendMessage,
  ]);

  useEffect(() => {
    if (isDraftSession) return;
    if (messageCount === 0) return;

    const chatId = Number(routeChatId);
    if (!Number.isFinite(chatId)) return;

    // 在会话产生实际内容后同步标题与更新时间，保持侧栏排序正确。
    void updateLocalChat(chatScope, chatId, {
      title: firstUserTitle,
      model: DEFAULT_MODEL,
    }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
    });
  }, [
    chatScope,
    firstUserTitle,
    isDraftSession,
    messageCount,
    queryClient,
    routeChatId,
  ]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    setLocalActionError("");
    setInput("");

    if (isDraftSession) {
      void createChatAndRedirect(text).catch((submitError) => {
        setLocalActionError(
          submitError instanceof Error ? submitError.message : "创建会话失败"
        );
      });
      return;
    }

    sendMessage({ text }, { body: { model: DEFAULT_MODEL } });
  };

  const handleRegenerate = () => {
    if (!lastAssistantMessageId || isLoading) return;
    regenerate({ messageId: lastAssistantMessageId, body: { model: DEFAULT_MODEL } });
  };

  return (
    <div className="flex h-screen flex-col bg-[#faf9f5] dark:bg-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/80 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
              {isDraftSession ? "新对话" : "Conversation"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isLoading ? "Assistant 正在思考..." : "Ready"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={!lastAssistantMessageId || isLoading || isDraftSession}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            重新生成
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto px-4 py-4 md:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {error ? <ErrorDisplay error={error} onDismiss={clearError} /> : null}
            {localActionError ? <ErrorDisplay error={localActionError} /> : null}

            {safeMessages.length === 0 ? (
              <div className="flex min-h-[38vh] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                    今天想聊什么？
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    输入问题后即可开始一段新的对话。
                  </p>
                </div>
              </div>
            ) : (
              <MessageList messages={safeMessages} />
            )}

            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <LoadingIndicator />
              </div>
            ) : null}

            <div ref={endRef} className="h-1" />
          </div>
        </div>

        <div className="border-t border-slate-200/80 bg-[#faf9f5] px-4 py-4 dark:border-slate-700 dark:bg-slate-900 md:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <InputField
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onStop={stop}
              textareaRef={inputRef}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function HydratedChatSession({
  routeChatId,
  initialPrompt,
  autoSend,
}: {
  routeChatId: string;
  initialPrompt: string;
  autoSend: boolean;
}) {
  const isHydrated = useHydrated();
  const { userId } = useAuth();
  const chatScope = getChatScope(userId);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        正在加载会话...
      </div>
    );
  }

  return (
    <ChatSession
      routeChatId={routeChatId}
      initialPrompt={initialPrompt}
      autoSend={autoSend}
      chatScope={chatScope}
    />
  );
}

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawChatId = params?.chat_id;
  const routeChatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId;

  if (!routeChatId) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        无效会话 ID
      </div>
    );
  }

  const initialPrompt = searchParams.get("q") ?? "";
  const autoSend = searchParams.get("auto") === "1";

  return (
    <HydratedChatSession
      key={routeChatId}
      routeChatId={routeChatId}
      initialPrompt={initialPrompt}
      autoSend={autoSend}
    />
  );
}
