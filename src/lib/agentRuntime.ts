import { z } from "zod";
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

const agentOutputSchema = z.object({
  summary: z.array(z.string().min(1)).min(1),
  changes: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).min(1),
  tests: z.array(z.string().min(1)).min(1),
});

type AgentOutput = z.infer<typeof agentOutputSchema>;

// Extract JSON from plain text or fenced code blocks for resilient parsing.
const extractJsonFromText = (content: string) => {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return content.slice(start, end + 1).trim();
  }

  return "";
};

const buildValidationDetails = (data: AgentOutput): AgentStepDetail[] => [
  { title: "变更摘要", content: `共 ${data.summary.length} 条` },
  { title: "文件改动清单", content: `共 ${data.changes.length} 条` },
  { title: "风险", content: `共 ${data.risks.length} 条` },
  { title: "测试建议", content: `共 ${data.tests.length} 条` },
];

const formatIssues = (issues: z.ZodIssue[]) =>
  issues.map((issue) => {
    const path = issue.path.join(".") || "root";
    return `${path}: ${issue.message}`;
  });

// Validate structured output and produce summaries for the UI.
export const validateAgentOutput = (content: string) => {
  const raw = extractJsonFromText(content);
  if (!raw) {
    return {
      ok: false,
      summary: "未检测到可解析 JSON",
      issues: ["未检测到 JSON 输出"],
      details: [
        {
          title: "提示",
          content: "请输出符合约定结构的 JSON。",
        },
      ],
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = agentOutputSchema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        summary: "结构化校验未通过",
        issues: formatIssues(result.error.issues),
        details: result.error.issues.map((issue) => ({
          title: "缺失/错误字段",
          content: `${issue.path.join(".") || "root"}: ${issue.message}`,
        })),
      };
    }

    const summary = result.data.summary.join("；");
    return {
      ok: true,
      summary: summary || "结构化输出通过",
      issues: [],
      details: buildValidationDetails(result.data),
    };
  } catch {
    return {
      ok: false,
      summary: "JSON 解析失败",
      issues: ["JSON 解析失败"],
      details: [
        {
          title: "提示",
          content: "请确认输出为合法 JSON，且包含 summary/changes/risks/tests。",
        },
      ],
    };
  }
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

  const validationStep = createStep({
    title: "结果验收",
    status: "pending",
  });

  return {
    id: createId(),
    sessionId: params.sessionId,
    title: planSummary,
    prompt: params.prompt,
    status: "running",
    createdAt: now,
    updatedAt: now,
    steps: [analysisStep, searchStep, draftingStep, validationStep],
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
    sourceId: result.id,
    matchTokens: result.matchedTokens,
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
  return (
    `你是前端代码助手（Agent 模式）。请基于上下文输出可执行改动方案。\n` +
    `要求：输出 JSON，字段为 summary/changes/risks/tests，均为字符串数组。\n` +
    `示例：{"summary":["..."],"changes":["path: desc"],"risks":["..."],"tests":["..."]}。\n` +
    `除 JSON 外不要输出任何解释文字，风格：${answerStyle}。`
  );
};

export const getStepByTitle = (run: AgentRun, title: string) =>
  run.steps.find((step) => step.title === title);

export const summarizeAssistantResponse = (content: string) =>
  summarizePrompt(content.replace(/\s+/g, " "), 32);
