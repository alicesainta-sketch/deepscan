import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/chatMessages";

export const getChatMessagesStorageKey = (sessionId: string) =>
  `deepscan:chat:${sessionId}:messages`;

export const readStoredMessages = (sessionId: string): UIMessage[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(getChatMessagesStorageKey(sessionId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
};

export const getStoredMessagesText = (sessionId: string) => {
  const messages = readStoredMessages(sessionId);
  return messages
    .map((message) => getMessageText(message))
    .join(" ")
    .toLowerCase();
};
