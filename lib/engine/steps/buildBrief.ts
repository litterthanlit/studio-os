import type { BriefOutputType, BriefReference, ReferenceRole } from "@/lib/design-memory/types";
import type { IntentReferenceRole } from "@/types/intent-profile";
import { intentReferencesFor, type BriefCheckpoint, type EngineStep } from "../types";

const ROLE_MAP: Record<IntentReferenceRole, ReferenceRole> = {
  layout: "layout",
  palette: "color",
  typography: "typography",
  mood: "mood",
  imagery: "imagery",
  component: "components",
  interaction: "components",
};

function toBriefOutputType(outputType: string): BriefOutputType {
  if (outputType === "component-gallery") return "component";
  return (["marketing-site", "web-app-ui", "mobile-app-ui", "component", "multi-page-site"].includes(outputType)
    ? outputType
    : "marketing-site") as BriefOutputType;
}

/**
 * Intent → brief: output type and goal from the classifier (0.2), one entry per
 * reference with its weight and role (muted references are recorded as
 * "ignore"). Conflicts and questions are filled by the Intent Engine (1.4).
 */
export const buildBrief: EngineStep<"buildBrief"> = {
  key: "buildBrief",
  async run({ input, deps, checkpoints, progress }) {
    await progress("brief");
    const assets = checkpoints.resolveAssets?.assets ?? [];
    const intentProfile = await deps.classifyIntent({
      prompt: input.prompt,
      siteType: input.siteType,
      references: intentReferencesFor(assets),
    });
    const isApp = intentProfile.outputType === "web-app-ui" || intentProfile.outputType === "mobile-app-ui";
    const kind: BriefCheckpoint["kind"] = input.mode === "auto" ? (isApp ? "screen-set" : "screen") : input.mode;
    const breakpoint = input.breakpoint ?? (intentProfile.outputType === "mobile-app-ui" ? "mobile" : "desktop");

    const rolesById = new Map(intentProfile.referenceRoles.map((role) => [role.referenceId, role]));
    const references: BriefReference[] = assets.map((asset) => {
      const role = rolesById.get(asset.id);
      return {
        assetId: asset.id,
        weight: asset.weight,
        roles: asset.weight === "muted" ? ["ignore"] : [ROLE_MAP[role?.role ?? "mood"]],
        roleSource: asset.annotation ? "annotation" : "inferred",
      };
    });

    const brief: BriefCheckpoint["brief"] = {
      goal: input.prompt,
      outputType: toBriefOutputType(intentProfile.outputType),
      outputTypeConfidence: intentProfile.confidence,
      references,
      constraints: [
        ...intentProfile.mustInclude.map((item) => `include: ${item}`),
        ...intentProfile.mustAvoid.map((item) => `avoid: ${item}`),
      ],
      conflicts: [],
      questions: [],
    };
    const saved = await deps.saveBrief?.(brief).catch(() => null);
    return {
      brief,
      ...(saved?.briefId ? { briefId: saved.briefId } : {}),
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
