import type { UIMessage } from "ai";

export const getMessageText = (message: UIMessage) =>
  message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

export const getFirstUserMessageText = (messages: UIMessage[]) => {
  const userMessage = messages.find((message) => message.role === "user");
  return userMessage ? getMessageText(userMessage) : "";
};

export const getLastUserMessageText = (messages: UIMessage[]) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") {
      return getMessageText(messages[i]);
    }
  }
  return "";
};

export const hasAssistantResponse = (messages: UIMessage[]) =>
  messages.some(
    (message) =>
      message.role === "assistant" && getMessageText(message).length > 0
  );
