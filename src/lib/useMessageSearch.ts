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
  const clampedActiveIndex =
    matchIds.length === 0
      ? 0
      : Math.min(activeMatchIndex, matchIds.length - 1);
  const activeMatchId =
    matchIds.length > 0 ? matchIds[clampedActiveIndex] : null;

  useEffect(() => {
    if (!activeMatchId || typeof document === "undefined") return;
    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-message-id]")
    ).find((element) => element.dataset.messageId === activeMatchId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchId]);

  const goPrev = () => {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((prev) => {
      const current =
        matchIds.length === 0
          ? 0
          : Math.min(prev, matchIds.length - 1);
      return current === 0 ? matchIds.length - 1 : current - 1;
    });
  };

  const goNext = () => {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((prev) => {
      const current =
        matchIds.length === 0
          ? 0
          : Math.min(prev, matchIds.length - 1);
      return current === matchIds.length - 1 ? 0 : current + 1;
    });
  };

  const clear = () => {
    setQuery("");
    setActiveMatchIndex(0);
  };

  return {
    query,
    setQuery: (value: string) => {
      setQuery(value);
      setActiveMatchIndex(0);
    },
    matchIds,
    matchIdSet,
    activeMatchId,
    activeMatchIndex: clampedActiveIndex,
    goPrev,
    goNext,
    clear,
    normalizedQuery,
  };
};
