import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import {
  readStoredMessages,
  removeStoredMessages,
  writeStoredMessages,
} from "./chatMessageStorage";

type StorageMock = {
  clear: () => void;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  readonly length: number;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

const createStorageMock = (): StorageMock => {
  const map = new Map<string, string>();
  return {
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key) ?? null : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};

beforeEach(() => {
  const storage = createStorageMock();
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chatMessageStorage", () => {
  it("writes and reads stored messages", () => {
    const messages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] },
    ] as UIMessage[];

    writeStoredMessages("1", messages);
    const loaded = readStoredMessages("1");

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("m1");
  });

  it("removes stored messages", () => {
    const messages = [
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "hi" }] },
    ] as UIMessage[];

    writeStoredMessages("2", messages);
    removeStoredMessages("2");

    expect(readStoredMessages("2")).toEqual([]);
  });
});
