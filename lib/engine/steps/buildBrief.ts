import { briefCacheKey, briefToDirectives, buildDesignBrief } from "@/lib/intent/brief";
import type { ReferencePerception } from "@/lib/intent/perceive";
import { intentReferencesFor, type BriefCheckpoint, type EngineStep } from "../types";

/**
 * Intent → brief (1.4): output type and goal from the classifier (0.2), roles
 * per reference (explicit > annotation > inferred from perception; muted →
 * "ignore"), conflicts between references and at most 3 questions, plus the
 * directives the brief implies (with provenance) and its taste cache key.
 */
export const buildBrief: EngineStep<"buildBrief"> = {
  key: "buildBrief",
  async run({ input, deps, checkpoints, progress }) {
    await progress("brief");
    const assets = checkpoints.resolveAssets?.assets ?? [];
    const perceptions: Record<string, ReferencePerception> = {};
    for (const entry of checkpoints.analyzeReferences?.analyses ?? []) perceptions[entry.referenceId] = entry.perception;

    const explicitRoles = new Map(assets.filter((a) => a.roles?.length).map((a) => [a.id, a.roles as string[]]));
    const intentProfile = await deps.classifyIntent({
      prompt: input.prompt,
      siteType: input.siteType,
      references: intentReferencesFor(assets, explicitRoles),
    });
    const isApp = intentProfile.outputType === "web-app-ui" || intentProfile.outputType === "mobile-app-ui";
    const kind: BriefCheckpoint["kind"] = input.mode === "auto" ? (isApp ? "screen-set" : "screen") : input.mode;
    const breakpoint = input.breakpoint ?? (intentProfile.outputType === "mobile-app-ui" ? "mobile" : "desktop");

    const brief = buildDesignBrief({
      prompt: input.prompt,
      intentProfile,
      references: assets.map((asset) => ({
        id: asset.id,
        weight: asset.weight,
        annotation: asset.annotation,
        roles: asset.roles,
        regions: asset.regions,
      })),
      perceptions,
      answers: input.answers,
    });
    if (brief.questions.some((q) => !q.answer)) {
      await progress("brief-questions", `${brief.questions.filter((q) => !q.answer).length}`);
    }
    const saved = await deps.saveBrief?.(brief).catch(() => null);
    return {
      brief,
      ...(saved?.briefId ? { briefId: saved.briefId } : {}),
      cacheKey: briefCacheKey(brief),
      directives: briefToDirectives(brief, perceptions),
      intentProfile,
      intentClassification: {
        outputType: intentProfile.outputType,
        businessGoal: intentProfile.businessGoal,
        confidence: intentProfile.confidence,
        alternatives: intentProfile.alternatives ?? [],
      },
      kind,
      breakpoint,
    };
  },
};
