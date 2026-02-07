"use client";

type MessagePart = { text?: string };
type ChatMessage = { id: string; role: string; parts: MessagePart[] };

interface MessageListProps {
  messages: ChatMessage[];
}

function getMessageContent(message: ChatMessage): string {
  return message.parts
    .map((part) => ("text" in part ? part.text : ""))
    .join("");
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        const content = getMessageContent(message);
        return (
          <div
            key={message.id}
            className={`flex flex-row ${
              isAssistant ? "justify-start mr-12" : "justify-end ml-12"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                isAssistant
                  ? "bg-blue-100 text-gray-900"
                  : "bg-slate-200 text-gray-900"
              }`}
            >
              <div className="whitespace-pre-wrap break-words text-sm">
                {content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
