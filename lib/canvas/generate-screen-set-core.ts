import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { TasteProfile } from "@/types/taste-profile";
import { extractIntentProfile, type IntentProfile } from "@/types/intent-profile";
import type { SiteType } from "@/lib/canvas/templates";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import type { DesignNode } from "@/lib/canvas/design-node";
import {
  callModel,
  describeModelFailure,
  getRouter,
  getV6TokenBudgets,
  SONNET_4_6,
  imageUrlBlock,
  type ModelFailureInfo,
} from "@/lib/ai/model-router";
import { buildCompositionBlueprint } from "@/lib/canvas/composition-blueprint";
import { deriveDesignKnobs, type DesignKnobVector } from "@/lib/canvas/design-knobs";
import { validateAndNormalizeDesignTree } from "@/lib/canvas/design-tree-validator";
import { resolveDesignMediaUrls } from "@/lib/canvas/design-media-resolver";
import {
  buildDesignTreePrompt,
  resolveEffectiveArchetype,
} from "@/lib/canvas/design-tree-prompt";
import {
  evaluateV6TasteGate,
  parseDesignNodeResponse,
  type V6TasteGate,
} from "@/lib/canvas/generate-design-core";
import {
  buildScreenSetContext,
  summarizeScreenTree,
  type AppScreenPlanItem,
} from "@/lib/canvas/screen-context-builder";
import { API_LIMITS, capStringArray, logSafe } from "@/lib/security/api-guard";
import type { Breakpoint } from "@/lib/canvas/unified-canvas-state";

export type { AppScreenPlanItem } from "@/lib/canvas/screen-context-builder";

export type GeneratedAppScreen = {
  id: string;
  name: string;
  screenRole: string;
  screenPurpose: string;
  pageTree: DesignNode;
  tasteGate: V6TasteGate | null;
};

export type GenerateAppScreenSetInput = {
  prompt: string;
  tokens: DesignSystemTokens;
  siteName?: string;
  siteType?: SiteType;
  tasteProfile?: TasteProfile | null;
  referenceUrls?: string[];
  fidelityMode?: FidelityMode;
  breakpoint?: Breakpoint;
  compositionData?: Array<{
    analysis: CompositionAnalysis;
    weight: "primary" | "default" | "muted";
    referenceIndex: number;
  }>;
  compositionContext?: string;
};

export type GenerateAppScreenSetResult =
  | {
      ok: true;
      siteName: string;
      plan: AppScreenPlanItem[];
      screens: GeneratedAppScreen[];
      intentProfile: IntentProfile;
      designKnobs: DesignKnobVector;
      effectiveArchetype: string;
    }
  | {
      ok: false;
      failure: ModelFailureInfo | null;
      error: string;
    };

function parseScreenPlan(raw: string): AppScreenPlanItem[] {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in screen plan response");
  const parsed = JSON.parse(jsonMatch[0]) as { screens?: unknown[] };
  if (!Array.isArray(parsed.screens) || parsed.screens.length === 0) {
    throw new Error("Screen plan missing screens array");
  }

  return parsed.screens.slice(0, 6).map((item, index) => {
    const screen = item as Record<string, unknown>;
    const name = typeof screen.name === "string" ? screen.name : `Screen ${index + 1}`;
    const purpose = typeof screen.purpose === "string" ? screen.purpose : name;
    const screenRole =
      typeof screen.screenRole === "string"
        ? screen.screenRole
        : typeof screen.id === "string"
          ? screen.id
          : name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const keyElements = Array.isArray(screen.keyElements)
      ? screen.keyElements.filter((el): el is string => typeof el === "string").slice(0, 8)
      : [purpose];

    return {
      id: typeof screen.id === "string" ? screen.id : `screen-${index + 1}`,
      name,
      purpose,
      screenRole,
      keyElements,
    };
  });
}

async function planAppScreens(args: {
  prompt: string;
  siteName: string;
  intentProfile: IntentProfile;
  effectiveArchetype: string;
}): Promise<AppScreenPlanItem[]> {
  const planPrompt = `You are planning a multi-screen app UI flow for a design tool.

Brief: "${args.prompt}"
Product name: ${args.siteName}
Output type: ${args.intentProfile.outputType}
Archetype: ${args.effectiveArchetype}

Return JSON only:
{
  "screens": [
    {
      "id": "settings",
      "name": "Settings",
      "screenRole": "settings",
      "purpose": "Account and app preferences",
      "keyElements": ["profile row", "notification toggles", "sign out"]
    }
  ]
}

Rules:
- 2-5 screens that match the brief (e.g. settings + billing + members)
- screenRole = short kebab-case route slug
- keyElements = 3-6 UI elements per screen
- Shared app shell implied — each screen is one artboard in the same product
- No marketing landing sections`;

  const raw = await callModel({
    model: SONNET_4_6,
    messages: [{ role: "user", content: planPrompt }],
    maxTokens: 1200,
    temperature: 0.3,
    jsonMode: true,
  });

  return parseScreenPlan(raw);
}

