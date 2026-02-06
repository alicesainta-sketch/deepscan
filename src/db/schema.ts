import { integer, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const chatsTable = pgTable("chats", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  model: text("model").notNull(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chatsTable.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
});

export type ChatModel = typeof chatsTable.$inferSelect;
export type MessageModel = typeof messagesTable.$inferSelect;
