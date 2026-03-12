"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentMvpPanel from "@/app/components/AgentMvpPanel";
import ErrorDisplay from "@/app/components/ErrorDisplay";
import InputField from "@/app/components/InputField";
import LoadingIndicator from "@/app/components/LoadingIndicator";
import MessageList from "@/app/components/MessageList";
import ModelSelector from "@/app/components/ModelSelector";
import { IconFlask, IconMoon, IconSun } from "@/components/icons";
import { useTheme } from "@/components/ThemeProvider";
import { runAgentPipelineForChat } from "@/lib/agent/chatPipeline";
import { createLocalChat, getChatScope, updateLocalChat } from "@/lib/chatStore";
import { getFirstUserMessageText, getMessageText } from "@/lib/chatMessages";
import { readStoredMessages, writeStoredMessages } from "@/lib/chatMessageStorage";
import type { AgentErrorCode, AgentRunStatus } from "@/lib/agent/types";
import { setGlobalChatModel, useGlobalChatModel } from "@/lib/model/globalModel";
import { recordClientEvent } from "@/lib/observability/clientEvents";
import { useHydrated } from "@/lib/useHydrated";

type StreamMetric = {
  requestId: string;
  startedAt: number;
  firstTokenAt?: number;
};

type AgentRunSummary = {
  status: AgentRunStatus;
  attempts: number;
  durationMs: number;
  degraded: boolean;
  summary?: string;
  adapterMode?: "mock" | "http";
  errorCode?: AgentErrorCode;
};

const getPromptForRegenerate = (messages: UIMessage[], assistantMessageId: string) => {
  const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
  if (assistantIndex < 0) return "";

  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      return getMessageText(messages[index]);
    }
  }
  return "";
};

