import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAT_MODEL,
  isSupportedChatModel,
  normalizeChatModel,
} from "./models";

describe("chat models", () => {
  it("detects supported model names", () => {
    expect(isSupportedChatModel("deepseek-v3")).toBe(true);
    expect(isSupportedChatModel("deepseek-r1")).toBe(true);
    expect(isSupportedChatModel("gpt-4o")).toBe(false);
  });

  it("falls back to default for unsupported values", () => {
    expect(normalizeChatModel("invalid-model")).toBe(DEFAULT_CHAT_MODEL);
    expect(normalizeChatModel(null)).toBe(DEFAULT_CHAT_MODEL);
  });
});
