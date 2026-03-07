import { afterEach, describe, expect, it } from "vitest";
import { createAgentAdapter } from "./createAdapter";
import { HttpAgentAdapter } from "./httpAdapter";
import { MockAgentAdapter } from "./mockAdapter";

const clearAgentEnv = () => {
  delete process.env.NEXT_PUBLIC_AGENT_ADAPTER;
  delete process.env.NEXT_PUBLIC_AGENT_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_AGENT_TOOL_NAME;
};

describe("createAgentAdapter", () => {
  afterEach(() => {
    clearAgentEnv();
  });

  it("returns mock adapter by default", () => {
    clearAgentEnv();

    const resolved = createAgentAdapter({ mockMode: "success" });

    expect(resolved.mode).toBe("mock");
    expect(resolved.adapter).toBeInstanceOf(MockAgentAdapter);
  });

  it("returns http adapter when mode is http and base url is configured", () => {
    process.env.NEXT_PUBLIC_AGENT_ADAPTER = "http";
    process.env.NEXT_PUBLIC_AGENT_API_BASE_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_AGENT_TOOL_NAME = "tools.search";

    const resolved = createAgentAdapter();

    expect(resolved.mode).toBe("http");
    expect(resolved.adapter).toBeInstanceOf(HttpAgentAdapter);
    expect(resolved.metadata.baseUrl).toBe("https://api.example.com");
    expect(resolved.metadata.toolName).toBe("tools.search");
  });

  it("throws when http mode is enabled but base url is missing", () => {
    process.env.NEXT_PUBLIC_AGENT_ADAPTER = "http";
    delete process.env.NEXT_PUBLIC_AGENT_API_BASE_URL;

    expect(() => createAgentAdapter()).toThrow(
      "Missing NEXT_PUBLIC_AGENT_API_BASE_URL for http adapter"
    );
  });
});
