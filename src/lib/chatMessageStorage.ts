import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/chatMessages";

export const getChatMessagesStorageKey = (sessionId: string) =>
  `deepscan:chat:${sessionId}:messages`;

// Centralize message persistence so export/import and draft migration stay consistent.
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

// Persist full message arrays for a given session id.
export const writeStoredMessages = (sessionId: string, messages: UIMessage[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getChatMessagesStorageKey(sessionId), JSON.stringify(messages));
};

// Remove all messages for a session, used by replace-import cleanup.
export const removeStoredMessages = (sessionId: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getChatMessagesStorageKey(sessionId));
};

export const getStoredMessagesText = (sessionId: string) => {
  const messages = readStoredMessages(sessionId);
  return messages
    .map((message) => getMessageText(message))
    .join(" ")
    .toLowerCase();
};
