import type { AdapterContext, AdapterResult, AgentAdapter } from "./adapter";

export type MockAdapterMode = "success" | "timeout" | "fail";

export type MockAdapterOptions = {
  mode: MockAdapterMode;
  delayMs?: number;
  failMessage?: string;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
  });

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
      await sleep(Math.max(ctx.timeout_ms + 30, delayMs), ctx.signal);
      return { summary: "timeout-path" };
    }

    if (this.options.mode === "fail") {
      await sleep(delayMs, ctx.signal);
      throw new Error(this.options.failMessage ?? "mock upstream error");
    }

    await sleep(delayMs, ctx.signal);
    return {
      summary: `mock success attempt ${ctx.attempt}`,
      output: {
        attempt: ctx.attempt,
      },
    };
  }
}
