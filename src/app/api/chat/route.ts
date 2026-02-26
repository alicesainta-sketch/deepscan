import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, convertToModelMessages } from "ai";
import { auth } from "@clerk/nextjs/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const getDeepseekClient = (apiKey: string, baseURL: string) =>
  createOpenAICompatible({
    apiKey,
    baseURL,
    name: "deepseek",
  });

export async function POST(req: Request) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
  // Only enforce login when Clerk is configured; otherwise allow guest access.
  if (clerkEnabled) {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.BASE_URL;
  if (!apiKey || !baseURL) {
    return Response.json(
      { error: "Missing DEEPSEEK_API_KEY or BASE_URL" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const payload =
    body && typeof body === "object"
      ? (body as { messages?: unknown; model?: unknown })
      : {};
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const model =
    payload.model === "deepseek-r1" || payload.model === "deepseek-v3"
      ? payload.model
      : "deepseek-v3";

  try {
    const deepseekClient = getDeepseekClient(apiKey, baseURL);
    const result = await streamText({
      model: deepseekClient(model),
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API upstream error:", error);
    return Response.json({ error: "Upstream model request failed" }, { status: 502 });
  }
}
