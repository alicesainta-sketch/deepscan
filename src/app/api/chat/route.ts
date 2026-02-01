import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, convertToModelMessages } from "ai";
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const aily = createOpenAICompatible({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.BASE_URL!,
  name: "aily",
});

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  const result = await streamText({
    model: aily(model ?? "deepseek-v3"),
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
