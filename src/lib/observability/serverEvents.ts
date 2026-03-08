type ServerEventPayload = Record<string, unknown>;

/**
 * 记录服务端关键事件，先使用结构化日志沉淀链路，后续可平滑接入日志平台。
 */
export const recordServerEvent = (
  name: string,
  payload: ServerEventPayload = {}
) => {
  const record = {
    name,
    at: Date.now(),
    payload,
  };

  console.info("[deepscan:event]", JSON.stringify(record));
};
