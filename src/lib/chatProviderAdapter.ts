import { DefaultChatTransport } from "ai";
import type { ChatTransport, UIMessage } from "ai";
import type { AgentMessageMetadata } from "@/types/agent";
import { getMessageText } from "@/lib/chatMessages";

const PROVIDER_STORAGE_KEY = "deepscan:chat-provider:v1";
const DEFAULT_AUTH_HEADER = "Authorization";
const DEFAULT_AUTH_PREFIX = "Bearer ";

export type ChatProviderConfig = {
  apiUrl: string;
  label?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  apiKeyPrefix?: string;
  mode?: "server" | "openai-compatible";
  systemPrompt?: string;
};

export const DEFAULT_CHAT_PROVIDER_CONFIG: ChatProviderConfig = {
  apiUrl: "/api/chat",
  label: "server",
  apiKey: "",
  apiKeyHeader: DEFAULT_AUTH_HEADER,
  apiKeyPrefix: DEFAULT_AUTH_PREFIX,
  mode: "server",
  systemPrompt: "You are a helpful assistant.",
};

const normalizeConfig = (config: Partial<ChatProviderConfig> | null) => {
  if (!config || typeof config.apiUrl !== "string" || !config.apiUrl.trim()) {
    return DEFAULT_CHAT_PROVIDER_CONFIG;
  }
  return {
    ...DEFAULT_CHAT_PROVIDER_CONFIG,
    apiUrl: config.apiUrl.trim(),
    label:
      typeof config.label === "string"
        ? config.label
        : DEFAULT_CHAT_PROVIDER_CONFIG.label,
    apiKey: typeof config.apiKey === "string" ? config.apiKey : "",
    apiKeyHeader:
      typeof config.apiKeyHeader === "string" && config.apiKeyHeader.trim()
        ? config.apiKeyHeader.trim()
        : DEFAULT_AUTH_HEADER,
    apiKeyPrefix:
      typeof config.apiKeyPrefix === "string"
        ? config.apiKeyPrefix
        : DEFAULT_AUTH_PREFIX,
    mode:
      config.mode === "openai-compatible" || config.mode === "server"
        ? config.mode
        : DEFAULT_CHAT_PROVIDER_CONFIG.mode,
    systemPrompt:
      typeof config.systemPrompt === "string"
        ? config.systemPrompt
        : DEFAULT_CHAT_PROVIDER_CONFIG.systemPrompt,
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

// Expose auth headers for reuse in embedding requests.
export const buildProviderHeaders = (config: ChatProviderConfig) =>
  buildHeaders(config) ?? {};

const normalizeHeaders = (headers?: HeadersInit) => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
};

// Append agent-only context to transport messages without mutating UI state.
const appendAgentContext = (message: UIMessage) => {
  if (message.role !== "user") return message;
  const metadata = message.metadata as AgentMessageMetadata | undefined;
  const context = metadata?.agent?.context;
  if (!context) return message;
  const extraPart = {
    type: "text",
    text: `\n\n[Agent Context]\n${context}`,
  } as UIMessage["parts"][number];
  return {
    ...message,
    parts: [...message.parts, extraPart],
  };
};

// Prepare messages for transport by injecting metadata-only context blocks.
const prepareMessagesForTransport = (messages: UIMessage[]) =>
  messages.map((message) => appendAgentContext(message));

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

const createChunkId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const mapFinishReason = (value?: string) => {
  if (!value) return undefined;
  if (value === "content_filter") return "content-filter";
  if (value === "tool_calls") return "tool-calls";
  if (
    value === "stop" ||
    value === "length" ||
    value === "content-filter" ||
    value === "tool-calls" ||
    value === "error" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
};

const toOpenAICompatibleMessages = (
  messages: UIMessage[],
  systemPrompt?: string
) => {
  const baseMessages = messages
    .map((message) => ({
      role: message.role,
      content: getMessageText(message),
    }))
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        message.content.length > 0
    );

  if (systemPrompt && systemPrompt.trim().length > 0) {
    return [{ role: "system", content: systemPrompt.trim() }, ...baseMessages];
  }

  return baseMessages;
};

class OpenAICompatibleChatTransport implements ChatTransport<UIMessage> {
  constructor(private readonly config: ChatProviderConfig) {}

  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]
  ) {
    const headers = {
      "Content-Type": "application/json",
      ...buildHeaders(this.config),
      ...normalizeHeaders(options.headers),
    } as Record<string, string>;
    const body = {
      ...(options.body ?? {}),
      model:
        (options.body as { model?: string } | undefined)?.model ??
        "deepseek-v3",
      messages: toOpenAICompatibleMessages(
        prepareMessagesForTransport(options.messages),
        this.config.systemPrompt
      ),
      stream: true,
    };

    const response = await fetch(this.config.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Upstream request failed");
    }

    if (!response.body) {
      throw new Error("Upstream response body is empty");
    }

    const stream = response.body;
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        let buffer = "";
        let textStarted = false;
        let finishReason: string | undefined;
        const textPartId = createChunkId();

        const flushTextEnd = () => {
          if (textStarted) {
            controller.enqueue({ type: "text-end", id: textPartId });
            textStarted = false;
          }
        };

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundaryIndex = buffer.indexOf("\n\n");
            while (boundaryIndex !== -1) {
              const rawEvent = buffer.slice(0, boundaryIndex).trim();
              buffer = buffer.slice(boundaryIndex + 2);
              boundaryIndex = buffer.indexOf("\n\n");

              if (!rawEvent) continue;

              const lines = rawEvent.split(/\r?\n/);
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data) continue;
                if (data === "[DONE]") {
                  flushTextEnd();
                  controller.enqueue({
                    type: "finish",
                    finishReason: mapFinishReason(finishReason),
                  });
                  controller.close();
                  return;
                }

                let payload: {
                  choices?: Array<{
                    delta?: { content?: string };
                    finish_reason?: string | null;
                  }>;
                };
                try {
                  payload = JSON.parse(data) as {
                    choices?: Array<{
                      delta?: { content?: string };
                      finish_reason?: string | null;
                    }>;
                  };
                } catch {
                  continue;
                }

                const delta = payload?.choices?.[0]?.delta?.content ?? "";
                const nextFinishReason = payload?.choices?.[0]?.finish_reason;
                if (nextFinishReason) {
                  finishReason = nextFinishReason;
                }

                if (delta) {
                  if (!textStarted) {
                    controller.enqueue({ type: "text-start", id: textPartId });
                    textStarted = true;
                  }
                  controller.enqueue({
                    type: "text-delta",
                    id: textPartId,
                    delta,
                  });
                }
              }
            }
          }

          flushTextEnd();
          controller.enqueue({
            type: "finish",
            finishReason: mapFinishReason(finishReason),
          });
          controller.close();
        } catch (error) {
          if (options.abortSignal?.aborted) {
            controller.close();
            return;
          }
          controller.enqueue({
            type: "error",
            errorText: error instanceof Error ? error.message : "Stream error",
          });
          controller.close();
        }
      },
    });
  }

  async reconnectToStream() {
    return null;
  }
}

class LocalStorageChatTransport implements ChatTransport<UIMessage> {
  async sendMessages(
    options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]
  ) {
    const config = loadChatProviderConfig();
    const transport =
      config.mode === "openai-compatible"
        ? new OpenAICompatibleChatTransport(config)
        : new DefaultChatTransport({
            api: config.apiUrl,
            headers: buildHeaders(config),
          });
    const preparedOptions =
      config.mode === "openai-compatible"
        ? options
        : {
            ...options,
            messages: prepareMessagesForTransport(options.messages),
          };
    return transport.sendMessages(preparedOptions);
  }

  async reconnectToStream(
    options: Parameters<ChatTransport<UIMessage>["reconnectToStream"]>[0]
  ) {
    const config = loadChatProviderConfig();
    if (config.mode === "openai-compatible") {
      return null;
    }
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
    return config.mode === "openai-compatible"
      ? new OpenAICompatibleChatTransport(config)
      : new DefaultChatTransport({
          api: config.apiUrl,
          headers: buildHeaders(config),
        });
  }
  return new LocalStorageChatTransport();
};
