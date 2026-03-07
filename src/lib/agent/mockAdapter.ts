import type { AgentAdapter, AdapterContext, AdapterResult } from "./adapter";

export type MockAdapterMode = "success" | "timeout" | "fail";

export type MockAdapterOptions = {
  mode: MockAdapterMode;
  delayMs?: number;
  failMessage?: string;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 本地 mock adapter，用于在无后端时模拟工具调用行为。
 */
export class MockAgentAdapter implements AgentAdapter {
  private readonly options: MockAdapterOptions;
  private calls = 0;

  constructor(options: MockAdapterOptions) {
    this.options = options;
  }

  get callCount() {
    return this.calls;
  }

  async invokeTool(ctx: AdapterContext): Promise<AdapterResult> {
    this.calls += 1;
    const delayMs = this.options.delayMs ?? 0;

    if (this.options.mode === "timeout") {
      // 故意延迟超过 runner 的 timeout，触发超时分支。
      await sleep(Math.max(ctx.timeout_ms + 30, delayMs));
      return { summary: "timeout-path" };
    }

    if (this.options.mode === "fail") {
      await sleep(delayMs);
      throw new Error(this.options.failMessage ?? "mock upstream error");
    }

    await sleep(delayMs);
    return {
      summary: `mock success attempt ${ctx.attempt}`,
      output: {
        attempt: ctx.attempt,
      },
    };
  }
}
