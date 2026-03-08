import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { AgentPipelineContext } from "@/lib/agent/pipelineContext";
import { normalizeChatModel, type SupportedChatModel } from "./models";

type ChatGatewayConfig = {
  apiKey: string;
  baseURL: string;
};

type ChatGatewayEnv = {
  DEEPSEEK_API_KEY?: string;
  BASE_URL?: string;
};

export type NormalizedChatPayload = {
  messages: UIMessage[];
  model: SupportedChatModel;
  agentContext: AgentPipelineContext | null;
};

const BASE_SYSTEM_PROMPT = "You are a helpful assistant.";

/**
 * 从环境变量读取网关配置，统一收敛错误出口。
 */
export const resolveChatGatewayConfig = (
  env?: ChatGatewayEnv
): ChatGatewayConfig => {
  const resolvedEnv = env ?? (process.env as unknown as ChatGatewayEnv);
  const apiKey = resolvedEnv.DEEPSEEK_API_KEY?.trim();
  const baseURL = resolvedEnv.BASE_URL?.trim();
  if (!apiKey || !baseURL) {
    throw new Error("Missing DEEPSEEK_API_KEY or BASE_URL");
  }
  return { apiKey, baseURL };
};

const parseAgentContext = (raw: unknown): AgentPipelineContext | null => {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<AgentPipelineContext>;
  if (
    typeof candidate.runId !== "string" ||
    typeof candidate.status !== "string" ||
    typeof candidate.summary !== "string" ||
    typeof candidate.attempts !== "number" ||
    typeof candidate.durationMs !== "number" ||
    (candidate.adapterMode !== "mock" && candidate.adapterMode !== "http")
  ) {
    return null;
  }

  return {
    runId: candidate.runId,
    status: candidate.status,
    summary: candidate.summary,
    attempts: candidate.attempts,
    durationMs: candidate.durationMs,
    adapterMode: candidate.adapterMode,
    errorCode: candidate.errorCode,
  };
};

/**
 * 将请求体规范化为统一结构，避免 route 中散落校验逻辑。
 */
export const normalizeChatPayload = (body: unknown): NormalizedChatPayload => {
  const payload =
    body && typeof body === "object"
      ? (body as { messages?: unknown; model?: unknown; agentContext?: unknown })
      : {};

  return {
    messages: Array.isArray(payload.messages)
      ? (payload.messages as UIMessage[])
      : [],
    model: normalizeChatModel(payload.model),
    agentContext: parseAgentContext(payload.agentContext),
  };
};

/**
 * 在不破坏原始系统提示的前提下，附加 Agent 运行摘要以保持上下文连续。
 */
export const buildSystemPrompt = (
  agentContext: AgentPipelineContext | null
): string => {
  if (!agentContext) {
    return BASE_SYSTEM_PROMPT;
  }

  const pipelineSummary = [
    "Agent Pipeline Context:",
    `- run_id: ${agentContext.runId}`,
    `- status: ${agentContext.status}`,
    `- attempts: ${agentContext.attempts}`,
    `- duration_ms: ${agentContext.durationMs}`,
    `- adapter_mode: ${agentContext.adapterMode}`,
    `- summary: ${agentContext.summary}`,
    agentContext.errorCode ? `- error_code: ${agentContext.errorCode}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${BASE_SYSTEM_PROMPT}\n\n${pipelineSummary}`;
};

/**
 * 统一执行 OpenAI-compatible 流式调用，供 API route 复用。
 */
export const streamChatWithGateway = async (
  payload: NormalizedChatPayload,
  config?: ChatGatewayConfig
) => {
  const { apiKey, baseURL } = config ?? resolveChatGatewayConfig();
  const provider = createOpenAICompatible({
    apiKey,
    baseURL,
    name: "deepseek",
  });

  return streamText({
    model: provider(payload.model),
    system: buildSystemPrompt(payload.agentContext),
    messages: await convertToModelMessages(payload.messages),
  });
};
