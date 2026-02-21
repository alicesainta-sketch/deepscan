export interface ChatModel {
  id: number;
  userId: string;
  title: string;
  model: string;
}

export interface MessageModel {
  id: number;
  chatId: number;
  role: string;
  content: string;
}
