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

export const createChat = async (
  title: string,
  userId: string,
  model: string
) => {
  try {
    const newChat: ChatModel = {
      id: store.nextChatId++,
      userId,
      title,
      model,
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
    return [...(store.chatsByUser.get(userId) ?? [])].sort((a, b) => b.id - a.id);
  } catch (error) {
    console.error("Error getting chats:", error);
    return [];
  }
};
