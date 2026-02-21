export interface ChatModel {
  id: number;
  userId: string;
  title: string;
  model: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}
