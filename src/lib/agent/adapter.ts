import type { AgentErrorCode } from "./types";

export type AdapterResult = {
  summary: string;
  output?: unknown;
};

export type AgentAdapterErrorOptions = {
  code?: AgentErrorCode;
  message: string;
  retryable?: boolean;
  details?: unknown;
};

export type AdapterContext = {
  run_id: string;
  session_id: string;
  step_id: string;
  input: string;
  attempt: number;
  timeout_ms: number;
  signal?: AbortSignal;
};

export interface AgentAdapter {
  invokeTool(ctx: AdapterContext): Promise<AdapterResult>;
}

export class AgentAdapterError extends Error {
  code?: AgentErrorCode;
  retryable?: boolean;
  details?: unknown;

  constructor(options: AgentAdapterErrorOptions) {
    super(options.message);
    this.name = "AgentAdapterError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.details = options.details;
  }
}

export const isAgentAdapterError = (error: unknown): error is AgentAdapterError => {
  return error instanceof AgentAdapterError;
};
