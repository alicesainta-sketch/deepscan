"use client";

import { useChat } from "@ai-sdk/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import EastIcon from "@mui/icons-material/East";

export default function Page() {
  const params = useParams();
  const chatId = params?.chat_id as string | undefined;
  const [input, setInput] = useState("");
  const [model, setModel] = useState("deepseek-v3");
  const { messages, sendMessage, error } = useChat({
    id: chatId,
    onError: (err) => console.error("Chat error:", err),
  });
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
    <div className="flex flex-col h-screen justify-between items-center">
      <div className="flex flex-col w-2/3 gap-8 overflow-auto justify-between flex-1">
        <div className="h-4"></div>
        {error && <p className="text-red-600 text-sm px-2">{error.message}</p>}
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

        {/* <form onSubmit={handleSubmit}>
          <input
            name="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit">Submit</button>
        </form> */}

        {/* 输入框 */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-center mt-4 shadow-lg border-[1px] border-gray-300 h-32 rounded-lg"
        >
          <textarea
            className="w-full rounded-lg p-3 h-30 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          ></textarea>
          <div className="flex flex-row items-center justify-between w-full h-12 mb-2">
            <div>
              <div
                className={`flex flex-row items-center justify-center rounded-lg border-[1px]
            px-2 py-1 ml-2 cursor-pointer ${
              model === "deepseek-r1"
                ? "border-blue-300 bg-blue-200"
                : "border-gray-300"
            }`}
                onClick={handleChangeModel}
              >
                <p className="text-sm">深度思考（R1）</p>
              </div>
            </div>
            <button
              type="submit"
              className="flex items-center justify-center border-2 mr-4 border-black p-1 rounded-full"
            >
              <EastIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
