import type { UIMessage } from "ai";
import type { ChatModel } from "@/types/chat";
import {
  readStoredMessages,
  removeStoredMessages,
  writeStoredMessages,
} from "@/lib/chatMessageStorage";
import { normalizeChatTagId } from "@/lib/chatTags";

const CHAT_STORE_KEY = "deepscan:chat-store";
const LEGACY_CHAT_STORE_KEY = "deepscan:chat-store:v1";
const CHAT_STORE_VERSION = 2;

type ChatStoreState = {
  version: number;
  nextChatId: number;
  chatsByScope: Record<string, ChatModel[]>;
};

export type ChatExportPayload = {
  kind: "deepscan-chat-export";
  version: number;
  scope: string;
  exportedAt: number;
  chats: ChatModel[];
  messagesByChatId?: Record<string, UIMessage[]>;
};

const getDefaultState = (): ChatStoreState => ({
  version: CHAT_STORE_VERSION,
  nextChatId: 1,
  chatsByScope: {},
});

const normalizeChat = (chat: Partial<ChatModel>, fallbackId: number): ChatModel => {
  const now = Date.now();
  const createdAt = typeof chat.createdAt === "number" ? chat.createdAt : now;
  const updatedAt = typeof chat.updatedAt === "number" ? chat.updatedAt : createdAt;
  // 统一清洗 tagId，避免导入或旧数据携带非法值。
  const tagId = normalizeChatTagId((chat as { tagId?: unknown }).tagId);
  return {
    id: typeof chat.id === "number" ? chat.id : fallbackId,
    userId: typeof chat.userId === "string" ? chat.userId : "guest",
    title: typeof chat.title === "string" ? chat.title : "新对话",
    model:
      chat.model === "deepseek-r1" || chat.model === "deepseek-v3"
        ? chat.model
        : "deepseek-v3",
    pinned: Boolean(chat.pinned),
    tagId,
    createdAt,
    updatedAt,
  };
};

const sortChats = (chats: ChatModel[]) => {
  return [...chats].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
    return b.id - a.id;
  });
};

const coerceVersion = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 1;

const normalizeChatsByScope = (sourceScopes: unknown) => {
  const chatsByScope: Record<string, ChatModel[]> = {};
  let maxChatId = 0;

  if (sourceScopes && typeof sourceScopes === "object") {
    Object.entries(sourceScopes as Record<string, unknown>).forEach(
      ([scope, chats]) => {
        const normalizedChats = Array.isArray(chats)
          ? chats.map((chat, index) =>
              normalizeChat(chat as Partial<ChatModel>, index + 1)
            )
          : [];
        normalizedChats.forEach((chat) => {
          if (chat.id > maxChatId) maxChatId = chat.id;
        });
        chatsByScope[scope] = sortChats(normalizedChats);
      }
    );
  }

  return { chatsByScope, maxChatId };
};

const migrateStore = (raw: unknown): ChatStoreState => {
  if (!raw || typeof raw !== "object") return getDefaultState();

  const candidate = raw as {
    version?: unknown;
    nextChatId?: unknown;
    chatsByScope?: unknown;
  };

  const storedVersion = coerceVersion(candidate.version);
  const { chatsByScope, maxChatId } = normalizeChatsByScope(
    candidate.chatsByScope
  );
  const storedNextChatId =
    typeof candidate.nextChatId === "number" && candidate.nextChatId > 0
      ? candidate.nextChatId
      : 1;
  const nextChatId = Math.max(storedNextChatId, maxChatId + 1);

  if (storedVersion > CHAT_STORE_VERSION) {
    console.warn(
      `Chat store version ${storedVersion} is newer than supported ${CHAT_STORE_VERSION}.`
    );
  }

  return {
    version: CHAT_STORE_VERSION,
    nextChatId,
    chatsByScope,
  };
};

const readStore = (): ChatStoreState => {
  if (typeof window === "undefined") return getDefaultState();

  const raw = localStorage.getItem(CHAT_STORE_KEY);
  const legacyRaw = raw ? null : localStorage.getItem(LEGACY_CHAT_STORE_KEY);
  const source = raw ?? legacyRaw;
  if (!source) return getDefaultState();

  try {
    const parsed = JSON.parse(source) as unknown;
    const migrated = migrateStore(parsed);

    const storedVersion = coerceVersion(
      (parsed as { version?: unknown })?.version
    );
    if (legacyRaw || storedVersion !== CHAT_STORE_VERSION) {
      writeStore(migrated);
      if (legacyRaw) {
        localStorage.removeItem(LEGACY_CHAT_STORE_KEY);
      }
    }

    return migrated;
  } catch {
    return getDefaultState();
  }
};

const writeStore = (state: ChatStoreState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(state));
};

export const getChatScope = (userId?: string | null) => userId ?? "guest";

export const listChats = async (scope: string) => {
  const store = readStore();
  return sortChats(store.chatsByScope[scope] ?? []);
};

