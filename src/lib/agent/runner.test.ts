import { describe, expect, it } from "vitest";
import { MockAgentAdapter } from "./mockAdapter";
import { runAgent } from "./runner";

describe("agent runner", () => {
  it("runs success path and completes run", async () => {
    const adapter = new MockAgentAdapter({ mode: "success", delayMs: 0 });

    const state = await runAgent({
      runId: "run_success",
      sessionId: "chat_1",
      input: "请生成方案",
      adapter,
      maxRetries: 2,
      timeoutMs: 50,
      retryDelayMs: 0,
    });

    expect(state.status).toBe("succeeded");
    expect(state.steps[0].status).toBe("succeeded");
    expect(state.steps[0].attempt).toBe(1);
    expect(adapter.callCount).toBe(1);
  });

  it("fails with TOOL_TIMEOUT when tool call exceeds timeout", async () => {
    const adapter = new MockAgentAdapter({ mode: "timeout" });

    const state = await runAgent({
      runId: "run_timeout",
      sessionId: "chat_1",
      input: "调用超时",
      adapter,
      maxRetries: 0,
      timeoutMs: 10,
      retryDelayMs: 0,
    });

    expect(state.status).toBe("failed");
    expect(state.lastError?.code).toBe("TOOL_TIMEOUT");
    expect(state.steps[0].status).toBe("failed");
    expect(adapter.callCount).toBe(1);
  });

  it("fails with TOOL_RETRY_EXHAUSTED after retries", async () => {
    const adapter = new MockAgentAdapter({ mode: "fail", failMessage: "upstream" });

    const state = await runAgent({
      runId: "run_retry_exhausted",
      sessionId: "chat_1",
      input: "重试失败",
      adapter,
      maxRetries: 2,
      timeoutMs: 50,
      retryDelayMs: 0,
    });

    expect(state.status).toBe("failed");
    expect(state.lastError?.code).toBe("TOOL_RETRY_EXHAUSTED");
    expect(state.steps[0].attempt).toBe(3);
    expect(adapter.callCount).toBe(3);
  });
});
