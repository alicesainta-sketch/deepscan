export type AdapterResult = {
  summary: string;
  output?: unknown;
};

export type AdapterContext = {
  run_id: string;
  session_id: string;
  step_id: string;
  input: string;
  attempt: number;
  timeout_ms: number;
};

export interface AgentAdapter {
  invokeTool(ctx: AdapterContext): Promise<AdapterResult>;
}
