"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseClipboardCopyOptions = {
  resetAfterMs?: number;
};

export function useClipboardCopy(options: UseClipboardCopyOptions = {}) {
  const { resetAfterMs = 1200 } = options;
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

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);

  const copy = useCallback(
    async (text: string) => {
      if (!text.trim()) return false;
      if (!isSupported) return false;

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        resetTimerRef.current = setTimeout(() => {
          setCopied(false);
        }, resetAfterMs);
        return true;
      } catch {
        setCopied(false);
        return false;
      }
    },
    [isSupported, resetAfterMs],
  );

  return { copied, copy, isSupported };
}
