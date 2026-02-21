import { deleteChat } from "@/index";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const chatIdRaw = body?.chatId;
  const chatId =
    typeof chatIdRaw === "number"
      ? chatIdRaw
      : typeof chatIdRaw === "string"
        ? Number(chatIdRaw)
        : NaN;

  if (!Number.isInteger(chatId) || chatId <= 0) {
    return Response.json({ error: "Invalid chatId" }, { status: 400 });
  }

  const removed = await deleteChat(userId, chatId);
  if (!removed) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
