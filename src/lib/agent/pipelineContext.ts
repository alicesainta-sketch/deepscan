import type { AgentErrorCode, AgentRunStatus } from "./types";

export type AgentPipelineContext = {
  runId: string;
  status: AgentRunStatus;
  summary: string;
  attempts: number;
  durationMs: number;
  adapterMode: "mock" | "http";
  errorCode?: AgentErrorCode;
};
