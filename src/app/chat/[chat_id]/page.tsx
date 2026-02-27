"use client";

import { useChat } from "@ai-sdk/react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AgentPanel from "@/app/components/AgentPanel";
import ChatHeader from "@/app/components/ChatHeader";
import ChatInsightsBar from "@/app/components/ChatInsightsBar";
import ChatMessageSearchBar from "@/app/components/ChatMessageSearchBar";
import ChatProviderSettingsModal from "@/app/components/ChatProviderSettingsModal";
import ErrorDisplay from "@/app/components/ErrorDisplay";
import InputField from "@/app/components/InputField";
import LoadingIndicator from "@/app/components/LoadingIndicator";
import MessageList from "@/app/components/MessageList";
import SearchIcon from "@mui/icons-material/Search";
import type { AgentMessageMetadata, AgentRun } from "@/types/agent";
import type { KnowledgeDocument, KnowledgeSearchResult } from "@/types/knowledge";
import { loadAgentSettings, saveAgentSettings } from "@/lib/agentSettings";
import {
  buildAgentContext,
  buildAgentInstruction,
  createAgentRun,
  attachSearchFailure,
  attachSearchResults,
  failDraftingStep,
  finalizeAgentRun,
  finishDraftingStep,
  getStepByTitle,
  startDraftingStep,
  summarizeAssistantResponse,
  updateAgentRunStep,
  validateAgentOutput,
} from "@/lib/agentRuntime";
import {
  clearAgentRuns,
  loadAgentRuns,
  saveAgentRuns,
} from "@/lib/agentRunStore";
import {
  createChatTransport,
  type ChatProviderConfig,
  loadChatProviderConfig,
  saveChatProviderConfig,
} from "@/lib/chatProviderAdapter";
import {
  getFirstUserMessageText,
  getLastUserMessageText,
  getMessageText,
  hasAssistantResponse,
} from "@/lib/chatMessages";
import {
  getChatMessagesStorageKey,
  readStoredMessages,
} from "@/lib/chatMessageStorage";
import { createLocalChat, getChatScope, updateLocalChat } from "@/lib/chatStore";
import {
  createKnowledgeDocumentsFromFiles,
  deleteKnowledgeDocument,
  loadKnowledgeDocuments,
  searchKnowledgeDocuments,
  upsertKnowledgeDocuments,
} from "@/lib/knowledgeBase";
import { useHydrated } from "@/lib/useHydrated";
import { useMessageSearch } from "@/lib/useMessageSearch";

// message helpers moved to lib/chatMessages

const MAX_DRAFT_PERSIST_RETRIES = 3;
const DRAFT_PERSIST_RETRY_DELAY_MS = 1500;
const DENSITY_STORAGE_KEY = "deepscan:ui-density";
const FEEDBACK_STORAGE_PREFIX = "deepscan:chat-feedback:";
const AGENT_PANEL_COLLAPSED_KEY = "deepscan:agent-panel-collapsed";
const QUICK_PROMPTS = [
  {
    title: "会议纪要",
    description: "把要点整理成结构化纪要",
    prompt: "请把下面会议内容整理成结构化纪要：\n- 目标：\n- 进展：\n- 风险：\n- 下一步：",
  },
  {
    title: "竞品分析",
    description: "快速对比优劣与机会点",
    prompt:
      "请对比以下产品，输出表格并给出差异化机会：\n产品A：\n产品B：\n维度：功能、价格、体验、渠道",
  },
  {
    title: "代码审查",
    description: "列出风险与改进建议",
    prompt:
      "请做一次代码审查，输出严重级别、问题点与建议修复：\n```\n<粘贴代码>\n```",
  },
  {
    title: "方案拆解",
    description: "按里程碑拆解落地路径",
    prompt:
      "请将以下需求拆解为里程碑、关键任务与验收标准：\n需求：",
  },
];

