import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { compileTasteToDirectives, type FidelityMode } from "@/lib/canvas/directive-compiler";
import { inferSiteName, type VariantMode } from "@/lib/canvas/compose";
import type { SiteType } from "@/lib/canvas/templates";
import type { TasteProfile } from "@/types/taste-profile";
import { extractIntentProfile, type IntentProfile } from "@/types/intent-profile";
import {
  callModel,
  describeModelFailure,
  getRouter,
  getV6TokenBudgets,
  SONNET_4_6,
  imageUrlBlock,
  type ModelFailureInfo,
} from "@/lib/ai/model-router";
import type { DesignNode } from "@/lib/canvas/design-node";
import {
  buildDesignTreePrompt,
  buildDesignPushedVariantPrompt,
  buildDesignRestructuredVariantPrompt,
} from "@/lib/canvas/design-tree-prompt";
import { validateAndNormalizeDesignTree } from "@/lib/canvas/design-tree-validator";
import { resolveDesignMediaUrls } from "@/lib/canvas/design-media-resolver";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import { buildCompositionBlueprint } from "@/lib/canvas/composition-blueprint";
import { deriveDesignKnobs, type DesignKnobVector } from "@/lib/canvas/design-knobs";
import {
  buildTasteRetryPrompt,
  repairDesignNodeTaste,
  validateDesignNodeTaste,
  type DesignTasteValidationResult,
} from "@/lib/canvas/design-node-taste-validator";
import {
  passesDesignTasteScore,
  scoreDesignNodeTaste,
  type DesignNodeTasteScore,
} from "@/lib/canvas/design-node-taste-scorer";
import { API_LIMITS, capStringArray, logSafe } from "@/lib/security/api-guard";
import {
  guardDerivedVariantVisualScore,
  runVisualRefineLoop,
  type VisualRefineIteration,
} from "@/lib/canvas/visual-refine-loop";

// ─── Truncated JSON Recovery ────────────────────────────────────────────────

/**
 * Attempt to recover a truncated JSON string by closing unclosed braces/brackets.
 * Returns the patched JSON string if JSON.parse succeeds, null otherwise.
 */
export function tryRecoverTruncatedJSON(raw: string): string | null {
  const jsonStart = raw.match(/\{[\s\S]*/);
  if (!jsonStart) return null;

  let str = jsonStart[0];
  str = str.replace(/"[^"]*$/, '""');
  str = str.replace(/,\s*$/, '');

  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\' && inString) { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  for (let i = 0; i < openBrackets; i++) str += ']';
  for (let i = 0; i < openBraces; i++) str += '}';

  try {
    JSON.parse(str);
    return str;
  } catch {
    return null;
  }
}

export type V6TasteGate = {
  validation: DesignTasteValidationResult;
  score: DesignNodeTasteScore;
  passed: boolean;
  repaired: boolean;
  attempts: number;
  warnings: string[];
};

export type V6GenerationDebug = {
  attempted: boolean;
  model: string;
  strict: boolean;
  maxTokens: {
    base: number;
    variant: number;
    retry: number;
  };
  baseFinishReason?: string | null;
  validationScore?: number;
  tasteScore?: number;
  visualRefineAttempted?: boolean;
  visualRefineApplied?: boolean;
  visualScore?: number;
  visualRefineIterations?: VisualRefineIteration[];
  variantVisualScores?: Array<{
    variant: "pushed" | "restructured";
    score: number | null;
    rederived?: boolean;
  }>;
  retryAttempted: boolean;
  retryFinishReason?: string | null;
  fallbackUsed: boolean;
  fallbackReason?: string;
  failureKind?: ModelFailureInfo["kind"];
  failureStatus?: number;
};

export function parseDesignNodeResponse(raw: string, finishReason?: string | null): unknown {
  let jsonStr = raw;
  if (finishReason === "length") {
    const recovered = tryRecoverTruncatedJSON(raw);
    if (!recovered) throw new Error("Truncated and recovery failed");
    jsonStr = recovered;
  }
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found");
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    const recovered = tryRecoverTruncatedJSON(jsonStr);
    if (!recovered) throw new Error("JSON parse failed");
    return JSON.parse(recovered);
  }
}

