import type { ChatModel, MessageModel } from "@/types/chat";

type InMemoryStore = {
  chatsByUser: Map<string, ChatModel[]>;
  messagesByChat: Map<number, MessageModel[]>;
  nextChatId: number;
  nextMessageId: number;
};

const globalStore = globalThis as typeof globalThis & {
  __deepscanStore?: InMemoryStore;
};

const store: InMemoryStore =
  globalStore.__deepscanStore ??
  ({
    chatsByUser: new Map<string, ChatModel[]>(),
    messagesByChat: new Map<number, MessageModel[]>(),
    nextChatId: 1,
    nextMessageId: 1,
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

export const getChat = async (chatId: number, userId: string) => {
  try {
    const chats = store.chatsByUser.get(userId) ?? [];
    return chats.find((chat) => chat.id === chatId) ?? null;
  } catch (error) {
    console.error("Error getting chat:", error);
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

export const createMessage = async (
  chatId: number,
  content: string,
  role: string
) => {
  try {
    const newMessage: MessageModel = {
      id: store.nextMessageId++,
      chatId,
      role,
      content,
    };

    const existingMessages = store.messagesByChat.get(chatId) ?? [];
    store.messagesByChat.set(chatId, [...existingMessages, newMessage]);
    return newMessage;
  } catch (error) {
    console.log("error createMessage", error);
    return null;
  }
};

export const getMessagesByChatId = async (chatId: number) => {
  try {
    return [...(store.messagesByChat.get(chatId) ?? [])].sort(
      (a, b) => a.id - b.id
    );
  } catch (error) {
    console.log("error getMessagesByChatId", error);
    return [];
  }
};
