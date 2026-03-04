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

const isChatMatchedByKeyword = (
  chat: ChatModel,
  keyword: string,
  messageIndex: Record<number, string>
) => {
  if (!keyword) return true;
  const normalizedKeyword = normalizeSearchText(keyword);
  if (!normalizedKeyword) return true;
  const messageText = normalizeSearchText(messageIndex[chat.id] ?? "");
  return (
    normalizeSearchText(chat.title).includes(normalizedKeyword) ||
    normalizeSearchText(chat.model).includes(normalizedKeyword) ||
    messageText.includes(normalizedKeyword)
  );
};

// Compose pinned/tag/keyword rules in a single pass for sidebar rendering.
export const filterChats = (
  chats: ChatModel[],
  options: ChatFilterOptions
): ChatModel[] => {
  const normalizedTagFilter = normalizeTagFilterValue(options.tagFilter);
  const normalizedKeyword = normalizeSearchText(options.keyword);
  return chats.filter((chat) => {
    if (options.pinnedOnly && !chat.pinned) return false;
    if (!isChatMatchedByTag(chat, normalizedTagFilter)) return false;
    return isChatMatchedByKeyword(chat, normalizedKeyword, options.messageIndex);
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
