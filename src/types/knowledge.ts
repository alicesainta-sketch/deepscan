export type KnowledgeDocument = {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  language?: string;
};

export type KnowledgeSearchResult = {
  id: string;
  name: string;
  score: number;
  snippet: string;
  matchedTokens: string[];
};
