import axios from "axios";
import { get, set } from "idb-keyval";
import type { ChatProviderConfig } from "@/lib/chatProviderAdapter";
import { buildProviderHeaders } from "@/lib/chatProviderAdapter";
import type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeSearchResult,
} from "@/types/knowledge";

const EMBEDDING_STORAGE_KEY = "deepscan:knowledge-embeddings:v1";
const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 100;
const EMBEDDING_BATCH_SIZE = 20;

const createChunkId = (docId: string, chunkIndex: number) =>
  `${docId}:${chunkIndex}`;

const normalizeApiUrl = (apiUrl: string) => apiUrl.trim().replace(/\/$/, "");

// Resolve an OpenAI-compatible embeddings endpoint from API base.
export const getEmbeddingsEndpoint = (config: ChatProviderConfig) => {
  if (config.mode !== "openai-compatible") return null;
  if (!config.apiUrl) return null;
  const trimmed = normalizeApiUrl(config.apiUrl);

  if (trimmed.endsWith("/embeddings")) return trimmed;
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.replace(/\/chat\/completions$/, "/embeddings");
  }
  if (trimmed.endsWith("/v1")) return `${trimmed}/embeddings`;
  if (trimmed.endsWith("/v1/")) return `${trimmed}embeddings`;

  return `${trimmed}/embeddings`;
};

const splitIntoChunks = (
  content: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP
) => {
  const chunks: string[] = [];
  if (!content.trim()) return chunks;
  const safeOverlap = Math.min(overlap, Math.max(0, size - 1));
  const step = size - safeOverlap;
  for (let start = 0; start < content.length; start += step) {
    const slice = content.slice(start, start + size).trim();
    if (slice) chunks.push(slice);
  }
  return chunks;
};

const createChunksFromDocs = (
  docs: KnowledgeDocument[],
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP
) => {
  const now = Date.now();
  const chunks: Array<Omit<KnowledgeChunk, "embedding">> = [];
  docs.forEach((doc) => {
    const parts = splitIntoChunks(doc.content, size, overlap);
    parts.forEach((part, index) => {
      chunks.push({
        id: createChunkId(doc.id, index),
        docId: doc.id,
        docName: doc.name,
        content: part,
        createdAt: now,
        chunkIndex: index,
      });
    });
  });
  return chunks;
};

const buildEmbeddingRequest = async (
  inputs: string[],
  config: ChatProviderConfig,
  model: string
) => {
  const endpoint = getEmbeddingsEndpoint(config);
  if (!endpoint) {
    throw new Error("Embedding 接口不可用");
  }

  const response = await axios.post(
    endpoint,
    {
      model,
      input: inputs,
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...buildProviderHeaders(config),
      },
    }
  );

  const data = response.data?.data;
  if (!Array.isArray(data)) {
    throw new Error("Embedding 响应格式异常");
  }

  return data.map((item) => item.embedding as number[]);
};

export const rebuildKnowledgeEmbeddings = async (params: {
  docs: KnowledgeDocument[];
  config: ChatProviderConfig;
  model: string;
  chunkSize?: number;
  chunkOverlap?: number;
}) => {
  const { docs, config, model, chunkSize, chunkOverlap } = params;
  const baseChunks = createChunksFromDocs(docs, chunkSize, chunkOverlap);
  if (!baseChunks.length) {
    await set(EMBEDDING_STORAGE_KEY, []);
    return [] as KnowledgeChunk[];
  }

  const embeddedChunks: KnowledgeChunk[] = [];
  for (let i = 0; i < baseChunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = baseChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const embeddings = await buildEmbeddingRequest(
      batch.map((chunk) => chunk.content),
      config,
      model
    );
    embeddings.forEach((embedding, index) => {
      embeddedChunks.push({
        ...batch[index],
        embedding,
      });
    });
  }

  await set(EMBEDDING_STORAGE_KEY, embeddedChunks);
  return embeddedChunks;
};

export const loadKnowledgeEmbeddings = async (): Promise<KnowledgeChunk[]> => {
  const stored = (await get(EMBEDDING_STORAGE_KEY)) as KnowledgeChunk[] | undefined;
  return Array.isArray(stored) ? stored : [];
};

const cosineSimilarity = (a: number[], b: number[]) => {
  if (a.length !== b.length || a.length === 0) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  if (!normA || !normB) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const extractQueryTokens = (query: string) =>
  query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

export const searchKnowledgeEmbeddings = async (params: {
  query: string;
  chunks: KnowledgeChunk[];
  config: ChatProviderConfig;
  model: string;
  topK: number;
}): Promise<KnowledgeSearchResult[]> => {
  const { query, chunks, config, model, topK } = params;
  if (!query.trim() || !chunks.length) return [];

  const [queryEmbedding] = await buildEmbeddingRequest([query], config, model);
  if (!queryEmbedding) return [];

  const scores = chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK));

  const tokens = extractQueryTokens(query);

  return scores.map(({ chunk, score }) => ({
    id: chunk.docId,
    name: `${chunk.docName} · ${chunk.chunkIndex + 1}`,
    score,
    snippet: chunk.content.slice(0, 200),
    matchedTokens: tokens,
  }));
};
