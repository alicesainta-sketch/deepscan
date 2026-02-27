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

export type KnowledgeChunk = {
  id: string;
  docId: string;
  docName: string;
  content: string;
  embedding: number[];
  createdAt: number;
  chunkIndex: number;
};
