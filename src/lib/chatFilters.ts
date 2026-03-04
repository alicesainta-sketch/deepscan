import type { ChatModel } from "@/types/chat";
import { normalizeChatTagId } from "./chatTags";
import { normalizeSearchText } from "./searchUtils";

export const TAG_FILTER_ALL = "all";
export const TAG_FILTER_UNTAGGED = "untagged";

export type ChatTagFilter = string;

export type ChatFilterOptions = {
  keyword: string;
  tagFilter: ChatTagFilter;
  pinnedOnly: boolean;
  messageIndex: Record<number, string>;
};

// Keep persisted filter values compatible with current known tag ids.
export const normalizeTagFilterValue = (value: unknown): ChatTagFilter => {
  if (value === TAG_FILTER_ALL || value === TAG_FILTER_UNTAGGED) {
    return value;
  }
  const normalized = normalizeChatTagId(value);
  return normalized ?? TAG_FILTER_ALL;
};

const isChatMatchedByTag = (chat: ChatModel, tagFilter: ChatTagFilter) => {
  if (tagFilter === TAG_FILTER_ALL) return true;
  if (tagFilter === TAG_FILTER_UNTAGGED) return !normalizeChatTagId(chat.tagId);
  return normalizeChatTagId(chat.tagId) === tagFilter;
};

// Split keyword by whitespace and normalize casing for stable "multi-keyword AND" search.
// Edge case: empty/blank keyword should return an empty token list.
const splitKeywordTokens = (keyword: string): string[] => {
  const normalizedKeyword = normalizeSearchText(keyword);
  if (!normalizedKeyword) return [];
  return normalizedKeyword.split(/\s+/).filter(Boolean);
};

const isChatMatchedByKeyword = (
  chat: ChatModel,
  searchTokens: string[],
  messageIndex: Record<number, string>
) => {
  if (searchTokens.length === 0) return true;
  // Combine all searchable fields so each token can match title/model/message in any position.
  const searchableText = [
    normalizeSearchText(chat.title),
    normalizeSearchText(chat.model),
    normalizeSearchText(messageIndex[chat.id] ?? ""),
  ].join(" ");
  return searchTokens.every((token) => searchableText.includes(token));
};

// Compose pinned/tag/keyword rules in a single pass for sidebar rendering.
export const filterChats = (
  chats: ChatModel[],
  options: ChatFilterOptions
): ChatModel[] => {
  const normalizedTagFilter = normalizeTagFilterValue(options.tagFilter);
  const searchTokens = splitKeywordTokens(options.keyword);
  return chats.filter((chat) => {
    if (options.pinnedOnly && !chat.pinned) return false;
    if (!isChatMatchedByTag(chat, normalizedTagFilter)) return false;
    return isChatMatchedByKeyword(chat, searchTokens, options.messageIndex);
  });
};

export const buildTagFilterCounts = (chats: ChatModel[]) => {
  const nextCounts: Record<string, number> = {
    [TAG_FILTER_ALL]: chats.length,
    [TAG_FILTER_UNTAGGED]: 0,
  };
  chats.forEach((chat) => {
    const normalizedTagId = normalizeChatTagId(chat.tagId);
    if (!normalizedTagId) {
      nextCounts[TAG_FILTER_UNTAGGED] += 1;
      return;
    }
    nextCounts[normalizedTagId] = (nextCounts[normalizedTagId] ?? 0) + 1;
  });
  return nextCounts;
};
