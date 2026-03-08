import { createAgentAdapter } from "./createAdapter";
import type { AgentPipelineContext } from "./pipelineContext";
import { runAgent } from "./runner";
import type { AgentRunState } from "./types";

type RunAgentPipelineParams = {
  sessionId: string;
  input: string;
};

export type AgentPipelineResult = {
  context: AgentPipelineContext | null;
  state: AgentRunState | null;
  degraded: boolean;
  reason?: string;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 20;

/**
 * 运行聊天前置 Agent 流程，失败时降级为直接对话，避免阻断主链路。
 */
export const runAgentPipelineForChat = async (
  params: RunAgentPipelineParams
): Promise<AgentPipelineResult> => {
  const startedAt = performance.now();

  try {
    const resolvedAdapter = createAgentAdapter({ mockDelayMs: 0 });
    const runState = await runAgent({
      runId: `run_chat_${Date.now()}`,
      sessionId: params.sessionId,
      input: params.input,
      adapter: resolvedAdapter.adapter,
      maxRetries: DEFAULT_MAX_RETRIES,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      retryDelayMs: DEFAULT_RETRY_DELAY_MS,
    });

    const firstStep = runState.steps[0];
    const context: AgentPipelineContext = {
      runId: runState.id,
      status: runState.status,
      summary: firstStep?.summary ?? "agent completed",
      attempts: firstStep?.attempt ?? 0,
      durationMs: Math.round(performance.now() - startedAt),
      adapterMode: resolvedAdapter.mode,
      errorCode: runState.lastError?.code,
    };

    return {
      context,
      state: runState,
      degraded: runState.status !== "succeeded",
      reason:
        runState.status === "succeeded"
          ? undefined
          : runState.lastError?.message ?? "agent run failed",
    };
  } catch (error) {
    return {
      context: null,
      state: null,
      degraded: true,
      reason: error instanceof Error ? error.message : "agent pipeline unavailable",
    };
  }
};
