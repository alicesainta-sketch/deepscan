"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";

interface MessageListProps {
  messages: UIMessage[];
  onEditMessage?: (message: UIMessage) => void;
  editingMessageId?: string | null;
  highlightedMessageIds?: Set<string>;
  activeMessageId?: string | null;
}

function getMessageContent(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function CodeBlock({
  children,
  className,
}: {
  children?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className ?? "");
  const code = String(children ?? "").replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative my-2 overflow-hidden rounded-lg">
      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <SyntaxHighlighter
        language={match ? match[1] : "text"}
        style={vscDarkPlus}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
        }}
        codeTagProps={{ style: { fontFamily: "inherit" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageList({
  messages,
  onEditMessage,
  editingMessageId,
  highlightedMessageIds,
  activeMessageId,
}: MessageListProps) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onEditMessage={onEditMessage}
          isEditing={editingMessageId === message.id}
          isMatch={highlightedMessageIds?.has(message.id) ?? false}
          isActiveMatch={activeMessageId === message.id}
        />
      ))}
    </div>
  );
}

function MessageItem({
  message,
  onEditMessage,
  isEditing,
  isMatch,
  isActiveMatch,
}: {
  message: UIMessage;
  onEditMessage?: (message: UIMessage) => void;
  isEditing: boolean;
  isMatch: boolean;
  isActiveMatch: boolean;
}) {
  const isAssistant = message.role === "assistant";
  const content = getMessageContent(message);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongMessage =
    content.length > 1200 || content.split(/\n/).length > 14;

  const handleCopy = () => {
    if (!content.trim()) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      data-message-id={message.id}
      className={`group flex scroll-mt-24 ${
        isAssistant ? "justify-start md:pr-12" : "justify-end md:pl-12"
      }`}
    >
      <div
        className={`max-w-[92%] rounded-lg px-4 py-2 md:max-w-[85%] ${
          isAssistant
            ? "bg-blue-100 text-gray-900 dark:bg-blue-900/30 dark:text-slate-100"
            : "bg-slate-200 text-gray-900 dark:bg-slate-700 dark:text-slate-100"
        } ${
          isEditing
            ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-white dark:ring-blue-700 dark:ring-offset-slate-900"
            : isActiveMatch
              ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-amber-500 dark:ring-offset-slate-900"
              : isMatch
                ? "ring-1 ring-amber-300 ring-offset-2 ring-offset-white dark:ring-amber-700 dark:ring-offset-slate-900"
            : ""
        }`}
      >
        <div
          className={`relative ${
            isLongMessage && !isExpanded ? "max-h-40 overflow-hidden" : ""
          }`}
        >
          <div className="prose prose-sm max-w-none break-words dark:prose-invert">
            {isAssistant ? (
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
                    children?: React.ReactNode;
                  }) {
                    const isInline = Boolean(inline);
                    if (isInline) {
                      return (
                        <code
                          className="rounded bg-gray-200 px-1 py-0.5 font-mono text-sm dark:bg-slate-700"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <CodeBlock className={className}>
                        {String(children).replace(/\n$/, "")}
                      </CodeBlock>
                    );
                  },
                  p: ({ children }: { children?: React.ReactNode }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }: { children?: React.ReactNode }) => (
                    <ul className="my-2 list-disc pl-5">{children}</ul>
                  ),
                  ol: ({ children }: { children?: React.ReactNode }) => (
                    <ol className="my-2 list-decimal pl-5">{children}</ol>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <div className="whitespace-pre-wrap text-sm">{content}</div>
            )}
          </div>
          {isLongMessage && !isExpanded ? (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t ${
                isAssistant
                  ? "from-blue-100 dark:from-blue-900/30"
                  : "from-slate-200 dark:from-slate-700"
              } to-transparent`}
            />
          ) : null}
        </div>
        <div className="mt-2 flex justify-end gap-2">
          {isLongMessage ? (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100 focus:opacity-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isExpanded ? "收起" : "展开"}
            </button>
          ) : null}
          {!isAssistant && onEditMessage ? (
            <button
              type="button"
              onClick={() => onEditMessage(message)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100 focus:opacity-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              编辑
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100 focus:opacity-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {copied ? "已复制" : "复制文本"}
          </button>
        </div>
      </div>
    </div>
  );
}
