import {
  type AdapterContext,
  type AdapterResult,
  type AgentAdapter,
  AgentAdapterError,
} from "./adapter";
import type { AgentErrorCode } from "./types";

type HttpAgentAdapterOptions = {
  baseUrl: string;
  toolName: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
};

type ErrorPayload = {
  error?: {
    code?: AgentErrorCode;
    message?: string;
    retryable?: boolean;
    details?: unknown;
  };
};

type SuccessPayload = {
  summary?: string;
  output?: unknown;
  data?: {
    summary?: string;
    output?: unknown;
  };
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeSuccessPayload = (payload: unknown): AdapterResult => {
  if (!payload || typeof payload !== "object") {
    return { summary: "remote tool call completed" };
  }

  const parsed = payload as SuccessPayload;
  const summary = parsed.summary ?? parsed.data?.summary ?? "remote tool call completed";
  const output = parsed.output ?? parsed.data?.output;

  return { summary, output };
};

const normalizeErrorPayload = (
  payload: unknown,
  status: number,
): {
  code: AgentErrorCode;
  message: string;
  retryable: boolean;
  details?: unknown;
} => {
  if (payload && typeof payload === "object") {
    const parsed = payload as ErrorPayload;
    if (parsed.error?.message) {
      return {
        code: parsed.error.code ?? "UPSTREAM_ERROR",
        message: parsed.error.message,
        retryable: parsed.error.retryable ?? status >= 500,
        details: parsed.error.details,
      };
    }
  }
  return {
    code: "UPSTREAM_ERROR",
    message: `remote tool call failed with status ${status}`,
    retryable: status >= 500,
    details: payload,
  };
};

export class HttpAgentAdapter implements AgentAdapter {
  private readonly baseUrl: string;
  private readonly toolName: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpAgentAdapterOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.toolName = options.toolName;
    this.headers = options.headers ?? {};
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async invokeTool(ctx: AdapterContext): Promise<AdapterResult> {
    const endpoint = `${this.baseUrl}/v1/mcp/tools/${encodeURIComponent(this.toolName)}/invoke`;
    const requestBody = {
      run_id: ctx.run_id,
      step_id: ctx.step_id,
      arguments: {
        input: ctx.input,
        session_id: ctx.session_id,
        attempt: ctx.attempt,
        timeout_ms: ctx.timeout_ms,
      },
    };

    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
      body: JSON.stringify(requestBody),
      signal: ctx.signal,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const normalizedError = normalizeErrorPayload(payload, response.status);
      throw new AgentAdapterError(normalizedError);
    }

    return normalizeSuccessPayload(payload);
  }
}
