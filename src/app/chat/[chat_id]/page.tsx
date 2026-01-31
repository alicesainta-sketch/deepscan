"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat({});

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length ?? 0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen justify-between items-center">
      <div className="flex flex-col w-2/3 gap-8 overflow-auto justify-between flex-1">
        <div className="h-4"></div>
        <div className="flex flex-col gap-8 flex-1">
          {messages?.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg flex flex-row ${
                message?.role === "assistant"
                  ? "justify-start mr-18"
                  : "justify-end ml-10"
              }`}
            >
              {/* {message.role === "user" ? "User: " : "AI: "}
              {message.parts
                .map((part) => ("text" in part ? part.text : ""))
                .join("")} */}
              <p
                className={`inline-block p-2 rounded-lg ${
                  message?.role === "assistant" ? "bg-blue-300" : "bg-slate-200"
                }`}
              >
                {message.parts
                  .map((part) => ("text" in part ? part.text : ""))
                  .join("")}
              </p>
            </div>
          ))}
        </div>

        <div className="h-4" ref={endRef}></div>

        <form onSubmit={handleSubmit}>
          <input
            name="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
}
