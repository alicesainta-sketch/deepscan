import type { KnowledgeDocument, KnowledgeSearchResult } from "@/types/knowledge";

const DB_NAME = "deepscan-knowledge";
const DB_VERSION = 1;
const STORE_NAME = "documents";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const detectLanguage = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "md":
      return "markdown";
    case "json":
      return "json";
    default:
      return "text";
  }
};

// Open (or create) the IndexedDB database for knowledge documents.
const openKnowledgeDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Await transaction completion to ensure writes are flushed.
const waitForTransaction = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

// Load all documents from IndexedDB for client-side searching.
export const loadKnowledgeDocuments = async (): Promise<KnowledgeDocument[]> => {
  try {
    const db = await openKnowledgeDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    const result = await new Promise<KnowledgeDocument[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as KnowledgeDocument[]);
      request.onerror = () => reject(request.error);
    });
    await waitForTransaction(transaction);
    db.close();
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
};

export const saveKnowledgeDocuments = async (docs: KnowledgeDocument[]) => {
  try {
    const db = await openKnowledgeDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    docs.forEach((doc) => store.put(doc));
    await waitForTransaction(transaction);
    db.close();
  } catch {
    // Ignore write errors to keep UI responsive; caller can retry.
  }
};

export const deleteKnowledgeDocument = async (id: string) => {
  try {
    const db = await openKnowledgeDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    await waitForTransaction(transaction);
    db.close();
  } catch {
    // No-op on delete failure.
  }
};

// Convert local files into KnowledgeDocument records for storage.
export const createKnowledgeDocumentsFromFiles = async (
  files: FileList | File[]
): Promise<KnowledgeDocument[]> => {
  const fileList = Array.from(files ?? []);
  const now = Date.now();

  const docs = await Promise.all(
    fileList.map(async (file) => {
      const content = await file.text();
      return {
        id: createId(),
        name: file.name,
        content,
        createdAt: now,
        language: detectLanguage(file.name),
      } as KnowledgeDocument;
    })
  );

  return docs.filter((doc) => doc.content.trim().length > 0);
};

export const upsertKnowledgeDocuments = async (
  incoming: KnowledgeDocument[]
): Promise<KnowledgeDocument[]> => {
  const current = await loadKnowledgeDocuments();
  const map = new Map<string, KnowledgeDocument>();
  current.forEach((doc) => map.set(doc.id, doc));
  incoming.forEach((doc) => map.set(doc.id, doc));
  const merged = Array.from(map.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  await saveKnowledgeDocuments(merged);
  return merged;
};

const buildSnippet = (content: string, index: number, length = 180) => {
  if (index < 0) return content.slice(0, length);
  const start = Math.max(0, index - Math.floor(length / 3));
  const end = Math.min(content.length, start + length);
  return content.slice(start, end);
};

// Lightweight keyword search for demo-scale knowledge base retrieval.
export const searchKnowledgeDocuments = (
  docs: KnowledgeDocument[],
  query: string,
  limit = 4
): KnowledgeSearchResult[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const results: KnowledgeSearchResult[] = [];

  docs.forEach((doc) => {
    const contentLower = doc.content.toLowerCase();
    let score = 0;
    const matchedTokens: string[] = [];
    let firstIndex = -1;

    tokens.forEach((token) => {
      const index = contentLower.indexOf(token);
      if (index >= 0) {
        score += 1 + Math.min(token.length / 10, 1.5);
        matchedTokens.push(token);
        if (firstIndex < 0 || index < firstIndex) {
          firstIndex = index;
        }
      }
    });

    if (score > 0) {
      results.push({
        id: doc.id,
        name: doc.name,
        score,
        snippet: buildSnippet(doc.content, firstIndex),
        matchedTokens,
      });
    }
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
};
