import { updateChat } from "@/index";
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

  const title = typeof body?.title === "string" ? body.title : undefined;
  const pinned = typeof body?.pinned === "boolean" ? body.pinned : undefined;

  if (title === undefined && pinned === undefined) {
    return Response.json({ error: "No updatable fields" }, { status: 400 });
  }

  const updated = await updateChat(userId, chatId, { title, pinned });
  if (!updated) {
    return Response.json({ error: "Failed to update chat" }, { status: 404 });
  }

  return Response.json(updated, { status: 200 });
}
