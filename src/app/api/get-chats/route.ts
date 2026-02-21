import { getChats } from "@/index";
import { auth } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (userId) {
    const chats = await getChats(userId);
    return Response.json(chats, { status: 200 });
  }
  return Response.json([], { status: 200 });
}
