"use client";

import { useChat } from "@ai-sdk/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "@/app/components/ChatHeader";
import ErrorDisplay from "@/app/components/ErrorDisplay";
import InputField from "@/app/components/InputField";
import LoadingIndicator from "@/app/components/LoadingIndicator";
import MessageList from "@/app/components/MessageList";

export default function Page() {
  const params = useParams();
  const chatId = params?.chat_id as string | undefined;
  const [input, setInput] = useState("");
  const [model, setModel] = useState("deepseek-v3");
  const { messages, sendMessage, error, status, stop, clearError } = useChat({
    id: chatId,
    onError: (err) => console.error("Chat error:", err),
  });
  const isLoading = status === "streaming" || status === "submitted";
  const handleChangeModel = () => {
    setModel(model === "deepseek-v3" ? "deepseek-r1" : "deepseek-v3");
  };

  const endRef = useRef<HTMLDivElement>(null);
  const messageCount = messages?.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input }, { body: { model } });
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader
        status={isLoading ? "loading" : "idle"}
        model={model}
        onModelToggle={handleChangeModel}
      />
      <div className="flex flex-1 flex-col items-center overflow-hidden">
        <div className="flex w-2/3 flex-1 flex-col gap-4 overflow-auto py-4">
          {error && <ErrorDisplay error={error} onDismiss={clearError} />}
          {messages?.length === 0 && !error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-500">
              <p className="text-sm">开始新对话</p>
              <p className="text-xs">发送一条消息与 AI 助手聊天</p>
            </div>
          ) : (
            <MessageList messages={(messages ?? []) as unknown[]} />
          )}
          {isLoading && (
            <div className="flex justify-start">
              <LoadingIndicator />
            </div>
          )}
          <div ref={endRef} className="h-4" />
        </div>
        <div className="w-2/3 shrink-0 pb-4">
          <InputField
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onStop={stop}
          />
        </div>
      </div>
    </div>
  );
}
