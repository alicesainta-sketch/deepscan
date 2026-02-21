"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import axios from "axios";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ChatHeader from "@/app/components/ChatHeader";
import ErrorDisplay from "@/app/components/ErrorDisplay";
import InputField from "@/app/components/InputField";
import LoadingIndicator from "@/app/components/LoadingIndicator";
import MessageList from "@/app/components/MessageList";

const getChatStorageKey = (sessionId: string) =>
  `deepscan:chat:${sessionId}:messages`;

const parseStoredMessages = (value: string | null): UIMessage[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
};

const getMessageText = (message: UIMessage) =>
  message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

const getFirstUserMessageText = (messages: UIMessage[]) => {
  const userMessage = messages.find((message) => message.role === "user");
  return userMessage ? getMessageText(userMessage) : "";
};

const hasAssistantResponse = (messages: UIMessage[]) =>
  messages.some(
    (message) => message.role === "assistant" && getMessageText(message).length > 0
  );

const MAX_DRAFT_PERSIST_RETRIES = 3;
const DRAFT_PERSIST_RETRY_DELAY_MS = 1500;
const subscribeHydration = () => () => {};

const useIsHydrated = () =>
  useSyncExternalStore(subscribeHydration, () => true, () => false);

function ChatSession({
  routeChatId,
  draftId,
  initialPrompt,
  initialModel,
  initialMessages,
}: {
  routeChatId: string;
  draftId?: string;
  initialPrompt?: string;
  initialModel: "deepseek-v3" | "deepseek-r1";
  initialMessages: UIMessage[];
}) {
  const isDraftSession = routeChatId === "new";
  const sessionId = isDraftSession ? `draft:${draftId ?? "default"}` : routeChatId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<"deepseek-v3" | "deepseek-r1">(initialModel);
  const [persistError, setPersistError] = useState("");
  const [persistRetryTick, setPersistRetryTick] = useState(0);
  const hasAutoSentInitialRef = useRef(false);
  const draftPersistStateRef = useRef<"idle" | "pending" | "done">("idle");
  const persistRetryCountRef = useRef(0);
  const persistRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, sendMessage, error, status, stop, clearError } = useChat({
    id: sessionId,
    messages: initialMessages,
    onError: (err) => console.error("Chat error:", err),
  });

  const isLoading = status === "streaming" || status === "submitted";
  const endRef = useRef<HTMLDivElement>(null);
  const messageCount = messages?.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(getChatStorageKey(sessionId), JSON.stringify(messages ?? []));
  }, [sessionId, messages]);

  useEffect(() => {
    if (!isDraftSession) return;
    if (!initialPrompt?.trim()) return;
    if (hasAutoSentInitialRef.current) return;
    if ((messages?.length ?? 0) > 0) return;

    hasAutoSentInitialRef.current = true;
    sendMessage({ text: initialPrompt.trim() }, { body: { model: initialModel } });
  }, [initialModel, initialPrompt, isDraftSession, messages?.length, sendMessage]);

  useEffect(() => {
    return () => {
      if (persistRetryTimerRef.current) {
        clearTimeout(persistRetryTimerRef.current);
        persistRetryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isDraftSession) return;
    if (draftPersistStateRef.current !== "idle") return;
    if (isLoading) return;
    if (!messages?.length) return;
    if (!hasAssistantResponse(messages)) return;
    if (persistRetryCountRef.current >= MAX_DRAFT_PERSIST_RETRIES) return;

    draftPersistStateRef.current = "pending";

    const persistDraft = async () => {
      const firstUserText = getFirstUserMessageText(messages);
      const title = (firstUserText || "新对话").slice(0, 40);

      try {
        const response = await axios.post<{ id?: number; error?: string }>(
          "/api/create-chat",
          {
            title,
            model,
          }
        );

        const newChatId = response.data?.id;
        if (!newChatId) {
          throw new Error(response.data?.error ?? "创建历史会话失败，请重试");
        }

        draftPersistStateRef.current = "done";
        persistRetryCountRef.current = 0;
        setPersistError("");

        const newSessionId = String(newChatId);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            getChatStorageKey(newSessionId),
            JSON.stringify(messages ?? [])
          );
          localStorage.removeItem(getChatStorageKey(sessionId));
        }

        await queryClient.invalidateQueries({ queryKey: ["chats"] });
        router.replace(`/chat/${newChatId}`);
      } catch {
        draftPersistStateRef.current = "idle";
        persistRetryCountRef.current += 1;

        const retryCount = persistRetryCountRef.current;
        const hasRemainingRetries = retryCount < MAX_DRAFT_PERSIST_RETRIES;

        setPersistError(
          hasRemainingRetries
            ? `创建历史会话失败，正在重试（${retryCount}/${MAX_DRAFT_PERSIST_RETRIES}）`
            : "创建历史会话失败，请稍后重试"
        );

        if (!hasRemainingRetries) {
          return;
        }

        if (persistRetryTimerRef.current) {
          clearTimeout(persistRetryTimerRef.current);
        }
        persistRetryTimerRef.current = setTimeout(() => {
          setPersistRetryTick((prev) => prev + 1);
        }, DRAFT_PERSIST_RETRY_DELAY_MS);
      }
    };

    void persistDraft();
  }, [
    isDraftSession,
    isLoading,
    messages,
    model,
    persistRetryTick,
    queryClient,
    router,
    sessionId,
  ]);

  const handleChangeModel = () => {
    setModel(model === "deepseek-v3" ? "deepseek-r1" : "deepseek-v3");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setPersistError("");
    persistRetryCountRef.current = 0;
    sendMessage({ text: input }, { body: { model } });
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <ChatHeader
        status={isLoading ? "loading" : "idle"}
        model={model}
        onModelToggle={handleChangeModel}
      />
      <div className="flex flex-1 flex-col items-center overflow-hidden">
        <div className="flex w-full max-w-4xl flex-1 flex-col gap-4 overflow-auto px-4 py-4 md:px-6">
          {error && <ErrorDisplay error={error} onDismiss={clearError} />}
          {persistError ? <ErrorDisplay error={persistError} /> : null}
          {messages?.length === 0 && !error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-500 dark:text-slate-400">
              <p className="text-sm">开始新对话</p>
              <p className="text-xs">发送一条消息与 AI 助手聊天</p>
            </div>
          ) : (
            <MessageList messages={messages ?? []} />
          )}
          {isLoading && (
            <div className="flex justify-start">
              <LoadingIndicator />
            </div>
          )}
          <div ref={endRef} className="h-4" />
        </div>
        <div className="w-full max-w-4xl shrink-0 px-4 pb-4 md:px-6">
          <InputField
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onStop={stop}
          />
        </div>
      </div>
    </div>
  );
}

