import { describe, expect, it } from "vitest";
import type { ChatModel } from "@/types/chat";
import {
  TAG_FILTER_ALL,
  TAG_FILTER_UNTAGGED,
  buildTagFilterCounts,
  filterChats,
  normalizeTagFilterValue,
} from "./chatFilters";

const buildChat = (partial: Partial<ChatModel> & { id: number }): ChatModel => ({
  id: partial.id,
  userId: partial.userId ?? "u1",
  title: partial.title ?? `chat-${partial.id}`,
  model: partial.model ?? "deepseek-v3",
  pinned: partial.pinned ?? false,
  tagId: partial.tagId ?? null,
  createdAt: partial.createdAt ?? 1,
  updatedAt: partial.updatedAt ?? 1,
});

describe("chatFilters", () => {
  it("normalizes unknown tag filter to all", () => {
    expect(normalizeTagFilterValue("unknown")).toBe(TAG_FILTER_ALL);
  });

  it("filters by pinned/tag/keyword together", () => {
    const chats = [
      buildChat({ id: 1, pinned: true, tagId: "work", title: "系统设计" }),
      buildChat({ id: 2, pinned: false, tagId: "work", title: "复盘" }),
      buildChat({ id: 3, pinned: true, tagId: "study", title: "算法" }),
    ];
    const messageIndex = {
      1: "缓存 命中",
      2: "团队 回顾",
      3: "二叉树 练习",
    };

    const result = filterChats(chats, {
      keyword: "缓存",
      tagFilter: "work",
      pinnedOnly: true,
      messageIndex,
    });

    expect(result.map((chat) => chat.id)).toEqual([1]);
  });

  it("supports multi-keyword AND matching across searchable fields", () => {
    const chats = [
      buildChat({ id: 1, title: "系统设计缓存策略", model: "deepseek-v3" }),
      buildChat({ id: 2, title: "系统设计", model: "deepseek-v3" }),
      buildChat({ id: 3, title: "缓存复盘", model: "deepseek-v3" }),
    ];
    const messageIndex = {
      1: "命中率分析",
      2: "链路追踪",
      3: "命中率分析",
    };

    const result = filterChats(chats, {
      keyword: "系统 命中率",
      tagFilter: TAG_FILTER_ALL,
      pinnedOnly: false,
      messageIndex,
    });

    expect(result.map((chat) => chat.id)).toEqual([1]);
  });

  it("returns empty when only part of keywords matched", () => {
    const chats = [buildChat({ id: 1, title: "系统设计", model: "deepseek-v3" })];

    const result = filterChats(chats, {
      keyword: "系统 命中率",
      tagFilter: TAG_FILTER_ALL,
      pinnedOnly: false,
      messageIndex: {
        1: "仅包含架构相关内容",
      },
    });

    expect(result).toHaveLength(0);
  });

  it("normalizes case and extra spaces for multi-keyword matching", () => {
    const chats = [buildChat({ id: 1, title: "Cache 命中", model: "DeepSeek-V3" })];

    const result = filterChats(chats, {
      keyword: "  cache   deepseek-v3 ",
      tagFilter: TAG_FILTER_ALL,
      pinnedOnly: false,
      messageIndex: {},
    });

    expect(result.map((chat) => chat.id)).toEqual([1]);
  });

  it("supports untagged filter with invalid tag values", () => {
    const chats = [
      buildChat({ id: 1, tagId: "work" }),
      buildChat({ id: 2, tagId: null }),
      buildChat({ id: 3, tagId: "invalid-tag" }),
    ];

    const result = filterChats(chats, {
      keyword: "",
      tagFilter: TAG_FILTER_UNTAGGED,
      pinnedOnly: false,
      messageIndex: {},
    });

    expect(result.map((chat) => chat.id)).toEqual([2, 3]);
  });

  it("builds tag counts including all and untagged", () => {
    const chats = [
      buildChat({ id: 1, tagId: "work" }),
      buildChat({ id: 2, tagId: null }),
      buildChat({ id: 3, tagId: "work" }),
    ];

    const counts = buildTagFilterCounts(chats);
    expect(counts[TAG_FILTER_ALL]).toBe(3);
    expect(counts[TAG_FILTER_UNTAGGED]).toBe(1);
    expect(counts.work).toBe(2);
  });
});
