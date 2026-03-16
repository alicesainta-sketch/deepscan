export const SUPPORTED_CHAT_MODELS = ["deepseek-v3", "deepseek-r1"] as const;

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];

export const DEFAULT_CHAT_MODEL: SupportedChatModel = "deepseek-v3";

export const isSupportedChatModel = (value: unknown): value is SupportedChatModel =>
  typeof value === "string" && (SUPPORTED_CHAT_MODELS as readonly string[]).includes(value);

export const normalizeChatModel = (value: unknown): SupportedChatModel => {
  return isSupportedChatModel(value) ? value : DEFAULT_CHAT_MODEL;
};
