export type ChatTag = {
  id: string;
  label: string;
  dotClass: string;
  badgeClass: string;
};

// 标签配置集中在此，便于统一调整文案与颜色样式。
export const CHAT_TAGS: ChatTag[] = [
  {
    id: "work",
    label: "工作",
    dotClass: "bg-blue-500 dark:bg-blue-400",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",
  },
  {
    id: "study",
    label: "学习",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
  {
    id: "code",
    label: "代码",
    dotClass: "bg-violet-500 dark:bg-violet-400",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200",
  },
  {
    id: "product",
    label: "产品",
    dotClass: "bg-orange-500 dark:bg-orange-400",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200",
  },
  {
    id: "meeting",
    label: "会议",
    dotClass: "bg-cyan-500 dark:bg-cyan-400",
    badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200",
  },
  {
    id: "personal",
    label: "个人",
    dotClass: "bg-pink-500 dark:bg-pink-400",
    badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200",
  },
];

const CHAT_TAG_ID_SET = new Set(CHAT_TAGS.map((tag) => tag.id));

// 统一校验标签 id，避免脏数据写入存储。
export const normalizeChatTagId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  return CHAT_TAG_ID_SET.has(value) ? value : null;
};

export const getChatTagById = (tagId?: string | null): ChatTag | null => {
  if (!tagId) return null;
  return CHAT_TAGS.find((tag) => tag.id === tagId) ?? null;
};
