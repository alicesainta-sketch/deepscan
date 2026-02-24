import { DefaultChatTransport } from "ai";
import type { ChatTransport, UIMessage } from "ai";

const PROVIDER_STORAGE_KEY = "deepscan:chat-provider:v1";
const DEFAULT_AUTH_HEADER = "Authorization";
const DEFAULT_AUTH_PREFIX = "Bearer ";

export type ChatProviderConfig = {
  apiUrl: string;
  label?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  apiKeyPrefix?: string;
};

export const DEFAULT_CHAT_PROVIDER_CONFIG: ChatProviderConfig = {
  apiUrl: "/api/chat",
  label: "server",
  apiKey: "",
  apiKeyHeader: DEFAULT_AUTH_HEADER,
  apiKeyPrefix: DEFAULT_AUTH_PREFIX,
};

const normalizeConfig = (config: Partial<ChatProviderConfig> | null) => {
  if (!config || typeof config.apiUrl !== "string" || !config.apiUrl.trim()) {
    return DEFAULT_CHAT_PROVIDER_CONFIG;
  }
  return {
    apiUrl: config.apiUrl.trim(),
    label: typeof config.label === "string" ? config.label : undefined,
    apiKey: typeof config.apiKey === "string" ? config.apiKey : "",
    apiKeyHeader:
      typeof config.apiKeyHeader === "string" && config.apiKeyHeader.trim()
        ? config.apiKeyHeader.trim()
        : DEFAULT_AUTH_HEADER,
    apiKeyPrefix:
      typeof config.apiKeyPrefix === "string"
        ? config.apiKeyPrefix
        : DEFAULT_AUTH_PREFIX,
  };
};

const buildHeaders = (config: ChatProviderConfig) => {
  if (!config.apiKey) return undefined;
  const headerName = config.apiKeyHeader?.trim() || DEFAULT_AUTH_HEADER;
  const prefix =
    config.apiKeyPrefix !== undefined ? config.apiKeyPrefix : DEFAULT_AUTH_PREFIX;
  return {
    [headerName]: `${prefix}${config.apiKey}`,
  } as Record<string, string>;
};

export const loadChatProviderConfig = (): ChatProviderConfig => {
  if (typeof window === "undefined") return DEFAULT_CHAT_PROVIDER_CONFIG;
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return DEFAULT_CHAT_PROVIDER_CONFIG;
    return normalizeConfig(JSON.parse(raw) as Partial<ChatProviderConfig>);
  } catch {
    return DEFAULT_CHAT_PROVIDER_CONFIG;
  }
};

export const saveChatProviderConfig = (config: ChatProviderConfig) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(config));
};

class LocalStorageChatTransport implements ChatTransport<UIMessage> {
  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]
  ) {
    const config = loadChatProviderConfig();
    const transport = new DefaultChatTransport({
      api: config.apiUrl,
      headers: buildHeaders(config),
    });
    return transport.sendMessages(options);
  }

  async reconnectToStream(
    options: Parameters<ChatTransport<UIMessage>["reconnectToStream"]>[0]
  ) {
    const config = loadChatProviderConfig();
    const transport = new DefaultChatTransport({
      api: config.apiUrl,
      headers: buildHeaders(config),
    });
    return transport.reconnectToStream(options);
  }
}

export const createChatTransport = (
  override?: Partial<ChatProviderConfig> | null
): ChatTransport<UIMessage> => {
  if (override) {
    const config = normalizeConfig(override);
    return new DefaultChatTransport({
      api: config.apiUrl,
      headers: buildHeaders(config),
    });
  }
  return new LocalStorageChatTransport();
};