export const createLocalChat = async (
  scope: string,
  payload: {
    title: string;
    model: "deepseek-v3" | "deepseek-r1";
  }
) => {
  const store = readStore();
  const now = Date.now();
  const title = payload.title.trim() || "新对话";
  const newChat: ChatModel = {
    id: store.nextChatId,
    userId: scope,
    title,
    model: payload.model,
    pinned: false,
    tagId: null,
    createdAt: now,
    updatedAt: now,
  };

  const currentChats = store.chatsByScope[scope] ?? [];
  store.chatsByScope[scope] = sortChats([newChat, ...currentChats]);
  store.nextChatId += 1;
  writeStore(store);
  return newChat;
};

export const updateLocalChat = async (
  scope: string,
  chatId: number,
  payload: {
    title?: string;
    pinned?: boolean;
    model?: "deepseek-v3" | "deepseek-r1";
    tagId?: string | null;
  }
) => {
  const store = readStore();
  const chats = store.chatsByScope[scope] ?? [];
  const chatIndex = chats.findIndex((chat) => chat.id === chatId);
  if (chatIndex < 0) return null;

  const chat = chats[chatIndex];
  const nextTitle =
    typeof payload.title === "string" ? payload.title.trim() : chat.title;
  if (!nextTitle) return null;
  // tagId 允许显式置空，未传则保留原值。
  const nextTagId =
    payload.tagId === undefined ? chat.tagId : normalizeChatTagId(payload.tagId);

  const updated: ChatModel = {
    ...chat,
    title: nextTitle,
    pinned: typeof payload.pinned === "boolean" ? payload.pinned : chat.pinned,
    model:
      payload.model === "deepseek-r1" || payload.model === "deepseek-v3"
        ? payload.model
        : chat.model,
    tagId: nextTagId,
    updatedAt: Date.now(),
  };

  const nextChats = [...chats];
  nextChats[chatIndex] = updated;
  store.chatsByScope[scope] = sortChats(nextChats);
  writeStore(store);
  return updated;
};

export const deleteLocalChat = async (scope: string, chatId: number) => {
  const store = readStore();
  const chats = store.chatsByScope[scope] ?? [];
  if (!chats.some((chat) => chat.id === chatId)) {
    return false;
  }

  store.chatsByScope[scope] = chats.filter((chat) => chat.id !== chatId);
  writeStore(store);
  return true;
};

export const exportLocalChats = async (
  scope: string
): Promise<ChatExportPayload> => {
  const chats = await listChats(scope);
  // Export messages alongside chat metadata for complete backup/restore.
  const messagesByChatId: Record<string, UIMessage[]> = {};
  chats.forEach((chat) => {
    const messages = readStoredMessages(String(chat.id));
    if (messages.length > 0) {
      messagesByChatId[String(chat.id)] = messages;
    }
  });

  return {
    kind: "deepscan-chat-export",
    version: CHAT_STORE_VERSION,
    scope,
    exportedAt: Date.now(),
    chats,
    messagesByChatId,
  };
};

export const importLocalChats = async (
  scope: string,
  payload: unknown,
  mode: "merge" | "replace" = "merge"
) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("导入文件格式无效");
  }

  const candidate = payload as {
    kind?: unknown;
    chats?: unknown;
    messagesByChatId?: unknown;
  };

  if (candidate.kind !== "deepscan-chat-export") {
    throw new Error("不支持的导入文件类型");
  }
  if (!Array.isArray(candidate.chats)) {
    throw new Error("导入文件缺少 chats 数组");
  }

  const store = readStore();
  if (mode === "replace") {
    // Replace mode should also clear existing message shards for this scope.
    (store.chatsByScope[scope] ?? []).forEach((chat) => {
      removeStoredMessages(String(chat.id));
    });
  }
  const importedChats = candidate.chats.map((rawChat, index) =>
    normalizeChat(rawChat as Partial<ChatModel>, index + 1)
  );

  const idMap = new Map<number, number>();
  const withFreshIds = importedChats.map((chat) => {
    const nextId = store.nextChatId++;
    idMap.set(chat.id, nextId);
    return {
      ...chat,
      id: nextId,
      userId: scope,
    };
  });

  const currentChats = store.chatsByScope[scope] ?? [];
  const nextChats =
    mode === "replace" ? withFreshIds : [...withFreshIds, ...currentChats];

  store.chatsByScope[scope] = sortChats(nextChats);
  writeStore(store);

  if (candidate.messagesByChatId && typeof candidate.messagesByChatId === "object") {
    // Map messages from old chat ids to new ids after import.
    Object.entries(candidate.messagesByChatId as Record<string, unknown>).forEach(
      ([rawChatId, rawMessages]) => {
        const oldId = Number(rawChatId);
        const newId = idMap.get(oldId);
        if (!newId || !Array.isArray(rawMessages)) return;
        writeStoredMessages(String(newId), rawMessages as UIMessage[]);
      }
    );
  }

  return {
    importedCount: withFreshIds.length,
    totalCount: store.chatsByScope[scope].length,
  };
};
