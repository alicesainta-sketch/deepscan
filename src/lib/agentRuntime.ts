import type { AgentRun, AgentStep, AgentStepDetail } from "@/types/agent";
import type { KnowledgeDocument, KnowledgeSearchResult } from "@/types/knowledge";
import type { AgentSettings } from "@/lib/agentSettings";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const summarizePrompt = (prompt: string, limit = 26) => {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= limit) return trimmed || "新任务";
  return `${trimmed.slice(0, limit)}…`;
};

// Extract a short keyword list for the search step summary.
const buildSearchQueryHint = (prompt: string) => {
  const tokens = prompt
    .replace(/[\n\t]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  return tokens.slice(0, 6).join(" ");
};

const createStep = (partial: Partial<AgentStep> & { title: string }) => {
  return {
    id: createId(),
    status: "pending",
    ...partial,
  } as AgentStep;
};

// Initialize a run with stable step IDs so UI can track updates.
export const createAgentRun = (params: {
  sessionId: string;
  prompt: string;
  settings: AgentSettings;
}): AgentRun => {
  const now = Date.now();
  const planSummary = summarizePrompt(params.prompt);

  const analysisStep = createStep({
    title: "解析需求",
    status: "success",
    startedAt: now,
    endedAt: now,
    outputSummary: planSummary,
  });

  const searchStep = createStep({
    title: "本地代码检索",
    status: "running",
    toolName: "code_search",
    startedAt: now,
    inputSummary:
      buildSearchQueryHint(params.prompt) || "基于用户描述检索",
  });

  const draftingStep = createStep({
    title: "生成修改方案",
    status: "pending",
    toolName: "change_plan",
  });

  return {
    id: createId(),
    sessionId: params.sessionId,
    title: planSummary,
    prompt: params.prompt,
    status: "running",
    createdAt: now,
    updatedAt: now,
    steps: [analysisStep, searchStep, draftingStep],
  };
};

export const updateAgentRunStep = (
  run: AgentRun,
  stepId: string,
  patch: Partial<AgentStep>
): AgentRun => {
  const updatedSteps = run.steps.map((step) =>
    step.id === stepId ? { ...step, ...patch } : step
  );

  return {
    ...run,
    steps: updatedSteps,
    updatedAt: Date.now(),
  };
};

export const finalizeAgentRun = (run: AgentRun, status: AgentRun["status"]) => ({
  ...run,
  status,
  updatedAt: Date.now(),
});

const formatResultDetails = (
  results: KnowledgeSearchResult[]
): AgentStepDetail[] => {
  return results.map((result) => ({
    title: result.name,
    content: result.snippet,
    meta: `命中词: ${result.matchedTokens.join("/")}`,
  }));
};

export const attachSearchResults = (
  run: AgentRun,
  stepId: string,
  results: KnowledgeSearchResult[]
): AgentRun => {
  const outputSummary =
    results.length > 0
      ? `命中 ${results.length} 个片段`
      : "未命中任何片段";

  return updateAgentRunStep(run, stepId, {
    status: "success",
    endedAt: Date.now(),
    outputSummary,
    details: results.length > 0 ? formatResultDetails(results) : undefined,
  });
};

export const attachSearchFailure = (run: AgentRun, stepId: string, reason: string) => {
  return updateAgentRunStep(run, stepId, {
    status: "failed",
    endedAt: Date.now(),
    error: reason,
    outputSummary: "检索失败",
  });
};

export const startDraftingStep = (run: AgentRun, stepId: string) => {
  return updateAgentRunStep(run, stepId, {
    status: "running",
    startedAt: Date.now(),
    outputSummary: "生成中…",
  });
};

export const finishDraftingStep = (
  run: AgentRun,
  stepId: string,
  summary: string
) => {
  return updateAgentRunStep(run, stepId, {
    status: "success",
    endedAt: Date.now(),
    outputSummary: summary,
  });
};

export const failDraftingStep = (
  run: AgentRun,
  stepId: string,
  reason: string
) => {
  return updateAgentRunStep(run, stepId, {
    status: "failed",
    endedAt: Date.now(),
    error: reason,
    outputSummary: "生成失败",
  });
};

const formatAnswerStyle = (style: AgentSettings["answerStyle"]) => {
  if (style === "concise") return "简洁";
  if (style === "detailed") return "详细";
  return "平衡";
};

// Build a compact context block for the LLM request.
export const buildAgentContext = (params: {
  docs: KnowledgeDocument[];
  results: KnowledgeSearchResult[];
  settings: AgentSettings;
}) => {
  const sections: string[] = [];

  if (params.settings.includeFileOutline) {
    const fileList = params.docs
      .slice(0, 20)
      .map((doc) => `- ${doc.name}`)
      .join("\n");
    if (fileList) {
      sections.push(`文件列表（Top 20）:\n${fileList}`);
    }
  }

  if (params.results.length > 0) {
    const snippets = params.results
      .map((result) => `# ${result.name}\n${result.snippet}`)
      .join("\n\n");
    sections.push(`命中片段:\n${snippets}`);
  } else {
    sections.push("未命中任何片段，请基于常见工程实践给出建议。");
  }

  return sections.join("\n\n");
};

export const buildAgentInstruction = (settings: AgentSettings) => {
  const answerStyle = formatAnswerStyle(settings.answerStyle);
  return `你是前端代码助手（Agent 模式）。请基于上下文输出可执行改动方案。\n` +
    `要求：输出“变更摘要 / 文件改动清单 / 风险 / 测试建议”，风格：${answerStyle}。`;
};

export const getStepByTitle = (run: AgentRun, title: string) =>
  run.steps.find((step) => step.title === title);

export const summarizeAssistantResponse = (content: string) =>
  summarizePrompt(content.replace(/\s+/g, " "), 32);
