import type { SupportedChatModel } from "@/lib/model/models";

export interface ChatModel {
  id: number;
  userId: string;
  title: string;
  model: SupportedChatModel;
  pinned: boolean;
  tagId?: string | null;
  createdAt: number;
  updatedAt: number;
}
