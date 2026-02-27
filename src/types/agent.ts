export type AgentRunStatus = "pending" | "running" | "success" | "failed";
export type AgentStepStatus = "pending" | "running" | "success" | "failed";

export type AgentToolName =
  | "code_search"
  | "file_outline"
  | "snippet_summarize"
  | "change_plan";

export type AgentStepDetail = {
  title: string;
  content: string;
  meta?: string;
  sourceId?: string;
  matchTokens?: string[];
};

export type AgentStep = {
  id: string;
  title: string;
  status: AgentStepStatus;
  startedAt?: number;
  endedAt?: number;
  toolName?: AgentToolName;
  inputSummary?: string;
  outputSummary?: string;
  details?: AgentStepDetail[];
  error?: string;
};

export type AgentRun = {
  id: string;
  sessionId: string;
  title: string;
  prompt: string;
  status: AgentRunStatus;
  createdAt: number;
  updatedAt: number;
  steps: AgentStep[];
};

export type AgentMessageMetadata = {
  agent?: {
    enabled: boolean;
    runId: string;
    context?: string;
    planSummary?: string;
  };
};
