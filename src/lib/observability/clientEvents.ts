"use client";

type ClientEventPayload = Record<string, unknown>;

type ClientEventRecord = {
  id: string;
  name: string;
  at: number;
  payload: ClientEventPayload;
};

const EVENTS_STORAGE_KEY = "deepscan:client-events";
const MAX_EVENT_COUNT = 200;

const readEvents = (): ClientEventRecord[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ClientEventRecord[]) : [];
  } catch {
    return [];
  }
};

export const recordClientEvent = (name: string, payload: ClientEventPayload = {}) => {
  if (typeof window === "undefined") return;
  const record: ClientEventRecord = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    at: Date.now(),
    payload,
  };
  const events = readEvents();
  const nextEvents = [...events, record].slice(-MAX_EVENT_COUNT);
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(nextEvents));
};
