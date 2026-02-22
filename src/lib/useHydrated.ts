import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let hydrated = false;

const markHydrated = () => {
  if (hydrated) return;
  hydrated = true;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(markHydrated);
  }
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => hydrated;
const getServerSnapshot = () => false;

export const useHydrated = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
