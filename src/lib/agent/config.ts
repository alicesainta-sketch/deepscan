import type { MockAdapterMode } from "./mockAdapter";

export type AgentAdapterMode = "mock" | "http";

export const DEFAULT_AGENT_ADAPTER_MODE: AgentAdapterMode = "mock";
export const DEFAULT_AGENT_TOOL_NAME = "deepscan.search";
export const DEFAULT_MOCK_MODE: MockAdapterMode = "success";

export const getAgentAdapterMode = (): AgentAdapterMode => {
  const raw = process.env.NEXT_PUBLIC_AGENT_ADAPTER?.trim().toLowerCase();
  return raw === "http" ? "http" : DEFAULT_AGENT_ADAPTER_MODE;
};

export const getAgentApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_AGENT_API_BASE_URL?.trim() ?? "";
};

export const getAgentToolName = () => {
  const configured = process.env.NEXT_PUBLIC_AGENT_TOOL_NAME?.trim();
  return configured || DEFAULT_AGENT_TOOL_NAME;
};
