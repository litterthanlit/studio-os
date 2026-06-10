import type { TasteFidelityScore } from "@/lib/canvas/taste-evaluator";
import type { DesignContract } from "@/types/agent-design-harness";
import { createVisualReview } from "@/lib/canvas/agent-design-contract";

export function benchmarkScoreToObservedIssues(score: TasteFidelityScore): string[] {
  const issues: string[] = [];
  if (score.palette < 7) {
    issues.push(`Palette drift detected (${score.palette}/10 vs references).`);
  }
  if (score.typography < 7) {
    issues.push(`Typography does not match reference direction (${score.typography}/10).`);
  }
  if (score.density < 7) {
    issues.push(`Spacing/density mismatch (${score.density}/10).`);
  }
  if (score.structure < 7) {
    issues.push(`Structural patterns do not match archetype or references (${score.structure}/10).`);
  }
  if (score.overall < 7 && score.justification) {
    issues.push(score.justification);
  }
  return issues;
}

export function createVisualReviewFromBenchmarkScore(args: {
  contract: DesignContract;
  screenId: string;
  sourceScreenshot: string;
  comparedAgainstArtboard: string;
  score: TasteFidelityScore;
}) {
  const observedIssues = benchmarkScoreToObservedIssues(args.score);
  return {
    review: createVisualReview({
      contract: args.contract,
      screenId: args.screenId,
      sourceScreenshot: args.sourceScreenshot,
      comparedAgainstArtboard: args.comparedAgainstArtboard,
      observedIssues,
    }),
    benchmarkScore: args.score,
    observedIssues,
  };
}
