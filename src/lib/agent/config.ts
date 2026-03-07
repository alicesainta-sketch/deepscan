import type { MockAdapterMode } from "./mockAdapter";

export type AgentAdapterMode = "mock" | "http";

export const DEFAULT_AGENT_ADAPTER_MODE: AgentAdapterMode = "mock";
export const DEFAULT_AGENT_TOOL_NAME = "deepscan.search";
export const DEFAULT_MOCK_MODE: MockAdapterMode = "success";

/**
 * 读取前端 adapter 运行模式。
 * - mock：本地演示与开发
 * - http：对接后端接口联调
 */
export const getAgentAdapterMode = (): AgentAdapterMode => {
  const raw = process.env.NEXT_PUBLIC_AGENT_ADAPTER?.trim().toLowerCase();
  return raw === "http" ? "http" : DEFAULT_AGENT_ADAPTER_MODE;
};

/**
 * 返回 Agent HTTP 基础地址（可为空，调用方负责校验）。
 */
export const getAgentApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_AGENT_API_BASE_URL?.trim() ?? "";
};

/**
 * 返回工具名，未配置时使用默认工具占位名。
 */
export const getAgentToolName = () => {
  const configured = process.env.NEXT_PUBLIC_AGENT_TOOL_NAME?.trim();
  return configured || DEFAULT_AGENT_TOOL_NAME;
};
