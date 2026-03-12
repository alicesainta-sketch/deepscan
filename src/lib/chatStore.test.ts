import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLocalChat,
  deleteLocalChat,
  getChatScope,
  listChats,
  updateLocalChat,
} from "./chatStore";

type StorageMap = Map<string, string>;

type StorageMock = {
  clear: () => void;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  readonly length: number;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

const createStorageMock = (): StorageMock => {
  const store: StorageMap = new Map();

  return {
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    key: (index: number) => {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
};

beforeEach(() => {
  const storage = createStorageMock();
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-07T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("chatStore", () => {
  it("creates chats with incremental ids and default fields", async () => {
    const scope = getChatScope("u1");

    const first = await createLocalChat(scope, {
      title: "第一个会话",
      model: "deepseek-v3",
    });
    const second = await createLocalChat(scope, {
      title: "第二个会话",
      model: "deepseek-r1",
    });

    expect(first.id).toBe(1);
    expect(first.userId).toBe("u1");
    expect(first.pinned).toBe(false);
    expect(first.tagId).toBeNull();
    expect(second.id).toBe(2);
    expect(second.model).toBe("deepseek-r1");
  });

  it("lists chats sorted by updatedAt desc", async () => {
    const scope = getChatScope("u2");

    const chat1 = await createLocalChat(scope, {
      title: "旧会话",
      model: "deepseek-v3",
    });

    vi.advanceTimersByTime(5_000);
    const chat2 = await createLocalChat(scope, {
      title: "新会话",
      model: "deepseek-v3",
    });

    const chats = await listChats(scope);
    expect(chats.map((chat) => chat.id)).toEqual([chat2.id, chat1.id]);
  });

  it("updates title and rejects empty title", async () => {
    const scope = getChatScope("u3");
    const chat = await createLocalChat(scope, {
      title: "待改名",
      model: "deepseek-v3",
    });

    const updated = await updateLocalChat(scope, chat.id, {
      title: "新标题",
    });
    expect(updated?.title).toBe("新标题");

    const invalid = await updateLocalChat(scope, chat.id, {
      title: "   ",
    });
    expect(invalid).toBeNull();
  });

  it("deletes existing chat and returns false for unknown chat", async () => {
    const scope = getChatScope("u4");
    const chat = await createLocalChat(scope, {
      title: "待删除",
      model: "deepseek-v3",
    });

    const deleted = await deleteLocalChat(scope, chat.id);
    const deletedMissing = await deleteLocalChat(scope, chat.id);
    const remain = await listChats(scope);

    expect(deleted).toBe(true);
    expect(deletedMissing).toBe(false);
    expect(remain).toHaveLength(0);
  });

  it("isolates chat data across scopes", async () => {
    const scopeA = getChatScope("user-a");
    const scopeB = getChatScope("user-b");

    await createLocalChat(scopeA, {
      title: "A 会话",
      model: "deepseek-v3",
    });
    await createLocalChat(scopeB, {
      title: "B 会话",
      model: "deepseek-v3",
    });

    const chatsA = await listChats(scopeA);
    const chatsB = await listChats(scopeB);

    expect(chatsA).toHaveLength(1);
    expect(chatsB).toHaveLength(1);
    expect(chatsA[0].userId).toBe("user-a");
    expect(chatsB[0].userId).toBe("user-b");
  });
});