const truncate = (value: string, maxLength = 42) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
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
  const { theme, isHydrated, toggleTheme } = useTheme();
  const globalModel = useGlobalChatModel();
  const isDraftSession = routeChatId === "new";
  const sessionId = isDraftSession ? "draft:new" : routeChatId;
  const [input, setInput] = useState("");
  const [localActionError, setLocalActionError] = useState("");
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [agentHint, setAgentHint] = useState("Agent: idle");
  const [agentRunSummary, setAgentRunSummary] = useState<AgentRunSummary | null>(null);
  const [lastTtftMs, setLastTtftMs] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const hasAutoSentRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamMetricRef = useRef<StreamMetric | null>(null);
  const activePipelineRef = useRef<{
    requestId: string;
    controller: AbortController;
  } | null>(null);

  const initialMessages = useMemo(() => {
    if (isDraftSession) return [];
    return readStoredMessages(sessionId);
  }, [isDraftSession, sessionId]);

  useEffect(() => {
    if (isDraftSession) return;
    recordClientEvent("chat.history.loaded", {
      sessionId,
      messageCount: initialMessages.length,
    });
  }, [initialMessages.length, isDraftSession, sessionId]);

  const { messages, sendMessage, regenerate, error, status, stop, clearError } = useChat({
    id: sessionId,
    messages: initialMessages,
    onError: (chatError) => {
      console.error("chat error", chatError);
      recordClientEvent("chat.stream.error", {
        sessionId,
        message: chatError.message,
      });
    },
  });

  const safeMessages = useMemo(() => messages ?? [], [messages]);
  const messageCount = safeMessages.length;
  const isLoading = status === "streaming" || status === "submitted";
  const firstUserTitle = useMemo(
    () => getFirstUserMessageText(safeMessages).slice(0, 40) || "新对话",
    [safeMessages]
  );
  const latestAssistantTextLength = useMemo(() => {
    for (let index = safeMessages.length - 1; index >= 0; index -= 1) {
      if (safeMessages[index].role === "assistant") {
        return getMessageText(safeMessages[index]).length;
      }
    }
    return 0;
  }, [safeMessages]);

  useEffect(() => {
    if (isDraftSession) return;
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    const delayMs = isLoading ? 260 : 80;
    persistTimerRef.current = setTimeout(() => {
      writeStoredMessages(sessionId, safeMessages);
      recordClientEvent("chat.history.persisted", {
        sessionId,
        messageCount: safeMessages.length,
      });
    }, delayMs);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [isDraftSession, isLoading, safeMessages, sessionId]);

  useEffect(() => {
    const activeMetric = streamMetricRef.current;
    if (!activeMetric) return;

    if (status === "streaming" && !activeMetric.firstTokenAt && latestAssistantTextLength > 0) {
      activeMetric.firstTokenAt = Date.now();
      const ttftMs = activeMetric.firstTokenAt - activeMetric.startedAt;
      setLastTtftMs(ttftMs);
      recordClientEvent("chat.stream.first_token", {
        sessionId,
        requestId: activeMetric.requestId,
        ttftMs,
      });
    }

    if (status === "ready" || status === "error") {
      recordClientEvent("chat.stream.completed", {
        sessionId,
        requestId: activeMetric.requestId,
        status,
        durationMs: Date.now() - activeMetric.startedAt,
        ttftMs: activeMetric.firstTokenAt
          ? activeMetric.firstTokenAt - activeMetric.startedAt
          : null,
      });
      streamMetricRef.current = null;
    }
  }, [latestAssistantTextLength, sessionId, status]);

  useEffect(() => {
    return () => {
      activePipelineRef.current?.controller.abort();
    };
  }, []);

  const createChatAndRedirect = useCallback(
    async (text: string) => {
      const normalizedTitle = text.slice(0, 40) || "新对话";
      const created = await createLocalChat(chatScope, {
        title: normalizedTitle,
        model: globalModel,
      });
      await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });

      const query = new URLSearchParams({ q: text }).toString();
      router.replace(`/chat/${created.id}?${query}`);
    },
    [chatScope, globalModel, queryClient, router]
  );

  const sendWithPipeline = useCallback(
    async (
      text: string,
      options?: {
        mode: "send" | "regenerate";
        assistantMessageId?: string;
      }
    ) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const previousPipeline = activePipelineRef.current;
      if (previousPipeline) {
        previousPipeline.controller.abort();
        recordClientEvent("agent.pipeline.cancel_requested", {
          sessionId,
          requestId: previousPipeline.requestId,
          reason: "superseded_by_new_request",
        });
      }

      const controller = new AbortController();
      activePipelineRef.current = { requestId, controller };
      streamMetricRef.current = { requestId, startedAt: Date.now() };
      recordClientEvent("chat.send.started", {
        sessionId,
        requestId,
        mode: options?.mode ?? "send",
        model: globalModel,
      });

      setAgentHint("Agent: 执行中...");
      setAgentRunSummary({
        status: "running",
        attempts: 0,
        durationMs: 0,
        degraded: false,
      });
      const agentResult = await runAgentPipelineForChat({
        sessionId,
        input: text,
        signal: controller.signal,
      });

      if (activePipelineRef.current?.requestId !== requestId) {
        return;
      }
      activePipelineRef.current = null;

      const firstStep = agentResult.state?.steps[0];
      const nextSummary: AgentRunSummary = {
        status: agentResult.state?.status ?? "failed",
        attempts: firstStep?.attempt ?? 0,
        durationMs: agentResult.context?.durationMs ?? 0,
        degraded: agentResult.degraded,
        summary: agentResult.context?.summary,
        adapterMode: agentResult.context?.adapterMode,
        errorCode: agentResult.state?.lastError?.code,
      };
      setAgentRunSummary(nextSummary);

      if (agentResult.state?.status === "cancelled") {
        setAgentHint("Agent: 已取消");
        recordClientEvent("agent.pipeline.cancelled", {
          sessionId,
          requestId,
        });
        return;
      }

      if (agentResult.context) {
        setAgentHint(`Agent: ${truncate(agentResult.context.summary)}`);
      } else if (agentResult.reason) {
        setAgentHint(`Agent: 已降级 (${truncate(agentResult.reason, 24)})`);
      } else {
        setAgentHint("Agent: 已降级");
      }

      recordClientEvent("agent.pipeline.completed", {
        sessionId,
        requestId,
        degraded: agentResult.degraded,
        runStatus: agentResult.state?.status ?? "unknown",
        errorCode: agentResult.state?.lastError?.code,
        attempts: nextSummary.attempts,
        durationMs: nextSummary.durationMs,
      });

      const requestBody = {
        model: globalModel,
        agentContext: agentResult.context,
      };

      if (options?.mode === "regenerate" && options.assistantMessageId) {
        regenerate({
          messageId: options.assistantMessageId,
          body: requestBody,
        });
        return;
      }

      sendMessage({ text }, { body: requestBody });
    },
    [globalModel, regenerate, sendMessage, sessionId]
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
    }
  }, [autoSend, createChatAndRedirect, initialPrompt, isDraftSession]);

  useEffect(() => {
    if (isDraftSession) return;
    if (!initialPrompt.trim()) return;
    if (messageCount > 0) return;
    if (hasAutoSentRef.current) return;

    const prompt = initialPrompt.trim();
    hasAutoSentRef.current = true;
    queueMicrotask(() => {
      void sendWithPipeline(prompt);
    });
    router.replace(`/chat/${routeChatId}`);
  }, [
    initialPrompt,
    isDraftSession,
    messageCount,
    routeChatId,
    router,
    sendWithPipeline,
  ]);

  useEffect(() => {
    if (isDraftSession) return;
    if (messageCount === 0) return;

    const chatId = Number(routeChatId);
    if (!Number.isFinite(chatId)) return;

    void updateLocalChat(chatScope, chatId, {
      title: firstUserTitle,
      model: globalModel,
    }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
    });
  }, [
    chatScope,
    firstUserTitle,
    globalModel,
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

    void sendWithPipeline(text, { mode: "send" });
  };

  const handleRegenerate = (assistantMessageId: string) => {
    if (isLoading || isDraftSession) return;
    const prompt = getPromptForRegenerate(safeMessages, assistantMessageId);
    if (!prompt) {
      setLocalActionError("未找到可用于重新生成的用户输入");
      return;
    }
    void sendWithPipeline(prompt, {
      mode: "regenerate",
      assistantMessageId,
    });
  };

  const handleStop = () => {
    activePipelineRef.current?.controller.abort();
    stop();
    setAgentHint("Agent: 已取消");
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
              <span className="ml-2 hidden md:inline">{agentHint}</span>
              <span className="ml-2 hidden md:inline">
                {lastTtftMs === null ? "" : `TTFT ${lastTtftMs}ms`}
              </span>
            </p>
            {agentRunSummary ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-slate-900">
                  Agent {agentRunSummary.status}
                </span>
                <span>attempts {agentRunSummary.attempts}</span>
                <span>{agentRunSummary.durationMs}ms</span>
                {agentRunSummary.errorCode ? <span>{agentRunSummary.errorCode}</span> : null}
                {agentRunSummary.adapterMode ? <span>{agentRunSummary.adapterMode}</span> : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ModelSelector
              value={globalModel}
              onChange={(model) => setGlobalChatModel(model)}
              disabled={isLoading}
            />
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
              onClick={() => setShowAgentPanel((prev) => !prev)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                showAgentPanel
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
              aria-label={showAgentPanel ? "收起 Agent MVP 面板" : "展开 Agent MVP 面板"}
              title={showAgentPanel ? "收起 Agent MVP 面板" : "展开 Agent MVP 面板"}
            >
              <IconFlask size={15} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden px-4 py-4 md:px-6">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4">
            {showAgentPanel ? <AgentMvpPanel linkedRunSummary={agentRunSummary} /> : null}
            {error ? <ErrorDisplay error={error} onDismiss={clearError} /> : null}
            {localActionError ? <ErrorDisplay error={localActionError} /> : null}

            <div className="min-h-0 flex-1">
              {safeMessages.length === 0 ? (
                <div className="flex h-full min-h-[38vh] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
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
                <MessageList
                  messages={safeMessages}
                  onRegenerate={handleRegenerate}
                  canRegenerate={!isLoading && !isDraftSession}
                  isStreaming={isLoading}
                />
              )}
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <LoadingIndicator />
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-200/80 bg-[#faf9f5] px-4 py-4 dark:border-slate-700 dark:bg-slate-900 md:px-6">
          <div className="mx-auto w-full max-w-4xl">
            <InputField
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onStop={handleStop}
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
  const chatScope = getChatScope();

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
