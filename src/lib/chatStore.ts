import type { ChatModel } from "@/types/chat";

const CHAT_STORE_KEY = "deepscan:chat-store:v1";
const CHAT_STORE_VERSION = 1;

type ChatStoreState = {
  version: number;
  nextChatId: number;
  chatsByScope: Record<string, ChatModel[]>;
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
  return {
    id: typeof chat.id === "number" ? chat.id : fallbackId,
    userId: typeof chat.userId === "string" ? chat.userId : "guest",
    title: typeof chat.title === "string" ? chat.title : "新对话",
    model:
      chat.model === "deepseek-r1" || chat.model === "deepseek-v3"
        ? chat.model
        : "deepseek-v3",
    pinned: Boolean(chat.pinned),
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

const readStore = (): ChatStoreState => {
  if (typeof window === "undefined") return getDefaultState();

  const raw = localStorage.getItem(CHAT_STORE_KEY);
  if (!raw) return getDefaultState();

  try {
    const parsed = JSON.parse(raw) as Partial<ChatStoreState>;
    const nextChatId =
      typeof parsed.nextChatId === "number" && parsed.nextChatId > 0
        ? parsed.nextChatId
        : 1;
    const sourceScopes =
      parsed.chatsByScope && typeof parsed.chatsByScope === "object"
        ? parsed.chatsByScope
        : {};

    const chatsByScope: Record<string, ChatModel[]> = {};
    Object.entries(sourceScopes).forEach(([scope, chats]) => {
      const normalizedChats = Array.isArray(chats)
        ? chats.map((chat, index) =>
            normalizeChat(chat as Partial<ChatModel>, index + 1)
          )
        : [];
      chatsByScope[scope] = sortChats(normalizedChats);
    });

    return {
      version: CHAT_STORE_VERSION,
      nextChatId,
      chatsByScope,
    };
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

  const updated: ChatModel = {
    ...chat,
    title: nextTitle,
    pinned: typeof payload.pinned === "boolean" ? payload.pinned : chat.pinned,
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
