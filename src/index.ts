import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chatsTable, messagesTable } from "./db/schema";
import { and, desc, eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle({ client });

export const createChat = async (
  title: string,
  userId: string,
  model: string
) => {
  try {
    const [newChat] = await db
      .insert(chatsTable)
      .values({
        title,
        userId,
        model,
      })
      .returning();
    return newChat;
  } catch (error) {
    console.error("Error creating chat:", error);
    return null;
  }
};

export const getChat = async (chatId: number, userId: string) => {
  try {
    const chat = await db
      .select()
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)));
    if (chat.length === 0) {
      return null;
    }
    return chat[0];
  } catch (error) {
    console.error("Error getting chat:", error);
    return null;
  }
};

export const getChats = async (userId: string) => {
  try {
    const chats = await db
      .select()
      .from(chatsTable)
      .where(eq(chatsTable.userId, userId))
      .orderBy(desc(chatsTable.id));
    return chats;
  } catch (error) {
    console.error("Error getting chats:", error);
    return [];
  }
};

// messages
export const createMessage = async (
  chat_id: number,
  content: string,
  role: string
) => {
  try {
    const [newMessage] = await db
      .insert(messagesTable)
      .values({
        content: content,
        chatId: chat_id,
        role: role,
      })
      .returning();
    return newMessage;
  } catch (error) {
    console.log("error createMessage", error);
    return null;
  }
};

export const getMessagesByChatId = async (chatId: number) => {
  try {
    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.chatId, chatId));
    return messages;
  } catch (error) {
    console.log("error getMessagesByChatId", error);
    return null;
  }
};
