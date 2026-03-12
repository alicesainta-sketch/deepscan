import {
  normalizeChatPayload,
  resolveChatGatewayConfig,
  streamChatWithGateway,
} from "@/lib/model/chatGateway";
import { recordServerEvent } from "@/lib/observability/serverEvents";

export const maxDuration = 30;

export async function POST(req: Request) {
  const requestStartedAt = Date.now();
  let gatewayConfig: ReturnType<typeof resolveChatGatewayConfig>;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const payload = normalizeChatPayload(body);

  try {
    gatewayConfig = resolveChatGatewayConfig();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Missing model config" },
      { status: 500 }
    );
  }

  recordServerEvent("chat.request.received", {
    model: payload.model,
    messageCount: payload.messages.length,
    hasAgentContext: Boolean(payload.agentContext),
  });

  try {
    const result = await streamChatWithGateway(payload, gatewayConfig);

    recordServerEvent("chat.stream.started", {
      model: payload.model,
      elapsedMs: Date.now() - requestStartedAt,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API upstream error:", error);
    recordServerEvent("chat.stream.failed", {
      model: payload.model,
      elapsedMs: Date.now() - requestStartedAt,
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return Response.json({ error: "Upstream model request failed" }, { status: 502 });
  }
}