function ChatSession({
  routeChatId,
  draftId,
  initialPrompt,
  initialModel,
  initialMessages,
  chatScope,
}: {
  routeChatId: string;
  draftId?: string;
  initialPrompt?: string;
  initialModel: "deepseek-v3" | "deepseek-r1";
  initialMessages: UIMessage[];
  chatScope: string;
}) {
  const isDraftSession = routeChatId === "new";
  const sessionId = isDraftSession ? `draft:${draftId ?? "default"}` : routeChatId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<"deepseek-v3" | "deepseek-r1">(initialModel);
  const [persistError, setPersistError] = useState("");
  const [persistRetryTick, setPersistRetryTick] = useState(0);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    previousInput: string;
  } | null>(null);
  const [messageMetrics, setMessageMetrics] = useState<
    Record<string, { ttftMs?: number; totalMs?: number; charCount?: number }>
  >({});
  const [providerConfig, setProviderConfig] = useState(() =>
    loadChatProviderConfig()
  );
  const [isProviderSettingsOpen, setIsProviderSettingsOpen] = useState(false);
  const [agentSettings, setAgentSettings] = useState(() =>
    loadAgentSettings()
  );
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  const [isAgentPanelCollapsed, setIsAgentPanelCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AGENT_PANEL_COLLAPSED_KEY) === "1";
  });
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [activeAgentRunId, setActiveAgentRunId] = useState<string | null>(null);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [density, setDensity] = useState<"comfort" | "compact">(() => {
    if (typeof window === "undefined") return "comfort";
    const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
    return stored === "compact" ? "compact" : "comfort";
  });
  const [messageFeedback, setMessageFeedback] = useState<
    Record<string, "up" | "down">
  >({});
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const hasAutoSentInitialRef = useRef(false);
  const draftPersistStateRef = useRef<"idle" | "pending" | "done">("idle");
  const persistRetryCountRef = useRef(0);
  const persistRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestStartRef = useRef<number | null>(null);
  const firstTokenAtRef = useRef<number | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingAgentRunIdRef = useRef<string | null>(null);
  const pendingAgentDraftStepIdRef = useRef<string | null>(null);

  const chatTransport = useMemo(() => createChatTransport(), []);

  const { messages, sendMessage, regenerate, error, status, stop, clearError } =
    useChat({
      id: sessionId,
      transport: chatTransport,
      messages: initialMessages,
      onError: (err) => console.error("Chat error:", err),
    });

  const isLoading = status === "streaming" || status === "submitted";
  const endRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const messageCount = messages?.length ?? 0;
  const isEditing = Boolean(editTarget);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    matchIds: searchMatchIds,
    matchIdSet: searchMatchIdSet,
    activeMatchId,
    activeMatchIndex,
    goPrev: handleSearchPrev,
    goNext: handleSearchNext,
    clear: clearSearch,
    normalizedQuery: normalizedSearchQuery,
  } = useMessageSearch(messages ?? []);
  // Keep search bar visible when there is an active query.
  useEffect(() => {
    if (normalizedSearchQuery) {
      setIsSearchOpen(true);
    }
  }, [normalizedSearchQuery]);
  const lastUserMessageText = useMemo(
    () => getLastUserMessageText(messages ?? []),
    [messages]
  );
  const lastAssistantMessageId = useMemo(() => {
    if (!messages?.length) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (isLoading && requestStartRef.current === null) {
      requestStartRef.current = Date.now();
      firstTokenAtRef.current = null;
      activeAssistantIdRef.current = null;
      knownMessageIdsRef.current = new Set((messages ?? []).map((msg) => msg.id));
    }

    if (!isLoading && requestStartRef.current !== null) {
      const activeId = activeAssistantIdRef.current;
      if (activeId) {
        const message = (messages ?? []).find((msg) => msg.id === activeId);
        if (message) {
          const text = getMessageText(message);
          const totalMs = Date.now() - requestStartRef.current;
          setMessageMetrics((prev) => ({
            ...prev,
            [activeId]: {
              ...prev[activeId],
              totalMs,
              charCount: text.length,
            },
          }));
        }
      }
      requestStartRef.current = null;
      firstTokenAtRef.current = null;
      activeAssistantIdRef.current = null;
    }
  }, [isLoading, messages]);

  useEffect(() => {
    if (!isLoading || !requestStartRef.current) return;

    if (!activeAssistantIdRef.current) {
      const nextAssistant = (messages ?? []).find(
        (msg) =>
          msg.role === "assistant" && !knownMessageIdsRef.current.has(msg.id)
      );
      if (nextAssistant) {
        activeAssistantIdRef.current = nextAssistant.id;
      }
    }

    const activeId = activeAssistantIdRef.current;
    if (!activeId || firstTokenAtRef.current !== null) return;
    const activeMessage = (messages ?? []).find((msg) => msg.id === activeId);
    if (!activeMessage) return;
    if (getMessageText(activeMessage).length === 0) return;

    const now = Date.now();
    firstTokenAtRef.current = now;
    const ttftMs = now - requestStartRef.current;
    setMessageMetrics((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        ttftMs,
      },
    }));
  }, [isLoading, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollToBottom(distanceToBottom > 160);
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) {
        setScrollProgress(100);
        return;
      }
      const progress = Math.min(
        100,
        Math.max(0, (container.scrollTop / maxScroll) * 100)
      );
      setScrollProgress(progress);
    };
    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(
      getChatMessagesStorageKey(sessionId),
      JSON.stringify(messages ?? [])
    );
  }, [sessionId, messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`${FEEDBACK_STORAGE_PREFIX}${sessionId}`);
      if (!raw) {
        setMessageFeedback({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, "up" | "down">;
      if (parsed && typeof parsed === "object") {
        setMessageFeedback(parsed);
      } else {
        setMessageFeedback({});
      }
    } catch {
      setMessageFeedback({});
    }
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      `${FEEDBACK_STORAGE_PREFIX}${sessionId}`,
      JSON.stringify(messageFeedback)
    );
  }, [messageFeedback, sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      AGENT_PANEL_COLLAPSED_KEY,
      isAgentPanelCollapsed ? "1" : "0"
    );
  }, [isAgentPanelCollapsed]);

  useEffect(() => {
    saveAgentSettings(agentSettings);
  }, [agentSettings]);

  useEffect(() => {
    // Keyboard shortcuts for Agent panel toggling.
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      if (event.key === "\\") {
        event.preventDefault();
        setIsAgentPanelCollapsed((prev) => !prev);
        return;
      }

      if (event.key.toLowerCase() === "a" && event.shiftKey) {
        event.preventDefault();
        setIsAgentPanelOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadDocuments = async () => {
      const docs = await loadKnowledgeDocuments();
      if (isActive) {
        setKnowledgeDocs(docs);
      }
    };

    void loadDocuments();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const storedRuns = loadAgentRuns(sessionId);
    setAgentRuns(storedRuns);
    setActiveAgentRunId(storedRuns[0]?.id ?? null);
    pendingAgentRunIdRef.current = null;
    pendingAgentDraftStepIdRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    saveAgentRuns(sessionId, agentRuns);
  }, [agentRuns, sessionId]);

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
    if (!editTarget) return;
    const exists = messages?.some((message) => message.id === editTarget.id);
    if (!exists) {
      setEditTarget(null);
    }
  }, [editTarget, messages]);

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
        const created = await createLocalChat(chatScope, { title, model });
        const newChatId = created?.id;
        if (!newChatId) throw new Error("创建历史会话失败，请重试");

        draftPersistStateRef.current = "done";
        persistRetryCountRef.current = 0;
        setPersistError("");

        const newSessionId = String(newChatId);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            getChatMessagesStorageKey(newSessionId),
            JSON.stringify(messages ?? [])
          );
          localStorage.removeItem(getChatMessagesStorageKey(sessionId));
          // Move draft agent runs along with the chat history.
          const draftRuns = loadAgentRuns(sessionId);
          if (draftRuns.length > 0) {
            saveAgentRuns(newSessionId, draftRuns);
            clearAgentRuns(sessionId);
          }
        }

        await queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
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
    chatScope,
    persistRetryTick,
    queryClient,
    router,
    sessionId,
  ]);

  // Update a single agent run without reordering the list.
  const updateAgentRun = (runId: string, nextRun: AgentRun) => {
    setAgentRuns((prev) =>
      prev.some((run) => run.id === runId)
        ? prev.map((run) => (run.id === runId ? nextRun : run))
        : [nextRun, ...prev]
    );
  };

  const handleToggleAgent = () => {
    setAgentSettings((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  // Import local code files into the knowledge base (pure client-side).
  const handleImportAgentFiles = async (files: FileList) => {
    const docs = await createKnowledgeDocumentsFromFiles(files);
    if (docs.length === 0) return;
    const merged = await upsertKnowledgeDocuments(docs);
    setKnowledgeDocs(merged);
  };

  const handleRemoveAgentDocument = async (id: string) => {
    await deleteKnowledgeDocument(id);
    setKnowledgeDocs((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleClearAgentRuns = () => {
    clearAgentRuns(sessionId);
    setAgentRuns([]);
    setActiveAgentRunId(null);
  };

  const handleAgentSubmit = async (prompt: string) => {
    // Agent 模式下：先创建运行记录，再拼接上下文发送给模型。
    const run = createAgentRun({
      sessionId,
      prompt,
      settings: agentSettings,
    });
    const searchStep = getStepByTitle(run, "本地代码检索");
    const draftingStep = getStepByTitle(run, "生成修改方案");

    if (!searchStep || !draftingStep) {
      return;
    }

    pendingAgentRunIdRef.current = run.id;
    pendingAgentDraftStepIdRef.current = draftingStep.id;

    setAgentRuns((prev) => [run, ...prev]);
    setActiveAgentRunId(run.id);

    let nextRun = run;
    let searchResults: KnowledgeSearchResult[] = [];

    if (knowledgeDocs.length === 0) {
      nextRun = attachSearchFailure(nextRun, searchStep.id, "资料库为空");
    } else {
      searchResults = searchKnowledgeDocuments(
        knowledgeDocs,
        prompt,
        agentSettings.maxSearchResults
      );
      nextRun = attachSearchResults(nextRun, searchStep.id, searchResults);
    }

    nextRun = startDraftingStep(nextRun, draftingStep.id);
    updateAgentRun(run.id, nextRun);

    const context = buildAgentContext({
      docs: knowledgeDocs,
      results: searchResults,
      settings: agentSettings,
    });
    const instruction = buildAgentInstruction(agentSettings);
    const metadata: AgentMessageMetadata = {
      agent: {
        enabled: true,
        runId: run.id,
        context: `${instruction}\n\n${context}`,
        planSummary: run.title,
      },
    };

    sendMessage({ text: prompt, metadata }, { body: { model } });
  };

  useEffect(() => {
    // When streaming ends, close the pending agent run and record a summary.
    const pendingRunId = pendingAgentRunIdRef.current;
    const draftStepId = pendingAgentDraftStepIdRef.current;
    if (!pendingRunId || !draftStepId) return;

    const targetRun = agentRuns.find((run) => run.id === pendingRunId);
    if (!targetRun) return;

    if (error) {
      const reason = error.message || "请求失败";
      const failedRun = failDraftingStep(targetRun, draftStepId, reason);
      const finalized = finalizeAgentRun(failedRun, "failed");
      updateAgentRun(pendingRunId, finalized);
      pendingAgentRunIdRef.current = null;
      pendingAgentDraftStepIdRef.current = null;
      return;
    }

    if (isLoading) return;

    const assistantMessage = (messages ?? []).find(
      (msg) => msg.id === lastAssistantMessageId
    );
    if (!assistantMessage) return;

    const responseText = getMessageText(assistantMessage);
    const validationStep = getStepByTitle(targetRun, "结果验收");
    // Validate structured output to expose missing fields in the Agent panel.
    const validation = validateAgentOutput(responseText);
    const fallbackSummary = summarizeAssistantResponse(responseText);
    const summary =
      validation.ok ? validation.summary : fallbackSummary || validation.summary;

    let nextRun = finishDraftingStep(
      targetRun,
      draftStepId,
      summary || "已生成方案"
    );

    if (validationStep) {
      nextRun = updateAgentRunStep(nextRun, validationStep.id, {
        status: validation.ok ? "success" : "failed",
        endedAt: Date.now(),
        outputSummary: validation.ok ? "结构化输出通过" : "结构化校验失败",
        details: validation.details,
        error: validation.ok ? undefined : validation.issues.join("；"),
      });
    }

    nextRun = finalizeAgentRun(nextRun, validation.ok ? "success" : "failed");
    updateAgentRun(pendingRunId, nextRun);
    pendingAgentRunIdRef.current = null;
    pendingAgentDraftStepIdRef.current = null;
  }, [
    agentRuns,
    error,
    isLoading,
    lastAssistantMessageId,
    messages,
  ]);

  const handleChangeModel = () => {
    const nextModel = model === "deepseek-v3" ? "deepseek-r1" : "deepseek-v3";
    setModel(nextModel);
    // Keep sidebar metadata in sync for non-draft sessions.
    if (!isDraftSession) {
      const numericChatId = Number(routeChatId);
      if (Number.isFinite(numericChatId)) {
        void updateLocalChat(chatScope, numericChatId, { model: nextModel });
        void queryClient.invalidateQueries({ queryKey: ["chats", chatScope] });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setPersistError("");
    persistRetryCountRef.current = 0;
    if (editTarget) {
      sendMessage({ text: input, messageId: editTarget.id }, { body: { model } });
      setEditTarget(null);
    } else {
      if (agentSettings.enabled) {
        void handleAgentSubmit(input);
      } else {
        sendMessage({ text: input }, { body: { model } });
      }
    }
    setInput("");
  };

  const handleRetryLastPrompt = () => {
    if (isLoading || !lastUserMessageText) return;
    setPersistError("");
    persistRetryCountRef.current = 0;
    setEditTarget(null);
    sendMessage({ text: lastUserMessageText }, { body: { model } });
  };

  const handleRegenerateLast = () => {
    if (isLoading || !lastAssistantMessageId || isEditing) return;
    setPersistError("");
    persistRetryCountRef.current = 0;
    regenerate({ messageId: lastAssistantMessageId, body: { model } });
  };

  const handleStartEditMessage = (message: UIMessage) => {
    if (isLoading) return;
    const nextText = getMessageText(message);
    if (!nextText.trim()) return;
    setPersistError("");
    setEditTarget({ id: message.id, previousInput: input });
    setInput(nextText);
  };

  const handleCancelEdit = () => {
    if (!editTarget) return;
    setInput(editTarget.previousInput);
    setEditTarget(null);
  };

  const handleSaveProviderConfig = (nextConfig: ChatProviderConfig) => {
    const normalizedLabel =
      nextConfig.mode === "openai-compatible" ? "direct" : "server";
    const normalizedConfig = {
      ...nextConfig,
      label: normalizedLabel,
    };
    saveChatProviderConfig(normalizedConfig);
    setProviderConfig(normalizedConfig);
    setIsProviderSettingsOpen(false);
  };

  const providerLabel =
    providerConfig.label ??
    (providerConfig.mode === "openai-compatible" ? "direct" : "server");
  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };
  const handleClearSearch = () => {
    // Clear query and collapse to save space.
    clearSearch();
    setIsSearchOpen(false);
  };
  const handleFeedback = (messageId: string, value: "up" | "down") => {
    setMessageFeedback((prev) => {
      const current = prev[messageId];
      if (current === value) {
        const { [messageId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [messageId]: value };
    });
  };
  const handleToggleDensity = () => {
    setDensity((prev) => (prev === "compact" ? "comfort" : "compact"));
  };

  const handleToggleAgentPanelCollapsed = () => {
    setIsAgentPanelCollapsed((prev) => !prev);
  };

  const agentPanelProps = {
    enabled: agentSettings.enabled,
    onToggleEnabled: handleToggleAgent,
    settings: agentSettings,
    onSaveSettings: setAgentSettings,
    runs: agentRuns,
    activeRunId: activeAgentRunId,
    onSelectRun: setActiveAgentRunId,
    onClearRuns: handleClearAgentRuns,
    documents: knowledgeDocs,
    onImportFiles: handleImportAgentFiles,
    onRemoveDocument: handleRemoveAgentDocument,
    onToggleCollapsed: handleToggleAgentPanelCollapsed,
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          status={isLoading ? "loading" : "idle"}
          model={model}
          onModelToggle={handleChangeModel}
          agentEnabled={agentSettings.enabled}
          onAgentToggle={handleToggleAgent}
          onOpenAgentPanel={() => setIsAgentPanelOpen(true)}
          density={density}
          onDensityToggle={handleToggleDensity}
          onOpenSettings={() => setIsProviderSettingsOpen(true)}
          providerLabel={providerLabel}
        />
        <div className="flex flex-1 flex-col items-center overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="flex w-full max-w-4xl flex-1 flex-col gap-4 overflow-auto px-4 py-4 md:px-6"
          >
            {error && <ErrorDisplay error={error} onDismiss={clearError} />}
            {persistError ? <ErrorDisplay error={persistError} /> : null}
            <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200/60 bg-slate-50/80 px-4 py-2 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 md:-mx-6 md:px-6 relative">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-slate-200/70 dark:bg-slate-700/70">
                <div
                  className="h-full bg-blue-500 transition-[width]"
                  style={{ width: `${scrollProgress}%` }}
                  aria-hidden
                />
              </div>
              <div className="flex flex-col gap-2">
                {isSearchOpen ? (
                  <ChatMessageSearchBar
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    matchCount={searchMatchIds.length}
                    activeIndex={activeMatchIndex}
                    onPrev={handleSearchPrev}
                    onNext={handleSearchNext}
                    onClear={handleClearSearch}
                    hasQuery={Boolean(normalizedSearchQuery)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <SearchIcon fontSize="small" className="text-slate-400" />
                    搜索当前会话
                  </button>
                )}
                <ChatInsightsBar messages={messages ?? []} isLoading={isLoading} />
              </div>
            </div>
            {messages?.length === 0 && !error ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-500 dark:text-slate-400">
                <p className="text-sm">开始新对话</p>
                <p className="text-xs">发送一条消息与 AI 助手聊天</p>
                <div className="mt-4 w-full max-w-2xl">
                  <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    快速开始
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {QUICK_PROMPTS.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => handleQuickPrompt(item.prompt)}
                        className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                      >
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <MessageList
                messages={messages ?? []}
                onEditMessage={handleStartEditMessage}
                editingMessageId={editTarget?.id ?? null}
                highlightedMessageIds={searchMatchIdSet}
                activeMessageId={activeMatchId}
                messageMetrics={messageMetrics}
                highlightQuery={normalizedSearchQuery}
                density={density}
                messageFeedback={messageFeedback}
                onFeedback={handleFeedback}
              />
            )}
            {isLoading && (
              <div className="flex justify-start">
                <LoadingIndicator />
              </div>
            )}
            <div ref={endRef} className="h-4" />
          </div>
          {showScrollToBottom ? (
            <div className="w-full max-w-4xl px-4 pb-2 md:px-6">
              <button
                type="button"
                onClick={() =>
                  endRef.current?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                回到底部
              </button>
            </div>
          ) : null}
          <div className="w-full max-w-4xl shrink-0 px-4 pb-4 md:px-6">
            {isEditing ? (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-700/70 dark:bg-blue-900/30 dark:text-blue-200">
                <span>正在编辑消息，提交后会重新生成后续回答。</span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-md border border-blue-300 px-2 py-1 text-xs text-blue-700 transition hover:bg-blue-100 dark:border-blue-600 dark:text-blue-200 dark:hover:bg-blue-900/60"
                >
                  取消编辑
                </button>
              </div>
            ) : null}
            <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleRegenerateLast}
                disabled={isLoading || isEditing || !lastAssistantMessageId}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                重新生成
              </button>
              <button
                type="button"
                onClick={handleRetryLastPrompt}
                disabled={isLoading || !lastUserMessageText}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                重试上一问
              </button>
            </div>
            <InputField
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onStop={stop}
              placeholder={
                isEditing
                  ? "编辑后按 Enter 重新发送…"
                  : agentSettings.enabled
                    ? "描述你要改动的代码目标…"
                    : "输入消息…"
              }
              textareaRef={inputRef}
            />
          </div>
        </div>
        {isProviderSettingsOpen ? (
          <ChatProviderSettingsModal
            config={providerConfig}
            onClose={() => setIsProviderSettingsOpen(false)}
            onSave={handleSaveProviderConfig}
          />
        ) : null}
      </div>
      <aside className="hidden shrink-0 border-l border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/80 lg:flex">
        {isAgentPanelCollapsed ? (
          <div className="flex w-12 flex-col items-center justify-center gap-3 p-2">
            <button
              type="button"
              onClick={handleToggleAgentPanelCollapsed}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              展开
            </button>
            <span className="text-[10px] text-slate-400">Agent</span>
          </div>
        ) : (
          <div className="w-80 p-4">
            <AgentPanel {...agentPanelProps} />
          </div>
        )}
      </aside>
      {isAgentPanelOpen ? (
        <AgentPanel
          {...agentPanelProps}
          isOverlay
          onClose={() => setIsAgentPanelOpen(false)}
        />
      ) : null}
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
  const isHydrated = useHydrated();
  const { userId } = useAuth();
  const chatScope = getChatScope(userId);
  const isDraftSession = routeChatId === "new";
  const sessionId = isDraftSession ? `draft:${draftId ?? "default"}` : routeChatId;
  const initialMessages = useMemo(() => {
    if (!isHydrated) return [];
    return readStoredMessages(sessionId);
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
