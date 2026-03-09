import type { UIMessage } from "ai";

const SAMPLE_CODE = [
  "```ts",
  "export const sum = (a: number, b: number) => a + b;",
  "```",
].join("\n");

/**
 * 生成可复现的长会话数据集，便于在不同版本间做稳定对比。
 */
export const buildSyntheticMessages = (turnCount: number): UIMessage[] => {
  const normalizedTurns = Math.max(1, Math.floor(turnCount));
  const messages: UIMessage[] = [];

  for (let i = 1; i <= normalizedTurns; i += 1) {
    messages.push({
      id: `u_${i}`,
      role: "user",
      parts: [
        {
          type: "text",
          text: `请解释第 ${i} 轮问题，并给出可执行建议。`,
        },
      ],
    } as UIMessage);

    messages.push({
      id: `a_${i}`,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `第 ${i} 轮回答：\n- 结论\n- 方案\n- 风险\n\n代码示例：\n${SAMPLE_CODE}`,
        },
      ],
    } as UIMessage);
  }

  return messages;
};
