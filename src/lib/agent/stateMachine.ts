import type { AgentError, AgentEvent, AgentRunState, AgentStep } from "./types";

type AgentAction =
  | { type: "QUEUE" }
  | { type: "START_RUN" }
  | { type: "START_STEP"; stepId: string; attempt: number }
  | { type: "COMPLETE_STEP"; stepId: string; summary: string }
  | { type: "FAIL_STEP"; stepId: string; error: AgentError }
  | { type: "COMPLETE_RUN" }
  | { type: "FAIL_RUN"; error: AgentError }
  | { type: "CANCEL_RUN" }
  | { type: "APPEND_EVENT"; event: AgentEvent };

const RUN_TRANSITIONS: Record<AgentRunState["status"], AgentRunState["status"][]> = {
  idle: ["queued"],
  queued: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

/**
 * 初始化 run 状态，MVP 默认只挂一个工具步骤。
 */
export const createInitialRunState = (params: {
  runId: string;
  sessionId: string;
  input: string;
  maxRetries: number;
  timeoutMs: number;
}): AgentRunState => {
  const now = Date.now();
  const step: AgentStep = {
    id: "step_tool_call",
    name: "tool_call",
    status: "pending",
    attempt: 0,
  };

  return {
    id: params.runId,
    sessionId: params.sessionId,
    input: params.input,
    status: "idle",
    steps: [step],
    maxRetries: params.maxRetries,
    timeoutMs: params.timeoutMs,
    createdAt: now,
    updatedAt: now,
    events: [],
  };
};

const assertRunTransition = (
  current: AgentRunState["status"],
  next: AgentRunState["status"]
) => {
  const allowed = RUN_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`Invalid run transition: ${current} -> ${next}`);
  }
};

const updateStep = (
  state: AgentRunState,
  stepId: string,
  updater: (step: AgentStep) => AgentStep
) => {
  return state.steps.map((step) => (step.id === stepId ? updater(step) : step));
};

/**
 * 纯函数 reducer：只负责状态迁移，不执行副作用。
 */
export const transitionRunState = (
  state: AgentRunState,
  action: AgentAction
): AgentRunState => {
  const now = Date.now();

  switch (action.type) {
    case "QUEUE": {
      assertRunTransition(state.status, "queued");
      return { ...state, status: "queued", updatedAt: now };
    }
    case "START_RUN": {
      assertRunTransition(state.status, "running");
      return {
        ...state,
        status: "running",
        startedAt: state.startedAt ?? now,
        updatedAt: now,
      };
    }
    case "START_STEP": {
      return {
        ...state,
        steps: updateStep(state, action.stepId, (step) => ({
          ...step,
          status: "running",
          attempt: action.attempt,
          error: undefined,
          summary: undefined,
          startedAt: now,
          endedAt: undefined,
        })),
        updatedAt: now,
      };
    }
    case "COMPLETE_STEP": {
      return {
        ...state,
        steps: updateStep(state, action.stepId, (step) => ({
          ...step,
          status: "succeeded",
          summary: action.summary,
          endedAt: now,
        })),
        updatedAt: now,
      };
    }
    case "FAIL_STEP": {
      return {
        ...state,
        steps: updateStep(state, action.stepId, (step) => ({
          ...step,
          status: "failed",
          error: action.error,
          endedAt: now,
        })),
        updatedAt: now,
      };
    }
    case "COMPLETE_RUN": {
      assertRunTransition(state.status, "succeeded");
      return { ...state, status: "succeeded", endedAt: now, updatedAt: now };
    }
    case "FAIL_RUN": {
      assertRunTransition(state.status, "failed");
      return {
        ...state,
        status: "failed",
        lastError: action.error,
        endedAt: now,
        updatedAt: now,
      };
    }
    case "CANCEL_RUN": {
      assertRunTransition(state.status, "cancelled");
      return { ...state, status: "cancelled", endedAt: now, updatedAt: now };
    }
    case "APPEND_EVENT": {
      return {
        ...state,
        events: [...state.events, action.event],
        updatedAt: action.event.at,
      };
    }
    default:
      return state;
  }
};
