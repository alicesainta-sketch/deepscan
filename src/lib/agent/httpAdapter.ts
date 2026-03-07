import type { AdapterContext, AdapterResult, AgentAdapter } from "./adapter";

type HttpAgentAdapterOptions = {
  baseUrl: string;
  toolName: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
};

type ErrorPayload = {
  error?: {
    message?: string;
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

/**
 * 将远端响应统一映射为 adapter 标准输出，避免上层感知后端返回细节。
 */
const normalizeSuccessPayload = (payload: unknown): AdapterResult => {
  if (!payload || typeof payload !== "object") {
    return { summary: "remote tool call completed" };
  }

  const parsed = payload as SuccessPayload;
  const summary = parsed.summary ?? parsed.data?.summary ?? "remote tool call completed";
  const output = parsed.output ?? parsed.data?.output;

  return { summary, output };
};

const normalizeErrorMessage = (payload: unknown, status: number) => {
  if (payload && typeof payload === "object") {
    const parsed = payload as ErrorPayload;
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  }
  return `remote tool call failed with status ${status}`;
};

/**
 * HTTP 适配器：对接 `/v1/mcp/tools/{tool_name}/invoke`。
 */
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
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(normalizeErrorMessage(payload, response.status));
    }

    return normalizeSuccessPayload(payload);
  }
}
