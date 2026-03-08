export const SUPPORTED_CHAT_MODELS = ["deepseek-v3", "deepseek-r1"] as const;

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];

export const DEFAULT_CHAT_MODEL: SupportedChatModel = "deepseek-v3";

/**
 * 统一模型白名单判断，避免页面和 API 各自维护分散的字符串常量。
 */
export const isSupportedChatModel = (
  value: unknown
): value is SupportedChatModel =>
  typeof value === "string" &&
  (SUPPORTED_CHAT_MODELS as readonly string[]).includes(value);

/**
 * 将外部输入收敛为支持的模型名，非法值自动回退默认模型。
 */
export const normalizeChatModel = (value: unknown): SupportedChatModel => {
  return isSupportedChatModel(value) ? value : DEFAULT_CHAT_MODEL;
};