export async function generateAppScreenSet(
  input: GenerateAppScreenSetInput,
): Promise<GenerateAppScreenSetResult> {
  const {
    prompt,
    tokens,
    siteName,
    siteType,
    tasteProfile,
    referenceUrls,
    fidelityMode,
    breakpoint = "desktop",
    compositionData,
    compositionContext,
  } = input;

  if (!process.env.OPENROUTER_API_KEY) {
    return {
      ok: false,
      failure: {
        kind: "missing-key",
        message: "OPENROUTER_API_KEY is not configured",
      },
      error: "OPENROUTER_API_KEY is not configured",
    };
  }

  const resolvedSiteName = siteName ?? (prompt.trim().slice(0, 40) || "App");
  const cappedReferenceUrls = capStringArray(referenceUrls, API_LIMITS.maxReferenceUrls);
  const resolvedFidelityMode = fidelityMode ?? "balanced";
  const intentProfile = extractIntentProfile({
    prompt,
    siteType,
    references: cappedReferenceUrls.map((url, index) => ({
      id: `reference-${index + 1}`,
      annotation: url,
    })),
  });

  const effectiveArchetype = resolveEffectiveArchetype({
    tasteArchetype: tasteProfile?.archetypeMatch,
    intentProfile,
    prompt,
    breakpoint,
  });

  let compositionBlueprint = "";
  if (compositionData && compositionData.length > 0) {
    compositionBlueprint = buildCompositionBlueprint({
      compositions: compositionData,
      fidelityMode: resolvedFidelityMode,
    });
  }

  const knobVector = deriveDesignKnobs({
    tasteProfile: tasteProfile ?? null,
    intentProfile,
    compositionData,
    compositionBlueprint,
    fidelityMode: resolvedFidelityMode,
  });

  let plan: AppScreenPlanItem[];
  try {
    plan = await planAppScreens({
      prompt,
      siteName: resolvedSiteName,
      intentProfile,
      effectiveArchetype,
    });
  } catch (err) {
    const failure = describeModelFailure(err);
    return { ok: false, failure, error: failure.message };
  }

  const v6Budgets = getV6TokenBudgets();
  const router = getRouter();
  const referenceImageBlocks = cappedReferenceUrls
    .slice(0, 4)
    .map((url) => imageUrlBlock(url, "low"));

  const screens: GeneratedAppScreen[] = [];
  const generatedSummaries: Array<{ name: string; summary: string }> = [];

  for (let index = 0; index < plan.length; index++) {
    const screenPlan = plan[index];
    const screenContext = buildScreenSetContext({
      plan,
      currentIndex: index,
      generatedSummaries,
    });

    const screenPrompt = `${buildDesignTreePrompt(tokens, prompt, resolvedSiteName, {
      tasteProfile: tasteProfile ?? null,
      intentProfile,
      knobVector,
      fidelityMode: resolvedFidelityMode,
      compositionBlueprint,
      compositionContext,
      breakpoint,
    })}

${screenContext}

## Current Screen Focus
Generate ONLY the complete DesignNode tree for: "${screenPlan.name}"
Screen role: ${screenPlan.screenRole}
Purpose: ${screenPlan.purpose}
Required elements: ${screenPlan.keyElements.join(", ")}

Return one root frame representing this single app screen (with full shell if desktop/mobile grammar requires it).`;

    try {
      const response = await router.chat.completions.create({
        model: SONNET_4_6,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: screenPrompt },
            ...referenceImageBlocks,
          ],
        }],
        max_tokens: v6Budgets.baseMaxTokens,
        temperature: 0.45,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content ?? "";
      const parsed = parseDesignNodeResponse(raw, response.choices[0]?.finish_reason);
      const validated = validateAndNormalizeDesignTree(parsed);
      if (!validated.ok) {
        logSafe("[SCREEN-SET] Validation failed for screen", {
          screen: screenPlan.name,
          reason: validated.reason,
        });
        continue;
      }

      const tree = await resolveDesignMediaUrls(validated.tree);
      const gate = evaluateV6TasteGate({
        tree,
        tasteProfile: tasteProfile ?? null,
        intentProfile,
        knobVector,
        fidelityMode: resolvedFidelityMode,
      });

      screens.push({
        id: screenPlan.id,
        name: screenPlan.name,
        screenRole: screenPlan.screenRole,
        screenPurpose: screenPlan.purpose,
        pageTree: tree,
        tasteGate: {
          ...gate,
          repaired: false,
          attempts: 1,
          warnings: gate.passed ? [] : gate.validation.violations.map((v) => v.message),
        },
      });

      generatedSummaries.push({
        name: screenPlan.name,
        summary: summarizeScreenTree(tree),
      });
    } catch (err) {
      logSafe("[SCREEN-SET] Screen generation failed", {
        screen: screenPlan.name,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  if (screens.length === 0) {
    return {
      ok: false,
      failure: { kind: "v6-failed", message: "No screens generated successfully" },
      error: "No screens generated successfully",
    };
  }

  return {
    ok: true,
    siteName: resolvedSiteName,
    plan,
    screens,
    intentProfile,
    designKnobs: knobVector,
    effectiveArchetype,
  };
}
