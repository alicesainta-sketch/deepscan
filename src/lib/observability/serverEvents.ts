type ServerEventPayload = Record<string, unknown>;

export const recordServerEvent = (name: string, payload: ServerEventPayload = {}) => {
  const record = {
    name,
    at: Date.now(),
    payload,
  };

  console.info("[deepscan:event]", JSON.stringify(record));
};
