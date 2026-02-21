import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, convertToModelMessages } from "ai";
import { auth } from "@clerk/nextjs/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const deepseekClient = createOpenAICompatible({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.BASE_URL!,
  name: "deepseek",
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DEEPSEEK_API_KEY || !process.env.BASE_URL) {
    return Response.json(
      { error: "Missing DEEPSEEK_API_KEY or BASE_URL" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const model =
      body?.model === "deepseek-r1" || body?.model === "deepseek-v3"
        ? body.model
        : "deepseek-v3";

    const result = await streamText({
      model: deepseekClient(model),
      system: "You are a helpful assistant.",
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