function HydratedChatSession({
  routeChatId,
  draftId,
  initialPrompt,
  initialModel,
}: {
  routeChatId: string;
  draftId?: string;
  initialPrompt?: string;
  initialModel: "deepseek-v3" | "deepseek-r1";
}) {
  const isHydrated = useIsHydrated();
  const isDraftSession = routeChatId === "new";
  const sessionId = isDraftSession ? `draft:${draftId ?? "default"}` : routeChatId;

  const initialMessages = useMemo(() => {
    if (!isHydrated) return [];
    return parseStoredMessages(localStorage.getItem(getChatStorageKey(sessionId)));
  }, [isHydrated, sessionId]);

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
      draftId={draftId}
      initialPrompt={initialPrompt}
      initialModel={initialModel}
      initialMessages={initialMessages}
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

  const initialModel =
    searchParams.get("model") === "deepseek-r1" ? "deepseek-r1" : "deepseek-v3";
  const initialPrompt = searchParams.get("q") ?? "";
  const draftId = searchParams.get("draftId") ?? undefined;
  const sessionKey =
    routeChatId === "new" ? `${routeChatId}:${draftId ?? "default"}` : routeChatId;

  return (
    <HydratedChatSession
      key={sessionKey}
      routeChatId={routeChatId}
      draftId={draftId}
      initialPrompt={initialPrompt}
      initialModel={initialModel}
    />
  );
}
