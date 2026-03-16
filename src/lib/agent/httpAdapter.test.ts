import { afterEach, describe, expect, it, vi } from "vitest";

import { type AgentAdapterError } from "./adapter";
import { HttpAgentAdapter } from "./httpAdapter";

const buildContext = () => ({
  run_id: "run_1",
  session_id: "chat_1",
  step_id: "step_1",
  input: "hello",
  attempt: 1,
  timeout_ms: 1000,
});

describe("httpAgentAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps successful response to AdapterResult", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        summary: "remote ok",
        output: { result: "done" },
      }),
    });

    const adapter = new HttpAgentAdapter({
      baseUrl: "https://api.example.com",
      toolName: "deepscan.search",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await adapter.invokeTool(buildContext());

    expect(result.summary).toBe("remote ok");
    expect(result.output).toEqual({ result: "done" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/mcp/tools/deepscan.search/invoke",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("throws normalized upstream error when response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({
        error: {
          message: "upstream down",
        },
      }),
    });

    const adapter = new HttpAgentAdapter({
      baseUrl: "https://api.example.com",
      toolName: "deepscan.search",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(adapter.invokeTool(buildContext())).rejects.toThrow("upstream down");
  });

  it("preserves remote error code and retryable flag", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: "UPSTREAM_ERROR",
          message: "bad request",
          retryable: false,
          details: { field: "input" },
        },
      }),
    });

    const adapter = new HttpAgentAdapter({
      baseUrl: "https://api.example.com",
      toolName: "deepscan.search",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(adapter.invokeTool(buildContext())).rejects.toMatchObject({
      name: "AgentAdapterError",
      code: "UPSTREAM_ERROR",
      message: "bad request",
      retryable: false,
      details: { field: "input" },
    } satisfies Partial<AgentAdapterError>);
  });

  it("falls back to default summary when response body is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("invalid json");
      },
    });

    const adapter = new HttpAgentAdapter({
      baseUrl: "https://api.example.com",
      toolName: "deepscan.search",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await adapter.invokeTool(buildContext());
    expect(result.summary).toBe("remote tool call completed");
    expect(result.output).toBeUndefined();
  });
});
