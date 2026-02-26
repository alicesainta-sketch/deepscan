import type { AgentRun } from "@/types/agent";

const AGENT_RUN_STORE_PREFIX = "deepscan:agent-runs:";
const AGENT_RUN_STORE_VERSION = 1;

type AgentRunStorePayload = {
  version: number;
  runs: AgentRun[];
};

const getStoreKey = (sessionId: string) =>
  `${AGENT_RUN_STORE_PREFIX}${sessionId}`;

const getDefaultStore = (): AgentRunStorePayload => ({
  version: AGENT_RUN_STORE_VERSION,
  runs: [],
});

// Load agent runs scoped to a single chat session.
export const loadAgentRuns = (sessionId: string): AgentRun[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStoreKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AgentRunStorePayload;
    if (!parsed || typeof parsed !== "object") return [];
    return Array.isArray(parsed.runs) ? parsed.runs : [];
  } catch {
    return [];
  }
};

export const saveAgentRuns = (sessionId: string, runs: AgentRun[]) => {
  if (typeof window === "undefined") return;
  const payload: AgentRunStorePayload = {
    version: AGENT_RUN_STORE_VERSION,
    runs,
  };
  localStorage.setItem(getStoreKey(sessionId), JSON.stringify(payload));
};

export const clearAgentRuns = (sessionId: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStoreKey(sessionId));
};
