"use client";

import Image from "next/image";
import { useState } from "react";
import EastIcon from "@mui/icons-material/East";

export default function Home() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState("deepseek-v3");

  return (
    <div className="h-screen flex flex-col items-center">
      <div className="h-1/5"></div>
      <div className="w-1/2">
        <p className="font-bold text-2xl text-center">Welcome to DeepScan!</p>
        <div className="flex flex-col items-center justify-center mt-4 shadow-lg border-[1px] border-gray-300 h-32 rounded-lg">
          <textarea
            className="w-full rounded-lg p-3 h-30 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          ></textarea>
          <div className="flex flex-row items-center justify-between w-full h-12 mb-2">
            <div>
              <div
                className={`flex flex-row items-center justify-center rounded-lg border-[1px]
            px-2 py-1 ml-2 cursor-pointer ${model === "deepseek-r1" ? "border-blue-300 bg-blue-200" : "border-gray-300"}`}
              >
                <p className="text-sm">深度思考（R1）</p>
              </div>
            </div>
            <div className="flex items-center justify-center border-2 mr-4 border-black p-1 rounded-full">
              <EastIcon></EastIcon>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
