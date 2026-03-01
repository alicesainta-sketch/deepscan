export interface ChatModel {
  id: number;
  userId: string;
  title: string;
  model: string;
  pinned: boolean;
  tagId?: string | null;
  createdAt: number;
  updatedAt: number;
}
