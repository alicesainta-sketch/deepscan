export type AgentRunStatus =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type AgentStepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export type AgentErrorCode =
  | "TOOL_TIMEOUT"
  | "TOOL_RETRY_EXHAUSTED"
  | "UPSTREAM_ERROR"
  | "INVALID_STATE";

export type AgentError = {
  code: AgentErrorCode;
  message: string;
  retryable: boolean;
  details?: unknown;
};

export type AgentStep = {
  id: string;
  name: string;
  status: AgentStepStatus;
  attempt: number;
  summary?: string;
  error?: AgentError;
  startedAt?: number;
  endedAt?: number;
};

export type AgentEvent = {
  type: string;
  at: number;
  payload?: Record<string, unknown>;
};

export type AgentRunState = {
  id: string;
  sessionId: string;
  input: string;
  status: AgentRunStatus;
  steps: AgentStep[];
  maxRetries: number;
  timeoutMs: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  endedAt?: number;
  lastError?: AgentError;
  events: AgentEvent[];
};
