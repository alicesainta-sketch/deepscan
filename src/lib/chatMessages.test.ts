import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  getMessageText,
  getFirstUserMessageText,
  getLastUserMessageText,
  hasAssistantResponse,
} from "./chatMessages";

const buildMessage = (role: UIMessage["role"], text: string): UIMessage =>
  ({
    id: "m1",
    role,
    parts: [{ type: "text", text }],
  }) as UIMessage;

describe("chatMessages", () => {
  it("extracts text and trims whitespace", () => {
    expect(getMessageText(buildMessage("user", " hi "))).toBe("hi");
  });

  it("finds first and last user messages", () => {
    const messages = [
      buildMessage("assistant", "a"),
      buildMessage("user", "u1"),
      buildMessage("user", "u2"),
    ];
    expect(getFirstUserMessageText(messages)).toBe("u1");
    expect(getLastUserMessageText(messages)).toBe("u2");
  });

  it("detects assistant response with text", () => {
    expect(hasAssistantResponse([buildMessage("assistant", "ok")])).toBe(true);
  });
});
