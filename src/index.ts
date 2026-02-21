import type { ChatModel } from "@/types/chat";

type InMemoryStore = {
  chatsByUser: Map<string, ChatModel[]>;
  nextChatId: number;
};

const globalStore = globalThis as typeof globalThis & {
  __deepscanStore?: InMemoryStore;
};

const store: InMemoryStore =
  globalStore.__deepscanStore ??
  ({
    chatsByUser: new Map<string, ChatModel[]>(),
    nextChatId: 1,
  } as InMemoryStore);

if (!globalStore.__deepscanStore) {
  globalStore.__deepscanStore = store;
}

const normalizeChat = (chat: ChatModel): ChatModel => {
  const createdAt = typeof chat.createdAt === "number" ? chat.createdAt : Date.now();
  return {
    ...chat,
    pinned: Boolean(chat.pinned),
    createdAt,
    updatedAt: typeof chat.updatedAt === "number" ? chat.updatedAt : createdAt,
  };
};

export const createChat = async (
  title: string,
  userId: string,
  model: string
) => {
  try {
    const now = Date.now();
    const newChat: ChatModel = {
      id: store.nextChatId++,
      userId,
      title,
      model,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };

    const existingChats = store.chatsByUser.get(userId) ?? [];
    store.chatsByUser.set(userId, [newChat, ...existingChats]);
    return newChat;
  } catch (error) {
    console.error("Error creating chat:", error);
    return null;
  }
};

export const getChats = async (userId: string) => {
  try {
    const normalized = [...(store.chatsByUser.get(userId) ?? [])].map(normalizeChat);
    store.chatsByUser.set(userId, normalized);
    return normalized.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
      return b.id - a.id;
    });
  } catch (error) {
    console.error("Error getting chats:", error);
    return [];
  }
};

const findUserChatIndex = (userId: string, chatId: number) => {
  const chats = store.chatsByUser.get(userId) ?? [];
  const chatIndex = chats.findIndex((chat) => chat.id === chatId);
  return { chats, chatIndex };
};

export const updateChat = async (
  userId: string,
  chatId: number,
  payload: {
    title?: string;
    pinned?: boolean;
  }
) => {
  try {
    const { chats, chatIndex } = findUserChatIndex(userId, chatId);
    if (chatIndex < 0) return null;

    const existing = normalizeChat(chats[chatIndex]);
    const nextTitle =
      typeof payload.title === "string" ? payload.title.trim() : existing.title;

    if (!nextTitle) {
      return null;
    }

    const updated: ChatModel = {
      ...existing,
      title: nextTitle,
      pinned:
        typeof payload.pinned === "boolean" ? payload.pinned : existing.pinned,
      updatedAt: Date.now(),
    };

    const nextChats = [...chats];
    nextChats[chatIndex] = updated;
    store.chatsByUser.set(userId, nextChats);
    return updated;
  } catch (error) {
    console.error("Error updating chat:", error);
    return null;
  }
};

export const deleteChat = async (userId: string, chatId: number) => {
  try {
    const { chats, chatIndex } = findUserChatIndex(userId, chatId);
    if (chatIndex < 0) return false;

    const nextChats = chats.filter((chat) => chat.id !== chatId);
    store.chatsByUser.set(userId, nextChats);
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};
