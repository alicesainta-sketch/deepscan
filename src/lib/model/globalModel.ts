"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_CHAT_MODEL, normalizeChatModel, type SupportedChatModel } from "./models";

const CHAT_MODEL_STORAGE_KEY = "deepscan:global-chat-model";

const listeners = new Set<() => void>();
let cachedModel: SupportedChatModel = DEFAULT_CHAT_MODEL;
let initialized = false;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const ensureInitialized = () => {
  if (initialized || typeof window === "undefined") return;
  cachedModel = normalizeChatModel(localStorage.getItem(CHAT_MODEL_STORAGE_KEY));
  initialized = true;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  ensureInitialized();

  const onStorage = (event: StorageEvent) => {
    if (event.key !== CHAT_MODEL_STORAGE_KEY) return;
    cachedModel = normalizeChatModel(event.newValue);
    notify();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
};

const getSnapshot = (): SupportedChatModel => {
  ensureInitialized();
  return cachedModel;
};

const getServerSnapshot = (): SupportedChatModel => DEFAULT_CHAT_MODEL;

export const setGlobalChatModel = (model: SupportedChatModel) => {
  cachedModel = model;
  initialized = true;
  if (typeof window !== "undefined") {
    localStorage.setItem(CHAT_MODEL_STORAGE_KEY, model);
  }
  notify();
};

export const useGlobalChatModel = () => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
