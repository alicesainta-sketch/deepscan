import {
  isAgentAdapterError,
  type AgentAdapter,
} from "./adapter";
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
  signal?: AbortSignal;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timer);
      reject(buildCancelledError());
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
const TOOL_TIMEOUT_MESSAGE = "TOOL_TIMEOUT";
const RUN_CANCELLED_MESSAGE = "AGENT_RUN_CANCELLED";

const buildTimeoutError = () => new Error(TOOL_TIMEOUT_MESSAGE);
const buildCancelledError = () => new Error(RUN_CANCELLED_MESSAGE);

const isCancelledError = (error: unknown) =>
  (error instanceof DOMException && error.name === "AbortError") ||
  (error instanceof Error &&
    (error.message === RUN_CANCELLED_MESSAGE || error.name === "AbortError"));

const getRetryDelay = (baseDelayMs: number, attempt: number) => {
  if (baseDelayMs <= 0) return 0;
  return Math.min(baseDelayMs * 2 ** Math.max(0, attempt - 1), 2_000);
};

const withTimeout = async <T>(
  task: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(buildTimeoutError()), timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      cleanup();
      reject(buildCancelledError());
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener("abort", handleAbort, { once: true });

    task
      .then((value) => {
        cleanup();
        resolve(value);
      })
      .catch((error) => {
        cleanup();
        reject(error);
      });
  });
};

const normalizeError = (error: unknown): AgentError => {
  if (error instanceof Error && error.message === TOOL_TIMEOUT_MESSAGE) {
    return {
      code: "TOOL_TIMEOUT",
      message: "tool call timeout",
      retryable: false,
    };
  }

  if (isAgentAdapterError(error)) {
    return {
      code: error.code ?? "UPSTREAM_ERROR",
      message: error.message,
      retryable: error.retryable ?? true,
      details: error.details,
    };
  }

  return {
    code: "UPSTREAM_ERROR",
    message: error instanceof Error ? error.message : "upstream call failed",
    retryable: true,
    details: error,
  };
};

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
  dispatch({ type: "APPEND_EVENT", event: { type: "run.queued", at: Date.now() } });
  dispatch({ type: "START_RUN" });
  dispatch({ type: "APPEND_EVENT", event: { type: "run.started", at: Date.now() } });

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    if (params.signal?.aborted) {
      dispatch({ type: "CANCEL_RUN" });
      dispatch({ type: "APPEND_EVENT", event: { type: "run.cancelled", at: Date.now() } });
      return state;
    }

    dispatch({ type: "START_STEP", stepId, attempt });
    dispatch({
      type: "APPEND_EVENT",
      event: {
        type: "step.started",
        at: Date.now(),
        payload: { step_id: stepId, attempt },
      },
    });
    dispatch({
      type: "APPEND_EVENT",
      event: {
        type: "tool.call.requested",
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
          signal: params.signal,
        }),
        timeoutMs,
        params.signal
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
      dispatch({
        type: "APPEND_EVENT",
        event: {
          type: "step.completed",
          at: Date.now(),
          payload: { step_id: stepId, attempt },
        },
      });
      dispatch({ type: "COMPLETE_RUN" });
      dispatch({ type: "APPEND_EVENT", event: { type: "run.succeeded", at: Date.now() } });
      return state;
    } catch (error) {
      if (isCancelledError(error)) {
        dispatch({ type: "CANCEL_RUN" });
        dispatch({
          type: "APPEND_EVENT",
          event: {
            type: "run.cancelled",
            at: Date.now(),
            payload: { step_id: stepId, attempt },
          },
        });
        return state;
      }

      const normalized = normalizeError(error);
      dispatch({ type: "FAIL_STEP", stepId, error: normalized });
      dispatch({
        type: "APPEND_EVENT",
        event: {
          type: "step.failed",
          at: Date.now(),
          payload: { step_id: stepId, attempt, code: normalized.code },
        },
      });

      const isLastAttempt = attempt > maxRetries;
      const shouldRetry = normalized.retryable && !isLastAttempt;

      if (shouldRetry) {
        const delayMs = getRetryDelay(retryDelayMs, attempt);
        dispatch({
          type: "APPEND_EVENT",
          event: {
            type: "retry.scheduled",
            at: Date.now(),
            payload: { step_id: stepId, attempt, delay_ms: delayMs },
          },
        });
        await sleep(delayMs, params.signal);
        continue;
      }

      const finalError: AgentError =
        normalized.code === "TOOL_TIMEOUT" || normalized.retryable === false
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
