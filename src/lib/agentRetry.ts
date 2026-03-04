import type { AgentRun, AgentStep } from "@/types/agent";
import type { KnowledgeSearchResult } from "@/types/knowledge";

export const AGENT_STEP_SEARCH = "本地代码检索";
export const AGENT_STEP_DRAFT = "生成修改方案";
export const AGENT_STEP_VALIDATE = "结果验收";

export type AgentRetryPlan =
  | {
      mode: "search";
      failedStepId: string;
    }
  | {
      mode: "drafting";
      failedStepId: string;
      draftStepId: string;
      validationStepId?: string;
    }
  | {
      mode: "none";
      failedStepId?: undefined;
    };

export const hasFailedStep = (run?: AgentRun | null) =>
  Boolean(run?.steps.some((step) => step.status === "failed"));

export const buildAgentRetryPlan = (run: AgentRun): AgentRetryPlan => {
  const failedStep = run.steps.find((step) => step.status === "failed");
  if (!failedStep) return { mode: "none" };

  if (failedStep.title === AGENT_STEP_SEARCH) {
    return {
      mode: "search",
      failedStepId: failedStep.id,
    };
  }

  if (failedStep.title === AGENT_STEP_DRAFT || failedStep.title === AGENT_STEP_VALIDATE) {
    const draftStep = run.steps.find((step) => step.title === AGENT_STEP_DRAFT);
    if (!draftStep) return { mode: "none" };
    const validationStep = run.steps.find(
      (step) => step.title === AGENT_STEP_VALIDATE
    );
    return {
      mode: "drafting",
      failedStepId: failedStep.id,
      draftStepId: draftStep.id,
      validationStepId: validationStep?.id,
    };
  }

  return { mode: "none" };
};

// Recover lightweight search payload from stored run details for retry context.
export const mapSearchStepDetailsToResults = (
  step?: AgentStep
): KnowledgeSearchResult[] => {
  if (!step?.details?.length) return [];
  return step.details
    .filter((detail) => Boolean(detail.sourceId))
    .map((detail) => ({
      id: detail.sourceId as string,
      name: detail.title,
      score: 0,
      snippet: detail.content,
      matchedTokens: detail.matchTokens ?? [],
    }));
};
