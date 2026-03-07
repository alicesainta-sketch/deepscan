import type { AgentAdapter } from "./adapter";
import {
  DEFAULT_MOCK_MODE,
  getAgentAdapterMode,
  getAgentApiBaseUrl,
  getAgentToolName,
  type AgentAdapterMode,
} from "./config";
import { HttpAgentAdapter } from "./httpAdapter";
import { MockAgentAdapter, type MockAdapterMode } from "./mockAdapter";

type CreateAgentAdapterOptions = {
  mockMode?: MockAdapterMode;
  mockDelayMs?: number;
  httpBaseUrl?: string;
  toolName?: string;
};

export type ResolvedAgentAdapter = {
  mode: AgentAdapterMode;
  adapter: AgentAdapter;
  metadata: {
    baseUrl?: string;
    toolName?: string;
  };
};

/**
 * 统一创建 adapter，确保运行层不直接依赖具体实现。
 */
export const createAgentAdapter = (
  options: CreateAgentAdapterOptions = {}
): ResolvedAgentAdapter => {
  const mode = getAgentAdapterMode();
  if (mode === "http") {
    const baseUrl = options.httpBaseUrl ?? getAgentApiBaseUrl();
    const toolName = options.toolName ?? getAgentToolName();
    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_AGENT_API_BASE_URL for http adapter");
    }

    return {
      mode: "http",
      adapter: new HttpAgentAdapter({ baseUrl, toolName }),
      metadata: { baseUrl, toolName },
    };
  }

  return {
    mode: "mock",
    adapter: new MockAgentAdapter({
      mode: options.mockMode ?? DEFAULT_MOCK_MODE,
      delayMs: options.mockDelayMs,
    }),
    metadata: {},
  };
};