export function evaluateV6TasteGate(args: {
  tree: DesignNode;
  tasteProfile: TasteProfile | null;
  intentProfile: IntentProfile | null;
  knobVector: DesignKnobVector;
  fidelityMode: FidelityMode;
}): Omit<V6TasteGate, "repaired" | "attempts" | "warnings"> {
  const directives = compileTasteToDirectives(args.tasteProfile, args.fidelityMode);
  const validation = validateDesignNodeTaste({
    tree: args.tree,
    tasteProfile: args.tasteProfile,
    intentProfile: args.intentProfile,
    knobVector: args.knobVector,
    directives,
    fidelityMode: args.fidelityMode,
  });
  const score = scoreDesignNodeTaste({
    validation,
    tasteProfile: args.tasteProfile,
    intentProfile: args.intentProfile,
    knobVector: args.knobVector,
  });
  return {
    validation,
    score,
    passed: validation.violations.every((v) => v.severity !== "hard") && passesDesignTasteScore(score, args.fidelityMode),
  };
}

export function createVariantPreviewImage(
  name: string,
  tokens: DesignSystemTokens
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520" fill="none">
      <rect width="720" height="520" rx="32" fill="${tokens.colors.background}" />
      <rect x="36" y="36" width="648" height="108" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="36" y="172" width="648" height="148" rx="28" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="36" y="348" width="202" height="136" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="258" y="348" width="202" height="136" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="480" y="348" width="204" height="136" rx="24" fill="${tokens.colors.surface}" stroke="${tokens.colors.border}" />
      <rect x="60" y="60" width="140" height="14" rx="7" fill="${tokens.colors.textMuted}" opacity="0.55" />
      <rect x="60" y="90" width="320" height="22" rx="11" fill="${tokens.colors.text}" />
      <rect x="60" y="204" width="220" height="12" rx="6" fill="${tokens.colors.textMuted}" opacity="0.55" />
      <rect x="60" y="232" width="512" height="22" rx="11" fill="${tokens.colors.text}" />
      <rect x="60" y="268" width="428" height="14" rx="7" fill="${tokens.colors.textMuted}" opacity="0.65" />
      <rect x="60" y="388" width="88" height="88" rx="22" fill="${tokens.colors.primary}" opacity="0.92" />
      <rect x="282" y="388" width="88" height="88" rx="22" fill="${tokens.colors.secondary}" opacity="0.92" />
      <rect x="504" y="388" width="88" height="88" rx="22" fill="${tokens.colors.accent}" opacity="0.92" />
      <text x="648" y="70" text-anchor="end" fill="${tokens.colors.textMuted}" font-size="18" font-family="Arial, sans-serif">${name}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export type V6DesignVariant = {
  id: string;
  name: string;
  pageTree: DesignNode;
  pageTreeSource: "ai";
  description: string;
  previewImage: string;
  sourcePrompt: string;
  createdAt: string;
  strategy: VariantMode;
  strategyLabel: string;
  tasteGate: V6TasteGate | null;
  intentProfile: IntentProfile;
  designKnobs: DesignKnobVector;
};

export type GenerateV6DesignVariantsInput = {
  prompt: string;
  tokens: DesignSystemTokens;
  siteName?: string;
  siteType?: SiteType;
  tasteProfile?: TasteProfile | null;
  referenceUrls?: string[];
  fidelityMode?: FidelityMode;
  strictV6?: boolean;
  compositionData?: Array<{
    analysis: CompositionAnalysis;
    weight: "primary" | "default" | "muted";
    referenceIndex: number;
  }>;
  compositionContext?: string;
};

export type GenerateV6DesignVariantsResult =
  | {
      ok: true;
      siteName: string;
      variants: V6DesignVariant[];
      v6Debug: V6GenerationDebug;
      generationResult: "v6";
    }
  | {
      ok: false;
      v6Debug: V6GenerationDebug;
      v6Failure: ModelFailureInfo | null;
      strictError?: string;
      strictStatus?: number;
      generationResult?: ModelFailureInfo["kind"] | "v6-failed";
    };

export async function generateV6DesignVariants(
  input: GenerateV6DesignVariantsInput
): Promise<GenerateV6DesignVariantsResult> {
  const {
    prompt,
    tokens,
    siteName,
    siteType,
    tasteProfile,
    referenceUrls,
    fidelityMode,
    strictV6,
    compositionData,
    compositionContext,
  } = input;

  const resolvedSiteName = siteName || inferSiteName(prompt);
  const cappedReferenceUrls = capStringArray(referenceUrls, API_LIMITS.maxReferenceUrls);
  const cappedCompositionContext =
    typeof compositionContext === "string" && compositionContext.trim().length > 0
      ? compositionContext.trim().slice(0, 8000)
      : undefined;
  const cappedCompositionData = Array.isArray(compositionData)
    ? compositionData.slice(0, API_LIMITS.maxReferenceUrls)
    : undefined;
  const v6Budgets = getV6TokenBudgets();
  const strictV6Mode = Boolean(strictV6) || process.env.STUDIO_OS_STRICT_V6_QA === "true";

  const v6Debug: V6GenerationDebug = {
    attempted: true,
    model: SONNET_4_6,
    strict: strictV6Mode,
    maxTokens: {
      base: v6Budgets.baseMaxTokens,
      variant: v6Budgets.variantMaxTokens,
      retry: v6Budgets.retryMaxTokens,
    },
    retryAttempted: false,
    fallbackUsed: false,
  };

  let v6Failure: ModelFailureInfo | null = null;

  if (!process.env.OPENROUTER_API_KEY) {
    v6Failure = {
      kind: "missing-key",
      message: "OPENROUTER_API_KEY is not configured; V6 generation was not attempted.",
    };
    v6Debug.failureKind = v6Failure.kind;
    v6Debug.fallbackReason = v6Failure.message;
    if (strictV6Mode) {
      return {
        ok: false,
        v6Debug,
        v6Failure,
        strictError: "Strict V6 QA failed: OpenRouter key is missing.",
        strictStatus: 500,
        generationResult: "missing-key",
      };
    }
    v6Debug.fallbackUsed = true;
    return { ok: false, v6Debug, v6Failure };
  }

  logSafe("[V6-GEN] Starting DesignNode generation", { siteName: resolvedSiteName });
  const resolvedFidelityMode = fidelityMode ?? "balanced";
  const intentProfile = extractIntentProfile({
    prompt,
    siteType,
    references: cappedReferenceUrls.map((url, index) => ({
      id: `reference-${index + 1}`,
      annotation: url,
    })),
  });

  let compositionBlueprint = "";
  if (cappedCompositionData && cappedCompositionData.length > 0) {
    compositionBlueprint = buildCompositionBlueprint({
      compositions: cappedCompositionData,
      fidelityMode: resolvedFidelityMode,
    });
    if (compositionBlueprint) {
      logSafe("[COMPOSITION] Blueprint generated", { length: compositionBlueprint.length });
    }
  }

  const knobVector = deriveDesignKnobs({
    tasteProfile: tasteProfile ?? null,
    intentProfile,
    compositionData: cappedCompositionData,
    compositionBlueprint,
    fidelityMode: resolvedFidelityMode,
  });

  const designPrompt = buildDesignTreePrompt(tokens, prompt, resolvedSiteName, {
    variantMode: "safe",
    tasteProfile: tasteProfile ?? null,
    intentProfile,
    knobVector,
    fidelityMode: resolvedFidelityMode,
    compositionBlueprint,
    compositionContext: cappedCompositionContext,
  });

  if (cappedCompositionContext) {
    logSafe("[COMPOSITION] Context wired into generation prompt", {
      length: cappedCompositionContext.length,
    });
  }

  logSafe("[V6-GEN] Prompt built", { promptLength: designPrompt.length });

  const referenceImageBlocks = cappedReferenceUrls
    .slice(0, 4)
    .map((url) => imageUrlBlock(url, "low"));

  let baseTree: DesignNode | null = null;
  let baseTasteGate: V6TasteGate | null = null;

  try {
    const router = getRouter();
    const response = await router.chat.completions.create({
      model: SONNET_4_6,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: designPrompt },
          ...referenceImageBlocks,
        ],
      }],
      max_tokens: v6Budgets.baseMaxTokens,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const finishReason = response.choices[0]?.finish_reason;
    v6Debug.baseFinishReason = finishReason;
    logSafe(`[V6-GEN] Response: ${raw.length} chars, finish_reason: ${finishReason}`);

    if (raw.length === 0) throw new Error("Empty response");

    if (finishReason === "length") console.warn(`[V6-GEN] Truncated — attempting recovery`);
    const parsed = parseDesignNodeResponse(raw, finishReason);

    const validated = validateAndNormalizeDesignTree(parsed);
    if (!validated.ok) throw new Error(`Validation failed: ${validated.reason}`);

    baseTree = await resolveDesignMediaUrls(validated.tree);
    logSafe(`[V6-GEN] Base tree validated: ${baseTree.children?.length ?? 0} sections`);

    let gate = evaluateV6TasteGate({
      tree: baseTree,
      tasteProfile: tasteProfile ?? null,
      intentProfile,
      knobVector,
      fidelityMode: resolvedFidelityMode,
    });
    let repaired = false;
    let attempts = 1;

    if (!gate.passed && gate.validation.repairable) {
      const repairedTree = repairDesignNodeTaste(baseTree, gate.validation, knobVector.color.palette);
      const repairedGate = evaluateV6TasteGate({
        tree: repairedTree,
        tasteProfile: tasteProfile ?? null,
        intentProfile,
        knobVector,
        fidelityMode: resolvedFidelityMode,
      });
      if (repairedGate.score.overall >= gate.score.overall) {
        baseTree = repairedTree;
        gate = repairedGate;
        repaired = true;
        logSafe(`[V6-GEN] Taste repair applied, score=${gate.score.overall}`);
      }
    }

    if (!gate.passed) {
      attempts = 2;
      v6Debug.retryAttempted = true;
      const retryPrompt = `${designPrompt}\n\n${buildTasteRetryPrompt(gate.validation)}`;
      const retryResponse = await router.chat.completions.create({
        model: SONNET_4_6,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: retryPrompt },
            ...referenceImageBlocks,
          ],
        }],
        max_tokens: v6Budgets.retryMaxTokens,
        temperature: 0.45,
        response_format: { type: "json_object" },
      });
      const retryRaw = retryResponse.choices[0]?.message?.content ?? "";
      v6Debug.retryFinishReason = retryResponse.choices[0]?.finish_reason;
      const retryParsed = parseDesignNodeResponse(retryRaw, retryResponse.choices[0]?.finish_reason);
      const retryValidated = validateAndNormalizeDesignTree(retryParsed);
      if (retryValidated.ok) {
        const retryTree = await resolveDesignMediaUrls(retryValidated.tree);
        const retryGate = evaluateV6TasteGate({
          tree: retryTree,
          tasteProfile: tasteProfile ?? null,
          intentProfile,
          knobVector,
          fidelityMode: resolvedFidelityMode,
        });
        if (retryGate.score.overall >= gate.score.overall) {
          baseTree = retryTree;
          gate = retryGate;
          repaired = false;
          logSafe(`[V6-GEN] Taste retry selected, score=${gate.score.overall}`);
        }
      }
    }

    baseTasteGate = {
      ...gate,
      repaired,
      attempts,
      warnings: gate.passed ? [] : gate.validation.violations.map((violation) => violation.message),
    };
    v6Debug.validationScore = gate.validation.score;
    v6Debug.tasteScore = gate.score.overall;

    if (baseTree && tasteProfile && cappedReferenceUrls.length > 0) {
      v6Debug.visualRefineAttempted = true;
      const visualRefine = await runVisualRefineLoop({
        tree: baseTree,
        tasteProfile,
        referenceUrls: cappedReferenceUrls,
        designPrompt,
        referenceImageBlocks,
        router,
        retryMaxTokens: v6Budgets.retryMaxTokens,
        fidelityMode: resolvedFidelityMode,
        parseDesignNodeResponse,
      });
      if (visualRefine.iterations.length > 0) {
        v6Debug.visualRefineIterations = visualRefine.iterations;
      }
      if (visualRefine.refined) {
        baseTree = visualRefine.tree;
        gate = evaluateV6TasteGate({
          tree: baseTree,
          tasteProfile: tasteProfile ?? null,
          intentProfile,
          knobVector,
          fidelityMode: resolvedFidelityMode,
        });
        baseTasteGate = {
          ...gate,
          repaired,
          attempts,
          warnings: gate.passed ? [] : gate.validation.violations.map((v) => v.message),
        };
        v6Debug.visualRefineApplied = true;
        v6Debug.tasteScore = gate.score.overall;
        v6Debug.visualScore = visualRefine.visualScore?.overall;
        logSafe("[V6-GEN] Visual refine applied", {
          visualScore: visualRefine.visualScore?.overall,
          iterations: visualRefine.iterations.length,
        });
      } else if (visualRefine.visualScore) {
        v6Debug.visualScore = visualRefine.visualScore.overall;
        logSafe("[V6-GEN] Visual score passed threshold", {
          visualScore: visualRefine.visualScore.overall,
        });
      }
    }
  } catch (err) {
    v6Failure = describeModelFailure(err);
    v6Debug.failureKind = v6Failure.kind;
    v6Debug.failureStatus = v6Failure.status;
    v6Debug.fallbackReason = v6Failure.message;
    console.error(`[V6-GEN] Base generation failed:`, v6Failure.message);
  }

  if (!baseTree) {
    const fallbackReason = v6Failure?.message ?? "V6 returned no valid DesignNode tree.";
    v6Debug.fallbackUsed = true;
    v6Debug.fallbackReason = fallbackReason;
    console.warn(`[V6-GEN] DesignNode generation failed — falling through to PageNode path: ${fallbackReason}`);
    if (strictV6Mode) {
      const status = v6Failure?.kind === "credit-exhaustion" ? 402 : 502;
      return {
        ok: false,
        v6Debug,
        v6Failure,
        strictError: "Strict V6 QA failed: no valid V6 output was produced.",
        strictStatus: status,
        generationResult: v6Failure?.kind ?? "v6-failed",
      };
    }
    return { ok: false, v6Debug, v6Failure };
  }

  if (!baseTasteGate) {
    const fallbackGate = evaluateV6TasteGate({
      tree: baseTree,
      tasteProfile: tasteProfile ?? null,
      intentProfile,
      knobVector,
      fidelityMode: resolvedFidelityMode,
    });
    baseTasteGate = {
      ...fallbackGate,
      repaired: false,
      attempts: 1,
      warnings: fallbackGate.passed ? [] : fallbackGate.validation.violations.map((violation) => violation.message),
    };
  }
  logSafe(`[V6-GEN] Media resolved and taste-gated`);

  let pushedTree: DesignNode = JSON.parse(JSON.stringify(baseTree));
  let restructuredTree: DesignNode = JSON.parse(JSON.stringify(baseTree));

  if (tasteProfile) {
    const [pushedResult, restructuredResult] = await Promise.allSettled([
      callModel({
        model: SONNET_4_6,
        messages: [{ role: "user", content: buildDesignPushedVariantPrompt(baseTree, tasteProfile) }],
        maxTokens: v6Budgets.variantMaxTokens,
        temperature: 0.4,
        jsonMode: true,
      }),
      callModel({
        model: SONNET_4_6,
        messages: [{ role: "user", content: buildDesignRestructuredVariantPrompt(baseTree, tasteProfile) }],
        maxTokens: v6Budgets.variantMaxTokens,
        temperature: 0.5,
        jsonMode: true,
      }),
    ]);

    if (pushedResult.status === "fulfilled") {
      try {
        const jsonMatch = pushedResult.value.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let parsed: unknown;
          try { parsed = JSON.parse(jsonMatch[0]); } catch {
            const rec = tryRecoverTruncatedJSON(pushedResult.value);
            if (rec) parsed = JSON.parse(rec); else throw new Error("parse failed");
          }
          const v = validateAndNormalizeDesignTree(parsed);
          if (v.ok) {
            pushedTree = await resolveDesignMediaUrls(v.tree);
            logSafe(`[V6-GEN] Pushed variant OK`);
          }
        }
      } catch (e) { console.warn(`[V6-GEN] Pushed variant failed:`, e); }
    }

    if (restructuredResult.status === "fulfilled") {
      try {
        const jsonMatch = restructuredResult.value.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let parsed: unknown;
          try { parsed = JSON.parse(jsonMatch[0]); } catch {
            const rec = tryRecoverTruncatedJSON(restructuredResult.value);
            if (rec) parsed = JSON.parse(rec); else throw new Error("parse failed");
          }
          const v = validateAndNormalizeDesignTree(parsed);
          if (v.ok) {
            restructuredTree = await resolveDesignMediaUrls(v.tree);
            logSafe(`[V6-GEN] Restructured variant OK`);
          }
        }
      } catch (e) { console.warn(`[V6-GEN] Restructured variant failed:`, e); }
    }

    const baseVisualScore = v6Debug.visualScore ?? null;
    if (baseVisualScore !== null && cappedReferenceUrls.length > 0) {
      const parseVariantResponse = async (raw: string): Promise<DesignNode | null> => {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          const rec = tryRecoverTruncatedJSON(raw);
          if (!rec) return null;
          parsed = JSON.parse(rec);
        }
        const validated = validateAndNormalizeDesignTree(parsed);
        if (!validated.ok) return null;
        return resolveDesignMediaUrls(validated.tree);
      };

      const [pushedGuard, restructuredGuard] = await Promise.all([
        guardDerivedVariantVisualScore({
          variant: "pushed",
          tree: pushedTree,
          baseVisualScore,
          referenceUrls: cappedReferenceUrls,
          tasteProfile,
          rederive: async () => {
            const raw = await callModel({
              model: SONNET_4_6,
              messages: [{ role: "user", content: buildDesignPushedVariantPrompt(baseTree!, tasteProfile) }],
              maxTokens: v6Budgets.variantMaxTokens,
              temperature: 0.4,
              jsonMode: true,
            });
            return parseVariantResponse(raw);
          },
        }),
        guardDerivedVariantVisualScore({
          variant: "restructured",
          tree: restructuredTree,
          baseVisualScore,
          referenceUrls: cappedReferenceUrls,
          tasteProfile,
          rederive: async () => {
            const raw = await callModel({
              model: SONNET_4_6,
              messages: [{ role: "user", content: buildDesignRestructuredVariantPrompt(baseTree!, tasteProfile) }],
              maxTokens: v6Budgets.variantMaxTokens,
              temperature: 0.5,
              jsonMode: true,
            });
            return parseVariantResponse(raw);
          },
        }),
      ]);

      pushedTree = pushedGuard.tree;
      restructuredTree = restructuredGuard.tree;
      v6Debug.variantVisualScores = [
        {
          variant: "pushed",
          score: pushedGuard.visualScore,
          rederived: pushedGuard.rederived || undefined,
        },
        {
          variant: "restructured",
          score: restructuredGuard.visualScore,
          rederived: restructuredGuard.rederived || undefined,
        },
      ];
    }
  }

  const pushedTasteGate = evaluateV6TasteGate({
    tree: pushedTree,
    tasteProfile: tasteProfile ?? null,
    intentProfile,
    knobVector,
    fidelityMode: resolvedFidelityMode,
  });
  const restructuredTasteGate = evaluateV6TasteGate({
    tree: restructuredTree,
    tasteProfile: tasteProfile ?? null,
    intentProfile,
    knobVector,
    fidelityMode: resolvedFidelityMode,
  });

  const variants: V6DesignVariant[] = [
    {
      id: `v6-base-${Date.now()}`,
      name: "Variant A — Faithful",
      pageTree: baseTree,
      pageTreeSource: "ai",
      description: "V6 DesignNode — editorial quality generation.",
      previewImage: createVariantPreviewImage("Faithful", tokens),
      sourcePrompt: prompt,
      createdAt: new Date().toISOString(),
      strategy: "safe",
      strategyLabel: "Faithful",
      tasteGate: baseTasteGate,
      intentProfile,
      designKnobs: knobVector,
    },
    {
      id: `v6-pushed-${Date.now()}`,
      name: "Variant B — Pushed",
      pageTree: pushedTree,
      pageTreeSource: "ai",
      description: "V6 DesignNode — bolder interpretation.",
      previewImage: createVariantPreviewImage("Pushed", tokens),
      sourcePrompt: prompt,
      createdAt: new Date().toISOString(),
      strategy: "creative",
      strategyLabel: "Pushed",
      tasteGate: {
        ...pushedTasteGate,
        repaired: false,
        attempts: 1,
        warnings: pushedTasteGate.passed ? [] : pushedTasteGate.validation.violations.map((v) => v.message),
      },
      intentProfile,
      designKnobs: knobVector,
    },
    {
      id: `v6-restructured-${Date.now()}`,
      name: "Variant C — Restructured",
      pageTree: restructuredTree,
      pageTreeSource: "ai",
      description: "V6 DesignNode — different layout, same taste.",
      previewImage: createVariantPreviewImage("Restructured", tokens),
      sourcePrompt: prompt,
      createdAt: new Date().toISOString(),
      strategy: "alternative",
      strategyLabel: "Restructured",
      tasteGate: {
        ...restructuredTasteGate,
        repaired: false,
        attempts: 1,
        warnings: restructuredTasteGate.passed ? [] : restructuredTasteGate.validation.violations.map((v) => v.message),
      },
      intentProfile,
      designKnobs: knobVector,
    },
  ];

  logSafe(`[V6-GEN] Complete — returning 3 DesignNode variants`);
  return {
    ok: true,
    siteName: resolvedSiteName,
    generationResult: "v6",
    v6Debug,
    variants,
  };
}
