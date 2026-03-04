const CHAT_INPUT_DRAFT_PREFIX = "deepscan:chat-input-draft:";

export const getChatInputDraftStorageKey = (sessionId: string) =>
  `${CHAT_INPUT_DRAFT_PREFIX}${sessionId}`;

export const readChatInputDraft = (sessionId: string) => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(getChatInputDraftStorageKey(sessionId)) ?? "";
};

export const writeChatInputDraft = (sessionId: string, draft: string) => {
  if (typeof window === "undefined") return;
  if (!draft.trim()) {
    localStorage.removeItem(getChatInputDraftStorageKey(sessionId));
    return;
  }
  localStorage.setItem(getChatInputDraftStorageKey(sessionId), draft);
};

export const clearChatInputDraft = (sessionId: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getChatInputDraftStorageKey(sessionId));
};
