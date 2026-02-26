import type { AgentRunStatus } from "@/types/agent";

const AGENT_SETTINGS_KEY = "deepscan:agent-settings:v1";

export type AgentAnswerStyle = "concise" | "balanced" | "detailed";

export type AgentSettings = {
  enabled: boolean;
  maxSearchResults: number;
  includeFileOutline: boolean;
  answerStyle: AgentAnswerStyle;
};

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  enabled: false,
  maxSearchResults: 4,
  includeFileOutline: true,
  answerStyle: "balanced",
};

const normalizeAnswerStyle = (value: unknown): AgentAnswerStyle => {
  if (value === "concise" || value === "detailed" || value === "balanced") {
    return value;
  }
  return DEFAULT_AGENT_SETTINGS.answerStyle;
};

const clampNumber = (value: unknown, min: number, max: number) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
};

// Normalize settings to avoid invalid persisted values breaking the UI.
export const normalizeAgentSettings = (
  value: Partial<AgentSettings> | null
): AgentSettings => {
  return {
    enabled: Boolean(value?.enabled),
    maxSearchResults: clampNumber(value?.maxSearchResults, 1, 8),
    includeFileOutline:
      typeof value?.includeFileOutline === "boolean"
        ? value.includeFileOutline
        : DEFAULT_AGENT_SETTINGS.includeFileOutline,
    answerStyle: normalizeAnswerStyle(value?.answerStyle),
  };
};

export const loadAgentSettings = (): AgentSettings => {
  if (typeof window === "undefined") return DEFAULT_AGENT_SETTINGS;
  try {
    const raw = localStorage.getItem(AGENT_SETTINGS_KEY);
    if (!raw) return DEFAULT_AGENT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AgentSettings>;
    return normalizeAgentSettings(parsed);
  } catch {
    return DEFAULT_AGENT_SETTINGS;
  }
};

export const saveAgentSettings = (settings: AgentSettings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENT_SETTINGS_KEY, JSON.stringify(settings));
};

export const getAgentRunStatusLabel = (status: AgentRunStatus) => {
  if (status === "success") return "完成";
  if (status === "failed") return "失败";
  if (status === "running") return "运行中";
  return "等待中";
};
