"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 消息区域：可滚动 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 flex flex-col gap-6">
          {messages?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-foreground/50 text-sm">
              <p>发送一条消息开始对话</p>
            </div>
          )}
          {messages?.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-gray-100 dark:bg-gray-800 text-foreground rounded-bl-md"
                }`}
              >
                <div className="text-xs font-medium opacity-80 mb-1">
                  {message.role === "user" ? "你" : "AI"}
                </div>
                <div className="whitespace-pre-wrap break-words">
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <span key={index}>{part.text}</span>
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 输入区：固定在底部 */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="mx-auto max-w-2xl px-4 py-4 flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={status !== "ready" || !input.trim()}
            className="shrink-0 rounded-xl bg-blue-500 text-white px-5 py-3 font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
}
