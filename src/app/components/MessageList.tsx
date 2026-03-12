"use client";

import { memo, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Virtuoso } from "react-virtuoso";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type MessageListProps = {
  messages: UIMessage[];
  onRegenerate?: (messageId: string) => void;
  canRegenerate?: boolean;
  isStreaming?: boolean;
  scrollerRef?: (element: HTMLElement | Window | null) => void;
};

const getMessageContent = (message: UIMessage) => {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
};

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  const handleCopyCode = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        resetTimerRef.current = setTimeout(() => {
          setCopied(false);
        }, 1500);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={handleCopyCode}
        className="absolute right-2 top-2 z-10 rounded-md border border-slate-500/30 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 opacity-0 transition group-hover:opacity-100"
      >
        {copied ? "已复制" : "复制"}
      </button>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: "0.75rem", fontSize: "0.85rem" }}
        codeTagProps={{ style: { fontFamily: "inherit" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

type MessageCardProps = {
  message: UIMessage;
  onRegenerate?: (messageId: string) => void;
  canRegenerate: boolean;
};

const MessageCard = memo(function MessageCard({
  message,
  onRegenerate,
  canRegenerate,
}: MessageCardProps) {
  const content = getMessageContent(message);
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  const handleCopyText = () => {
    if (!content.trim()) return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    void navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(true);
        resetTimerRef.current = setTimeout(() => {
          setCopied(false);
        }, 1200);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  return (
    <article className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`group relative max-w-[92%] rounded-2xl border px-4 py-3 md:max-w-[86%] ${
          isAssistant
            ? "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            : "border-amber-200 bg-amber-50 text-slate-800 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-100"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
          <span
            className={`font-medium ${
              isAssistant
                ? "text-slate-500 dark:text-slate-400"
                : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {isAssistant ? "Assistant" : "You"}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCopyText}
              className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {copied ? "已复制" : "复制文本"}
            </button>
            {isAssistant && onRegenerate ? (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                disabled={!canRegenerate}
                className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                重新生成
              </button>
            ) : null}
          </div>
        </div>

        {isAssistant ? (
          <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-pre:bg-transparent">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({
                  inline,
                  className,
                  children,
                  ...props
                }: {
                  inline?: boolean;
                  className?: string;
                  children?: ReactNode;
                } & HTMLAttributes<HTMLElement>) {
                  const isInline = Boolean(inline);
                  const raw = String(children ?? "");
                  if (isInline) {
                    return (
                      <code
                        className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] dark:bg-slate-800"
                        {...props}
                      >
                        {raw}
                      </code>
                    );
                  }

                  const matched = /language-(\w+)/.exec(className ?? "");
                  const language = matched ? matched[1] : "text";
                  return <CodeBlock code={raw.replace(/\n$/, "")} language={language} />;
                },
                p: ({ children }: { children?: ReactNode }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }: { children?: ReactNode }) => (
                  <ul className="my-2 list-disc pl-5">{children}</ul>
                ),
                ol: ({ children }: { children?: ReactNode }) => (
                  <ol className="my-2 list-decimal pl-5">{children}</ol>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6">{content}</p>
        )}
      </div>
    </article>
  );
});

export default function MessageList({
  messages,
  onRegenerate,
  canRegenerate = false,
  isStreaming = false,
  scrollerRef,
}: MessageListProps) {
  return (
    <div className="h-full">
      <Virtuoso
        data={messages}
        followOutput={isStreaming ? "smooth" : false}
        increaseViewportBy={480}
        scrollerRef={scrollerRef}
        itemContent={(_, message) => (
          <div className="py-2.5">
            <MessageCard
              message={message}
              onRegenerate={onRegenerate}
              canRegenerate={canRegenerate}
            />
          </div>
        )}
      />
    </div>
  );
}
