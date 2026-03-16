import { describe, expect, it } from "vitest";

import { buildSystemPrompt, normalizeChatPayload, resolveChatGatewayConfig } from "./chatGateway";

describe("chatGateway", () => {
  it("normalizes payload model and messages", () => {
    const payload = normalizeChatPayload({
      model: "deepseek-r1",
      messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }],
      agentContext: {
        runId: "run_1",
        status: "succeeded",
        summary: "ok",
        attempts: 1,
        durationMs: 120,
        adapterMode: "mock",
      },
    });

    expect(payload.model).toBe("deepseek-r1");
    expect(payload.messages).toHaveLength(1);
    expect(payload.agentContext?.runId).toBe("run_1");
  });

  it("drops invalid agent context and falls back model", () => {
    const payload = normalizeChatPayload({
      model: "unsupported",
      messages: "not-array",
      agentContext: { status: "running" },
    });

    expect(payload.model).toBe("deepseek-v3");
    expect(payload.messages).toEqual([]);
    expect(payload.agentContext).toBeNull();
  });

  it("builds system prompt with pipeline context", () => {
    const prompt = buildSystemPrompt({
      runId: "run_2",
      status: "failed",
      summary: "upstream timeout",
      attempts: 2,
      durationMs: 800,
      adapterMode: "http",
      errorCode: "TOOL_TIMEOUT",
    });

    expect(prompt).toContain("You are a helpful assistant.");
    expect(prompt).toContain("Agent Pipeline Context:");
    expect(prompt).toContain("run_id: run_2");
    expect(prompt).toContain("error_code: TOOL_TIMEOUT");
  });

  it("validates required gateway env config", () => {
    expect(() =>
      resolveChatGatewayConfig({
        DEEPSEEK_API_KEY: "key",
        BASE_URL: "https://api.deepseek.com/v1",
      }),
    ).not.toThrow();

    expect(() =>
      resolveChatGatewayConfig({
        DEEPSEEK_API_KEY: "",
        BASE_URL: "",
      }),
    ).toThrow("Missing DEEPSEEK_API_KEY or BASE_URL");
  });
});
