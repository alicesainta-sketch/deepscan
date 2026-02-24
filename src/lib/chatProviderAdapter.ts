import { DefaultChatTransport } from "ai";
import type { ChatTransport, UIMessage } from "ai";

const PROVIDER_STORAGE_KEY = "deepscan:chat-provider:v1";

export type ChatProviderConfig = {
  apiUrl: string;
  label?: string;
};

const getDefaultConfig = (): ChatProviderConfig => ({
  apiUrl: "/api/chat",
  label: "server",
});

const normalizeConfig = (config: Partial<ChatProviderConfig> | null) => {
  if (!config || typeof config.apiUrl !== "string" || !config.apiUrl.trim()) {
    return getDefaultConfig();
  }
  return {
    apiUrl: config.apiUrl.trim(),
    label: typeof config.label === "string" ? config.label : undefined,
  };
};

export const loadChatProviderConfig = (): ChatProviderConfig => {
  if (typeof window === "undefined") return getDefaultConfig();
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return getDefaultConfig();
    return normalizeConfig(JSON.parse(raw) as Partial<ChatProviderConfig>);
  } catch {
    return getDefaultConfig();
  }
};

export const saveChatProviderConfig = (config: ChatProviderConfig) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(config));
};

export const createChatTransport = (
  override?: Partial<ChatProviderConfig> | null
): ChatTransport<UIMessage> => {
  const config = override ? normalizeConfig(override) : loadChatProviderConfig();
  return new DefaultChatTransport({ api: config.apiUrl });
};
