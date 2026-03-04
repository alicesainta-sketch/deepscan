import { describe, expect, it } from "vitest";
import type { AgentRun, AgentStep } from "@/types/agent";
import {
  AGENT_STEP_DRAFT,
  AGENT_STEP_SEARCH,
  AGENT_STEP_VALIDATE,
  buildAgentRetryPlan,
  hasFailedStep,
  mapSearchStepDetailsToResults,
} from "./agentRetry";

const buildStep = (partial: Partial<AgentStep> & { id: string; title: string }): AgentStep => ({
  id: partial.id,
  title: partial.title,
  status: partial.status ?? "pending",
  details: partial.details,
  error: partial.error,
  inputSummary: partial.inputSummary,
  outputSummary: partial.outputSummary,
});

const buildRun = (steps: AgentStep[]): AgentRun => ({
  id: "r1",
  sessionId: "s1",
  title: "run",
  prompt: "prompt",
  status: "failed",
  createdAt: 1,
  updatedAt: 1,
  steps,
});

describe("agentRetry", () => {
  it("returns search retry plan when search step failed first", () => {
    const run = buildRun([
      buildStep({ id: "s1", title: AGENT_STEP_SEARCH, status: "failed" }),
      buildStep({ id: "s2", title: AGENT_STEP_DRAFT, status: "pending" }),
    ]);
    const plan = buildAgentRetryPlan(run);
    expect(plan.mode).toBe("search");
  });

  it("returns drafting retry plan when validation step failed", () => {
    const run = buildRun([
      buildStep({ id: "s1", title: AGENT_STEP_SEARCH, status: "success" }),
      buildStep({ id: "s2", title: AGENT_STEP_DRAFT, status: "success" }),
      buildStep({ id: "s3", title: AGENT_STEP_VALIDATE, status: "failed" }),
    ]);
    const plan = buildAgentRetryPlan(run);
    expect(plan.mode).toBe("drafting");
    if (plan.mode === "drafting") {
      expect(plan.draftStepId).toBe("s2");
      expect(plan.validationStepId).toBe("s3");
    }
  });

  it("detects failed steps and maps detail snippets for retry context", () => {
    const run = buildRun([
      buildStep({ id: "s1", title: AGENT_STEP_SEARCH, status: "success" }),
    ]);
    expect(hasFailedStep(run)).toBe(false);

    const results = mapSearchStepDetailsToResults(
      buildStep({
        id: "s2",
        title: AGENT_STEP_SEARCH,
        details: [
          {
            title: "foo.ts",
            content: "const a = 1",
            sourceId: "doc-1",
            matchTokens: ["a"],
          },
        ],
      })
    );
    expect(results).toEqual([
      {
        id: "doc-1",
        name: "foo.ts",
        score: 0,
        snippet: "const a = 1",
        matchedTokens: ["a"],
      },
    ]);
  });
});
