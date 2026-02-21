import { createChat } from "@/index";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { title, model } = await req.json();
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  if (!trimmedTitle) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const selectedModel =
    model === "deepseek-r1" || model === "deepseek-v3" ? model : "deepseek-v3";

  const newChat = await createChat(trimmedTitle, userId, selectedModel);
  if (!newChat) {
    return Response.json({ error: "Failed to create chat" }, { status: 500 });
  }

  return Response.json({ id: newChat.id }, { status: 200 });
}
