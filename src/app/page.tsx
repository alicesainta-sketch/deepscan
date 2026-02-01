"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import EastIcon from "@mui/icons-material/East";

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [model, setModel] = useState("deepseek-v3");
  const handleChangeModel = () => {
    setModel(model === "deepseek-v3" ? "deepseek-r1" : "deepseek-v3");
  };
  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/chat/${crypto.randomUUID()}`);
  };

  return (
    <div className="h-screen flex flex-col items-center">
      <div className="h-1/5"></div>
      <div className="w-1/2">
        <p className="font-bold text-2xl text-center">Welcome to DeepScan!</p>
        <div className="flex flex-col justify-center mt-4 shadow-lg border-[1px] border-gray-300 h-32 rounded-lg w-full">
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
            <div
              className="flex items-center justify-center border-2 mr-4 border-black p-1 rounded-full"
              onClick={handleSubmit}
            >
              <EastIcon></EastIcon>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
