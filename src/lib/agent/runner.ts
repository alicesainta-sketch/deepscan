import type { AgentAdapter } from "./adapter";
import { createInitialRunState, transitionRunState } from "./stateMachine";
import type { AgentError, AgentRunState } from "./types";

type RunParams = {
  runId: string;
  sessionId: string;
  input: string;
  adapter: AgentAdapter;
  maxRetries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(task: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TOOL_TIMEOUT")), timeoutMs);
    task
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

/**
 * 将任意异常收敛为统一错误模型，简化状态机消费。
 */
const normalizeError = (error: unknown): AgentError => {
  if (error instanceof Error && error.message === "TOOL_TIMEOUT") {
    return {
      code: "TOOL_TIMEOUT",
      message: "tool call timeout",
      retryable: false,
    };
  }

  return {
    code: "UPSTREAM_ERROR",
    message: error instanceof Error ? error.message : "upstream call failed",
    retryable: true,
    details: error,
  };
};

/**
 * 运行单步 Agent 流程（MVP）：只执行一个 tool_call 步骤，并处理重试。
 */
export const runAgent = async (params: RunParams): Promise<AgentRunState> => {
  const maxRetries = params.maxRetries ?? 0;
  const timeoutMs = params.timeoutMs ?? 10_000;
  const retryDelayMs = params.retryDelayMs ?? 10;
  let state = createInitialRunState({
    runId: params.runId,
    sessionId: params.sessionId,
    input: params.input,
    maxRetries,
    timeoutMs,
  });

  const stepId = state.steps[0].id;
  const dispatch = (action: Parameters<typeof transitionRunState>[1]) => {
    state = transitionRunState(state, action);
  };

  dispatch({ type: "QUEUE" });
  dispatch({ type: "START_RUN" });
  dispatch({ type: "APPEND_EVENT", event: { type: "run.started", at: Date.now() } });

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    dispatch({ type: "START_STEP", stepId, attempt });
    dispatch({
      type: "APPEND_EVENT",
      event: {
        type: "step.started",
        at: Date.now(),
        payload: { step_id: stepId, attempt },
      },
    });

    try {
      const result = await withTimeout(
        params.adapter.invokeTool({
          run_id: params.runId,
          session_id: params.sessionId,
          step_id: stepId,
          input: params.input,
          attempt,
          timeout_ms: timeoutMs,
        }),
        timeoutMs
      );

      dispatch({ type: "COMPLETE_STEP", stepId, summary: result.summary });
      dispatch({
        type: "APPEND_EVENT",
        event: {
          type: "tool.call.completed",
          at: Date.now(),
          payload: { step_id: stepId, attempt },
        },
      });
      dispatch({ type: "COMPLETE_RUN" });
      dispatch({ type: "APPEND_EVENT", event: { type: "run.succeeded", at: Date.now() } });
      return state;
    } catch (error) {
      const normalized = normalizeError(error);
      dispatch({ type: "FAIL_STEP", stepId, error: normalized });

      const isLastAttempt = attempt > maxRetries;
      const shouldRetry = normalized.retryable && !isLastAttempt;

      if (shouldRetry) {
        await sleep(retryDelayMs);
        continue;
      }

      const finalError: AgentError =
        normalized.code === "TOOL_TIMEOUT"
          ? normalized
          : {
              code: "TOOL_RETRY_EXHAUSTED",
              message: "tool retry exhausted",
              retryable: false,
              details: {
                last_error: normalized,
              },
            };

      dispatch({ type: "FAIL_RUN", error: finalError });
      dispatch({
        type: "APPEND_EVENT",
        event: {
          type: "run.failed",
          at: Date.now(),
          payload: { code: finalError.code },
        },
      });
      return state;
    }
  }

  return state;
};
