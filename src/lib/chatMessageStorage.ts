import type { UIMessage } from "ai";

import { getMessageText } from "@/lib/chatMessages";

export const getChatMessagesStorageKey = (sessionId: string) =>
  `deepscan:chat:${sessionId}:messages`;

type MessageCacheEntry = {
  raw: string;
  parsed: UIMessage[];
};

const messageCache = new Map<string, MessageCacheEntry>();

export const readStoredMessages = (sessionId: string): UIMessage[] => {
  if (typeof window === "undefined") return [];
  const storageKey = getChatMessagesStorageKey(sessionId);
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];

  const cacheHit = messageCache.get(storageKey);
  if (cacheHit && cacheHit.raw === raw) {
    return cacheHit.parsed;
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
    messageCache.set(storageKey, { raw, parsed: normalized });
    return normalized;
  } catch {
    return [];
  }
};

export const writeStoredMessages = (sessionId: string, messages: UIMessage[]) => {
  if (typeof window === "undefined") return;
  const storageKey = getChatMessagesStorageKey(sessionId);
  const serialized = JSON.stringify(messages);
  messageCache.set(storageKey, { raw: serialized, parsed: messages });
  localStorage.setItem(storageKey, serialized);
};

export const removeStoredMessages = (sessionId: string) => {
  if (typeof window === "undefined") return;
  const storageKey = getChatMessagesStorageKey(sessionId);
  messageCache.delete(storageKey);
  localStorage.removeItem(storageKey);
};

export const getStoredMessagesText = (sessionId: string) => {
  const messages = readStoredMessages(sessionId);
  return messages
    .map((message) => getMessageText(message))
    .join(" ")
    .toLowerCase();
};
