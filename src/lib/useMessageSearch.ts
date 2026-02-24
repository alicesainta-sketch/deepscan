import { useEffect, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/chatMessages";

type MessageSearchState = {
  query: string;
  setQuery: (value: string) => void;
  matchIds: string[];
  matchIdSet: Set<string>;
  activeMatchId: string | null;
  activeMatchIndex: number;
  goPrev: () => void;
  goNext: () => void;
  clear: () => void;
  normalizedQuery: string;
};

export const useMessageSearch = (messages: UIMessage[]): MessageSearchState => {
  const [query, setQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();

  const matchIds = useMemo(() => {
    if (!normalizedQuery) return [];
    return messages
      .filter((message) =>
        getMessageText(message).toLowerCase().includes(normalizedQuery)
      )
      .map((message) => message.id);
  }, [messages, normalizedQuery]);

  const matchIdSet = useMemo(() => new Set(matchIds), [matchIds]);
  const activeMatchId =
    matchIds.length > 0 ? matchIds[activeMatchIndex] : null;

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    if (matchIds.length === 0) {
      setActiveMatchIndex(0);
      return;
    }
    setActiveMatchIndex((prev) => Math.min(prev, matchIds.length - 1));
  }, [matchIds.length]);

  useEffect(() => {
    if (!activeMatchId || typeof document === "undefined") return;
    const target = document.querySelector(
      `[data-message-id="${activeMatchId}"]`
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchId]);

  const goPrev = () => {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((prev) =>
      prev === 0 ? matchIds.length - 1 : prev - 1
    );
  };

  const goNext = () => {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((prev) =>
      prev === matchIds.length - 1 ? 0 : prev + 1
    );
  };

  const clear = () => {
    setQuery("");
  };

  return {
    query,
    setQuery,
    matchIds,
    matchIdSet,
    activeMatchId,
    activeMatchIndex,
    goPrev,
    goNext,
    clear,
    normalizedQuery,
  };
};
