import { NextRequest, NextResponse } from "next/server";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import {
  buildSitePrompt,
  buildPageTreePrompt,
  buildPushedVariantPrompt,
  buildRestructuredVariantPrompt,
  validateAndNormalizePageTree,
  type SectionId,
} from "@/lib/canvas/generate-site";
import { compileTasteToDirectives, type FidelityMode } from "@/lib/canvas/directive-compiler";
import { validateDirectiveCompliance, repairViolations, countNodes } from "@/lib/canvas/directive-validator";
import {
  compilePageTreeToTSX,
  createVariantSet,
  inferSiteName,
  type VariantMode,
  type PageNode,
} from "@/lib/canvas/compose";
import type { SiteType } from "@/lib/canvas/templates";
import { resolveMediaUrls } from "@/lib/canvas/media-resolver";
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
import { scoreRealtimeFidelity, type TasteFidelityScore } from "@/lib/canvas/taste-evaluator";

// ── V6 DesignNode pipeline imports ──
import type { DesignNode } from "@/lib/canvas/design-node";
import { buildDesignTreePrompt, buildDesignPushedVariantPrompt, buildDesignRestructuredVariantPrompt } from "@/lib/canvas/design-tree-prompt";
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
import { API_LIMITS, capStringArray, logSafe, readGuardedJson } from "@/lib/security/api-guard";

// ─── Truncated JSON Recovery ────────────────────────────────────────────────

/**
 * Attempt to recover a truncated JSON string by closing unclosed braces/brackets.
 * Returns the patched JSON string if JSON.parse succeeds, null otherwise.
 */
function tryRecoverTruncatedJSON(raw: string): string | null {
  // Extract the JSON object start
  const jsonStart = raw.match(/\{[\s\S]*/);
  if (!jsonStart) return null;

  let str = jsonStart[0];

  // Strip any trailing incomplete string literal (e.g. `"some truncated tex`)
  // by removing a dangling open quote that isn't closed
  str = str.replace(/"[^"]*$/, '""');

  // Remove trailing comma before we close brackets
  str = str.replace(/,\s*$/, '');

  // Count unclosed braces and brackets
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

  // Append needed closing characters
  // Close brackets first (inner), then braces (outer)
  for (let i = 0; i < openBrackets; i++) str += ']';
  for (let i = 0; i < openBraces; i++) str += '}';

  try {
    JSON.parse(str);
    return str;
  } catch {
    return null;
  }
}

type V6TasteGate = {
  validation: DesignTasteValidationResult;
  score: DesignNodeTasteScore;
  passed: boolean;
  repaired: boolean;
  attempts: number;
  warnings: string[];
};

type V6GenerationDebug = {
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
  retryAttempted: boolean;
  retryFinishReason?: string | null;
  fallbackUsed: boolean;
  fallbackReason?: string;
  failureKind?: ModelFailureInfo["kind"];
  failureStatus?: number;
};

function parseDesignNodeResponse(raw: string, finishReason?: string | null): unknown {
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

function evaluateV6TasteGate(args: {
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

// ─── Tree Debug Logging ─────────────────────────────────────────────────────

function logTreeStructure(label: string, tree: PageNode): void {
  const sections = tree.children ?? [];
  logSafe("[TREE DEBUG] Structure", {
    label,
    sectionCount: sections.length,
    sections: sections.map((section) => ({
      type: section.type,
      childCount: section.children?.length ?? 0,
      childTypes: section.children?.map((child) => child.type) ?? [],
      paddingY: section.style?.paddingY,
      hasBackground: Boolean(section.style?.background),
    })),
  });
}

// ─────────────────────────────────────────────────────────────────────────────

type VariantStrategy = {
  key: "safe" | "creative" | "alternative";
  label: string;
  note: string;
};

const VARIANT_STRATEGIES: VariantStrategy[] = [
  {
    key: "safe",
    label: "Variant A",
    note: "This variant stays closest to your reference signal and protects the strongest taste cues.",
  },
  {
    key: "creative",
    label: "Variant B",
    note: "This variant pushes the visual interpretation while staying grounded in your references.",
  },
  {
    key: "alternative",
    label: "Variant C",
    note: "This variant keeps the same taste but explores a different layout direction.",
  },
];

function createVariantPreviewImage(
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

function formatTasteSection(
  label: string,
  values: Array<string | undefined | null>
) {
  const filtered = values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (filtered.length === 0) return `${label}: none supplied`;
  return `${label}: ${filtered.join(" • ")}`;
}

function buildTasteAwareVariantPrompt(args: {
  prompt: string;
  tasteProfile: TasteProfile | null;
  referenceUrls: string[];
  strategy: VariantStrategy;
}) {
  const { prompt, tasteProfile, referenceUrls, strategy } = args;
  const referenceNote =
    referenceUrls.length > 0
      ? `Reference set size: ${referenceUrls.length} visual references informed this direction.`
      : "Reference set size: no reference URLs were attached to this request.";

  if (!tasteProfile) {
    return [
      `Creative direction (treat as a brief, not as literal copy): ${prompt}`,
      `Variant strategy: ${strategy.label} (${strategy.key}).`,
      strategy.note,
      referenceNote,
      "No explicit taste profile was provided. Use the design tokens as the primary style signal while still producing a full, coherent landing page direction.",
    ].join("\n");
  }

  const doNotList =
    tasteProfile.avoid.length > 0
      ? tasteProfile.avoid.map((item) => `- ${item}`).join("\n")
      : "- Do not fall back to generic SaaS landing page tropes";

  return [
    `Creative direction (treat as a brief, not as literal copy): ${prompt}`,
    `Variant strategy: ${strategy.label} (${strategy.key}).`,
    strategy.note,
    referenceNote,
    "",
    "Taste profile:",
    `Summary: ${tasteProfile.summary}`,
    formatTasteSection("Adjectives", tasteProfile.adjectives),
    formatTasteSection("Layout preferences", [
      `density: ${tasteProfile.layoutBias.density}`,
      `grid behavior: ${tasteProfile.layoutBias.gridBehavior}`,
      `whitespace: ${tasteProfile.layoutBias.whitespaceIntent}`,
      `hero style: ${tasteProfile.layoutBias.heroStyle}`,
    ]),
    formatTasteSection("Typography traits", [
      `heading tone: ${tasteProfile.typographyTraits.headingTone}`,
      `body tone: ${tasteProfile.typographyTraits.bodyTone}`,
      `scale: ${tasteProfile.typographyTraits.scale}`,
      ...tasteProfile.typographyTraits.recommendedPairings.map(
        (pairing: string) => `pairing: ${pairing}`
      ),
    ]),
    formatTasteSection("Color behavior", [
      `palette type: ${tasteProfile.colorBehavior.palette}`,
      `mode: ${tasteProfile.colorBehavior.mode}`,
      `contrast: ${tasteProfile.typographyTraits.contrast}`,
      `background: ${tasteProfile.colorBehavior.suggestedColors.background}`,
      `accent: ${tasteProfile.colorBehavior.suggestedColors.accent}`,
    ]),
    formatTasteSection("Image treatment", [
      `style: ${tasteProfile.imageTreatment.style}`,
      `treatment: ${tasteProfile.imageTreatment.treatment}`,
      `corner radius: ${tasteProfile.imageTreatment.cornerRadius}`,
    ]),
    `CTA tone: ${tasteProfile.ctaTone.style}`,
    `Confidence: ${Math.round(tasteProfile.confidence * 100)}%`,
    "",
    "Generation rule:",
    "Generate a full landing-page direction whose layout, pacing, typography, spacing, imagery treatment, and CTA behavior naturally express the taste profile. Do not only map the palette; reflect the profile in structure and hierarchy too.",
    "",
    "DO NOT:",
    doNotList,
  ].join("\n");
}

function stripCodeFences(code: string): string {
  return code
    .replace(/^```(?:tsx?|jsx?|javascript|typescript)?\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    .trim();
}

type GeneratedCodeValidation =
  | { ok: true }
  | { ok: false; reason: string };

function validateGeneratedPreviewCode(code: string): GeneratedCodeValidation {
  if (!code.trim()) {
    return { ok: false, reason: "empty response" };
  }

  if (!/export\s+default\s+/.test(code)) {
    return { ok: false, reason: "missing default export" };
  }

  if (/from\s+['"](?:@\/|\.{1,2}\/)/.test(code)) {
    return {
      ok: false,
      reason: "contains local imports, preview only supports self-contained components",
    };
  }

  if (/className\s*=|class\s*=/.test(code)) {
    return {
      ok: false,
      reason: "uses CSS classes; preview contract requires inline styles only",
    };
  }

  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await readGuardedJson<{
      prompt: string;
      tokens: DesignSystemTokens;
      sectionId?: SectionId;
      existingSections?: string;
      mode?: "single" | "variants";
      siteType?: SiteType;
      siteName?: string;
      tasteProfile?: TasteProfile | null;
      referenceUrls?: string[];
      variantStrategy?: VariantMode;
      regenerationIntent?: "more-like-this" | "different-approach";
      fidelityMode?: FidelityMode;
      useDesignNode?: boolean;
      strictV6?: boolean;
      compositionData?: Array<{
        analysis: CompositionAnalysis;
        weight: "primary" | "default" | "muted";
        referenceIndex: number;
      }>;
    }>(req, {
      requireAuth: true,
      maxBytes: API_LIMITS.aiRequestBytes,
      rateLimit: { namespace: "canvas-generate", limit: 20, windowMs: 60 * 60 * 1000 },
    });
    if (!guarded.ok) return guarded.response;

    const body = guarded.body;
    const {
      prompt,
      tokens,
      sectionId,
      existingSections,
      mode,
      siteType,
      siteName,
      tasteProfile,
      referenceUrls,
      variantStrategy,
      regenerationIntent,
      fidelityMode,
      useDesignNode,
      strictV6,
      compositionData,
    } = body;

    const cappedReferenceUrls = capStringArray(referenceUrls, API_LIMITS.maxReferenceUrls);
    const cappedCompositionData = Array.isArray(compositionData)
      ? compositionData.slice(0, API_LIMITS.maxReferenceUrls)
      : undefined;
    const v6Budgets = getV6TokenBudgets();
    const strictV6Mode = Boolean(strictV6) || process.env.STUDIO_OS_STRICT_V6_QA === "true";

    logSafe("[GEN DEBUG] generate-component called", {
      mode,
      hasPrompt: Boolean(prompt),
      hasTasteProfile: Boolean(tasteProfile),
      referenceCount: cappedReferenceUrls.length,
      hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
      authBypass: guarded.devBypass,
      strictV6: strictV6Mode,
      v6TokenBudgets: v6Budgets,
    });
    if (tasteProfile) {
      const debugDirectives = compileTasteToDirectives(tasteProfile, fidelityMode ?? "balanced");
      logSafe("[TASTE DEBUG] Taste profile metadata", {
        archetype: tasteProfile.archetypeMatch,
        confidence: tasteProfile.archetypeConfidence,
        sectionFlow: tasteProfile.layoutBias?.sectionFlow,
        hero: tasteProfile.layoutBias?.heroStyle,
        hardDirectiveCount: debugDirectives.hard.length,
        softDirectiveCount: debugDirectives.soft.length,
        avoidDirectiveCount: debugDirectives.avoid.length,
      });
    } else {
      logSafe("[TASTE DEBUG] No tasteProfile received");
    }

    if (!prompt || !tokens) {
      return NextResponse.json(
        { error: "Prompt and design tokens are required" },
        { status: 400 }
      );
    }

    if (strictV6Mode && !useDesignNode) {
      return NextResponse.json(
        {
          error: "Strict V6 QA requires useDesignNode=true.",
          generationResult: "v6-not-attempted",
          fallbackUsed: false,
        },
        { status: 400 }
      );
    }

    if (mode === "variants") {
      const resolvedSiteName = siteName || inferSiteName(prompt);
      let v6Debug: V6GenerationDebug | null = null;
      let v6Failure: ModelFailureInfo | null = null;

      // ── V6 DesignNode Generation Path ──────────────────────────────────
      if (useDesignNode) {
        v6Debug = {
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

        if (!process.env.OPENROUTER_API_KEY) {
          v6Failure = {
            kind: "missing-key",
            message: "OPENROUTER_API_KEY is not configured; V6 generation was not attempted.",
          };
          v6Debug.failureKind = v6Failure.kind;
          v6Debug.fallbackReason = v6Failure.message;
          if (strictV6Mode) {
            return NextResponse.json({
              error: "Strict V6 QA failed: OpenRouter key is missing.",
              generationResult: "missing-key",
              v6Debug,
            }, { status: 500 });
          }
        }
      }

      if (useDesignNode && process.env.OPENROUTER_API_KEY) {
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
        // Build composition blueprint if composition data provided
        let compositionBlueprint = "";
        if (cappedCompositionData && cappedCompositionData.length > 0) {
          compositionBlueprint = buildCompositionBlueprint({
            compositions: cappedCompositionData,
            fidelityMode: fidelityMode ?? "balanced",
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
        });

        logSafe("[V6-GEN] Prompt built", { promptLength: designPrompt.length });

        const referenceImageBlocks = cappedReferenceUrls
          .slice(0, 4)
          .map((url) => imageUrlBlock(url, "low"));

        // ── Generate base DesignNode tree ──
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
          if (v6Debug) v6Debug.baseFinishReason = finishReason;
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
            if (v6Debug) v6Debug.retryAttempted = true;
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
            if (v6Debug) v6Debug.retryFinishReason = retryResponse.choices[0]?.finish_reason;
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
          if (v6Debug) {
            v6Debug.validationScore = gate.validation.score;
            v6Debug.tasteScore = gate.score.overall;
          }
        } catch (err) {
          v6Failure = describeModelFailure(err);
          if (v6Debug) {
            v6Debug.failureKind = v6Failure.kind;
            v6Debug.failureStatus = v6Failure.status;
            v6Debug.fallbackReason = v6Failure.message;
          }
          console.error(`[V6-GEN] Base generation failed:`, v6Failure.message);
        }

        if (baseTree) {
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

          // Derive pushed + restructured variants in parallel
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

            // Parse pushed
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

            // Parse restructured
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

          // Assemble response — same shape as PageNode variants
          const variants = [
            {
              id: `v6-base-${Date.now()}`,
              name: "Variant A — Faithful",
              pageTree: baseTree,
              pageTreeSource: "ai" as const,
              description: "V6 DesignNode — editorial quality generation.",
              previewImage: createVariantPreviewImage("Faithful", tokens),
              sourcePrompt: prompt,
              createdAt: new Date().toISOString(),
              strategy: "safe" as VariantMode,
              strategyLabel: "Faithful",
              tasteGate: baseTasteGate,
              intentProfile,
              designKnobs: knobVector,
            },
            {
              id: `v6-pushed-${Date.now()}`,
              name: "Variant B — Pushed",
              pageTree: pushedTree,
              pageTreeSource: "ai" as const,
              description: "V6 DesignNode — bolder interpretation.",
              previewImage: createVariantPreviewImage("Pushed", tokens),
              sourcePrompt: prompt,
              createdAt: new Date().toISOString(),
              strategy: "creative" as VariantMode,
              strategyLabel: "Pushed",
              tasteGate: { ...pushedTasteGate, repaired: false, attempts: 1, warnings: pushedTasteGate.passed ? [] : pushedTasteGate.validation.violations.map((v) => v.message) },
              intentProfile,
              designKnobs: knobVector,
            },
            {
              id: `v6-restructured-${Date.now()}`,
              name: "Variant C — Restructured",
              pageTree: restructuredTree,
              pageTreeSource: "ai" as const,
              description: "V6 DesignNode — different layout, same taste.",
              previewImage: createVariantPreviewImage("Restructured", tokens),
              sourcePrompt: prompt,
              createdAt: new Date().toISOString(),
              strategy: "alternative" as VariantMode,
              strategyLabel: "Restructured",
              tasteGate: { ...restructuredTasteGate, repaired: false, attempts: 1, warnings: restructuredTasteGate.passed ? [] : restructuredTasteGate.validation.violations.map((v) => v.message) },
              intentProfile,
              designKnobs: knobVector,
            },
          ];

          logSafe(`[V6-GEN] Complete — returning 3 DesignNode variants`);
          return NextResponse.json({
            siteName: resolvedSiteName,
            generationResult: "v6",
            fallbackUsed: false,
            v6Debug,
            variants,
          });
        } else {
          const fallbackReason = v6Failure?.message ?? "V6 returned no valid DesignNode tree.";
          if (v6Debug) {
            v6Debug.fallbackUsed = true;
            v6Debug.fallbackReason = fallbackReason;
          }
          console.warn(`[V6-GEN] DesignNode generation failed — falling through to PageNode path: ${fallbackReason}`);
          if (strictV6Mode) {
            const status = v6Failure?.kind === "credit-exhaustion" ? 402 : 502;
            return NextResponse.json({
              error: "Strict V6 QA failed: no valid V6 output was produced.",
              generationResult: v6Failure?.kind ?? "v6-failed",
              fallbackUsed: false,
              fallbackReason,
              v6Debug,
            }, { status });
          }
        }
      }
      // ── End V6 DesignNode Path ──────────────────────────────────────────

      const regenerationNote =
        regenerationIntent === "more-like-this"
          ? "Strengthen the same direction, double down on its taste alignment, and sharpen what already works."
          : regenerationIntent === "different-approach"
          ? "Keep the same project and taste profile, but find a meaningfully different layout and styling emphasis."
          : "";

      // Build deterministic fallback trees (used when AI generation fails)
      const fallbackVariants = createVariantSet(
        regenerationNote ? `${prompt}\n\n${regenerationNote}` : prompt,
        tokens,
        siteType ?? "auto",
        resolvedSiteName,
        tasteProfile ?? null,
        ["safe", "creative", "alternative"] as VariantMode[]
      );
      const fallbackTrees = fallbackVariants.map((v) => v.pageTree);

      // Build taste-aware prompt for the base generation
      const baseSourcePrompt = buildTasteAwareVariantPrompt({
        prompt,
        tasteProfile: tasteProfile ?? null,
        referenceUrls: cappedReferenceUrls,
        strategy: VARIANT_STRATEGIES[0],
      });

      // Compile directives for validation
      const compiledDirectives = compileTasteToDirectives(
        tasteProfile ?? null,
        fidelityMode ?? "balanced"
      );

      // ── 1+2 Variant Derivation Flow ──────────────────────────────────
      // 1 full base generation + quality gate + 2 parallel transformations
      // Total: 3-4 Sonnet calls (down from 6)
      // TSX generation eliminated — on-demand export only

      const apiKey = process.env.OPENROUTER_API_KEY;
      let baseTree: PageNode = fallbackTrees[0];
      let baseTreeSource: "ai" | "template" | "repaired" = "template";
      let baseValidationScore: number | undefined;
      let baseFidelityScore: TasteFidelityScore | null = null;
      let pushedTree: PageNode = fallbackTrees[1] ?? fallbackTrees[0];
      let pushedTreeSource: "ai" | "template" | "repaired" = "template";
      let pushedValidationScore: number | undefined;
      let restructuredTree: PageNode = fallbackTrees[2] ?? fallbackTrees[0];
      let restructuredTreeSource: "ai" | "template" | "repaired" = "template";
      let restructuredValidationScore: number | undefined;

      if (apiKey) {
        const referenceImageBlocks = cappedReferenceUrls
          .slice(0, 4)
          .map((url) => imageUrlBlock(url, "low"));

        // ── Step 1: Generate BASE variant (full generation) ──
        const generateBaseTree = async (temperature: number, opts?: { skipImages?: boolean; maxTokensOverride?: number }): Promise<PageNode | null> => {
          try {
            const treePrompt = buildPageTreePrompt(
              tokens,
              regenerationNote ? `${baseSourcePrompt}\n\n${regenerationNote}` : baseSourcePrompt,
              resolvedSiteName,
              {
                variantMode: "safe",
                tasteProfile: tasteProfile ?? null,
                fidelityMode: fidelityMode ?? "balanced",
              }
            );
            const imageBlocks = opts?.skipImages ? [] : referenceImageBlocks;
            const maxTok = opts?.maxTokensOverride ?? 16000;
            logSafe("[GEN DEBUG] Calling Sonnet for BASE PageNode tree", {
              temperature,
              promptLength: treePrompt.length,
              imageCount: imageBlocks.length,
              maxTokens: maxTok,
            });

            const router = getRouter();
            const response = await router.chat.completions.create({
              model: SONNET_4_6,
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: treePrompt },
                  ...imageBlocks,
                ],
              }],
              max_tokens: maxTok,
              temperature,
              response_format: { type: "json_object" },
            });

            const raw = response.choices[0]?.message?.content ?? "";
            const finishReason = response.choices[0]?.finish_reason;
            logSafe(`[GEN DEBUG] BASE tree response: ${raw.length} chars, finish_reason: ${finishReason}`);
            if (raw.length === 0) throw new Error("Empty PageNode tree response");

            // Detect truncation
            if (finishReason === "length") {
              console.warn(`[GEN DEBUG] BASE tree truncated (finish_reason=length) — attempting JSON recovery`);
              const recovered = tryRecoverTruncatedJSON(raw);
              if (recovered) {
                logSafe(`[GEN DEBUG] BASE tree JSON recovery succeeded (${recovered.length} chars)`);
                const parsed = JSON.parse(recovered);
                const validation = validateAndNormalizePageTree(parsed);
                if (validation.ok) return validation.tree as PageNode;
                console.warn(`[GEN DEBUG] BASE tree recovered JSON invalid: ${validation.reason}`);
              } else {
                console.warn(`[GEN DEBUG] BASE tree JSON recovery failed`);
              }
              // Signal truncation to caller
              throw Object.assign(new Error("PageNode tree truncated"), { truncated: true });
            }

            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in PageNode tree response");

            let parsed: unknown;
            try {
              parsed = JSON.parse(jsonMatch[0]);
            } catch {
              // Try recovery on malformed but non-truncated JSON
              const recovered = tryRecoverTruncatedJSON(raw);
              if (recovered) {
                logSafe(`[GEN DEBUG] BASE tree JSON recovery succeeded on parse error (${recovered.length} chars)`);
                parsed = JSON.parse(recovered);
              } else {
                throw new Error("JSON parse failed and recovery unsuccessful");
              }
            }

            const validation = validateAndNormalizePageTree(parsed);
            if (!validation.ok) throw new Error(`PageNode tree invalid: ${validation.reason}`);

            return validation.tree as PageNode;
          } catch (err) {
            console.error(`[GEN DEBUG] BASE tree generation failed:`, err instanceof Error ? err.message : err);
            // Re-throw truncation errors so the caller can retry
            if (err && typeof err === "object" && "truncated" in err) throw err;
            return null;
          }
        };

        // First attempt
        let candidateTree: PageNode | null = null;
        try {
          candidateTree = await generateBaseTree(0.5);
        } catch (err) {
          if (err && typeof err === "object" && "truncated" in err) {
            // Retry once without reference images and with higher token limit
            console.warn(`[GEN DEBUG] BASE tree truncated (finish_reason=length) — retrying with reduced prompt`);
            try {
              candidateTree = await generateBaseTree(0.5, { skipImages: true, maxTokensOverride: 24000 });
            } catch (retryErr) {
              console.error(`[GEN DEBUG] BASE tree truncation retry also failed:`, retryErr instanceof Error ? retryErr.message : retryErr);
              candidateTree = null;
            }
          }
        }

        if (candidateTree) {
          baseTree = candidateTree;
          baseTreeSource = "ai";

          // [TREE DEBUG] Log PRE-VALIDATION structure
          logTreeStructure("PRE-VALIDATION BASE", baseTree);

          // ── Step 2: Validate + repair ──
          const validation = validateDirectiveCompliance(baseTree, compiledDirectives);
          baseValidationScore = validation.score;
          logSafe(`[GEN DEBUG] BASE validation: score=${validation.score}, violations=${validation.violations.length}, passed=${validation.passed}`);

          // [TREE DEBUG] Log violation details
          if (validation.violations.length > 0) {
            logSafe(`[TREE DEBUG] BASE violations by type:`,
              validation.violations.map(v => `${v.directive.dimension}: found=${v.found}, expected=${v.expected}`).join("; ")
            );
          } else {
            logSafe(`[TREE DEBUG] BASE violations: none`);
          }

          if (!validation.passed && validation.repairable) {
            const { repairedTree, repairCount } = repairViolations(baseTree, validation.violations, compiledDirectives);
            const totalNodes = countNodes(baseTree);
            baseTreeSource = repairCount / totalNodes > 0.3 ? "repaired" : "ai";
            baseTree = repairedTree;
            logSafe(`[GEN DEBUG] BASE repaired ${repairCount}/${totalNodes} nodes, source=${baseTreeSource}`);

            // [TREE DEBUG] Log POST-REPAIR structure
            logTreeStructure("POST-REPAIR BASE", baseTree);
          } else if (!validation.passed) {
            logSafe(`[GEN DEBUG] BASE validation failed, not repairable. Using fallback.`);
            baseTree = fallbackTrees[0];
            baseTreeSource = "template";
          }

          // Resolve photo intent strings to real image URLs
          baseTree = await resolveMediaUrls(baseTree);

          // ── Step 3: Score ──
          if (tasteProfile && baseTreeSource !== "template") {
            try {
              baseFidelityScore = await scoreRealtimeFidelity(baseTree, tasteProfile);
              logSafe(`[GEN DEBUG] BASE fidelity: overall=${baseFidelityScore.overall}, palette=${baseFidelityScore.palette}, type=${baseFidelityScore.typography}, density=${baseFidelityScore.density}, structure=${baseFidelityScore.structure}`);
            } catch (scoreErr) {
              console.warn("[GEN DEBUG] BASE taste scoring failed:", scoreErr);
            }
          }

          // ── Step 4: Quality gate — retry if score too low ──
          const QUALITY_THRESHOLD = 4.0;
          if (
            baseFidelityScore &&
            baseFidelityScore.overall < QUALITY_THRESHOLD &&
            baseTreeSource !== "template"
          ) {
            logSafe(`[GEN DEBUG] Quality gate FAILED: score=${baseFidelityScore.overall} < ${QUALITY_THRESHOLD}. Retrying with lower temperature.`);

            const retryTree = await generateBaseTree(0.3);
            if (retryTree) {
              // Validate + repair retry
              const retryValidation = validateDirectiveCompliance(retryTree, compiledDirectives);
              let finalRetryTree = retryTree;
              let retrySource: "ai" | "repaired" = "ai";

              if (!retryValidation.passed && retryValidation.repairable) {
                const { repairedTree, repairCount } = repairViolations(retryTree, retryValidation.violations, compiledDirectives);
                retrySource = repairCount / countNodes(retryTree) > 0.3 ? "repaired" : "ai";
                finalRetryTree = repairedTree;
              }

              // Score retry
              let retryScore: TasteFidelityScore | null = null;
              if (tasteProfile) {
                try {
                  retryScore = await scoreRealtimeFidelity(finalRetryTree, tasteProfile);
                  logSafe(`[GEN DEBUG] RETRY fidelity: overall=${retryScore.overall}`);
                } catch { /* keep original */ }
              }

              // Use whichever scored higher
              if (retryScore && retryScore.overall > baseFidelityScore.overall) {
                const originalScore = baseFidelityScore.overall;
                baseTree = finalRetryTree;
                baseTreeSource = retrySource;
                baseFidelityScore = retryScore;
                baseValidationScore = retryValidation.score;
                logSafe(`[GEN DEBUG] Quality gate: RETRY wins (${retryScore.overall} > ${originalScore})`);
              } else {
                logSafe(`[GEN DEBUG] Quality gate: ORIGINAL wins (keeping score=${baseFidelityScore.overall})`);
              }
            }
          } else if (baseFidelityScore) {
            logSafe(`[GEN DEBUG] Quality gate PASSED: score=${baseFidelityScore.overall} >= ${QUALITY_THRESHOLD}`);
          }
        }

        // ── Step 5: Derive pushed + restructured variants in parallel ──
        if (baseTreeSource !== "template" && tasteProfile) {
          const pushedPrompt = buildPushedVariantPrompt(baseTree, tasteProfile, compiledDirectives);
          const restructuredPrompt = buildRestructuredVariantPrompt(baseTree, tasteProfile, compiledDirectives);

          const [pushedResult, restructuredResult] = await Promise.allSettled([
            callModel({
              model: SONNET_4_6,
              messages: [{ role: "user", content: pushedPrompt }],
              maxTokens: 16000,
              temperature: 0.4,
              jsonMode: true,
            }),
            callModel({
              model: SONNET_4_6,
              messages: [{ role: "user", content: restructuredPrompt }],
              maxTokens: 16000,
              temperature: 0.5,
              jsonMode: true,
            }),
          ]);

          // Parse pushed variant
          if (pushedResult.status === "fulfilled") {
            try {
              const rawPushed = pushedResult.value;
              const jsonMatch = rawPushed.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                let parsed: unknown;
                try {
                  parsed = JSON.parse(jsonMatch[0]);
                } catch {
                  console.warn(`[GEN DEBUG] PUSHED variant JSON parse failed — attempting recovery`);
                  const recovered = tryRecoverTruncatedJSON(rawPushed);
                  if (recovered) {
                    logSafe(`[GEN DEBUG] PUSHED variant JSON recovery succeeded (${recovered.length} chars)`);
                    parsed = JSON.parse(recovered);
                  } else {
                    throw new Error("PUSHED JSON parse failed and recovery unsuccessful");
                  }
                }
                const normalized = validateAndNormalizePageTree(parsed);
                if (normalized.ok) {
                  let tree = normalized.tree as PageNode;
                  pushedTreeSource = "ai";

                  // Validate + repair pushed
                  const pv = validateDirectiveCompliance(tree, compiledDirectives);
                  pushedValidationScore = pv.score;
                  if (!pv.passed && pv.repairable) {
                    const { repairedTree, repairCount } = repairViolations(tree, pv.violations, compiledDirectives);
                    pushedTreeSource = repairCount / countNodes(tree) > 0.3 ? "repaired" : "ai";
                    tree = repairedTree;
                  } else if (!pv.passed) {
                    throw new Error("Pushed variant not repairable");
                  }

                  pushedTree = tree;
                  // Resolve photo intent strings to real image URLs
                  pushedTree = await resolveMediaUrls(pushedTree);
                  logTreeStructure("PUSHED variant", pushedTree);
                  logSafe(`[GEN DEBUG] PUSHED variant OK: validation=${pv.score}, source=${pushedTreeSource}`);
                } else {
                  console.error(`[GEN DEBUG] PUSHED variant invalid: ${normalized.reason}`);
                }
              }
            } catch (err) {
              console.error(`[GEN DEBUG] PUSHED variant parse failed:`, err instanceof Error ? err.message : err);
            }
          } else {
            console.error(`[GEN DEBUG] PUSHED variant call failed:`, pushedResult.reason instanceof Error ? pushedResult.reason.message : pushedResult.reason);
          }

          // Parse restructured variant
          if (restructuredResult.status === "fulfilled") {
            try {
              const rawRestructured = restructuredResult.value;
              const jsonMatch = rawRestructured.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                let parsed: unknown;
                try {
                  parsed = JSON.parse(jsonMatch[0]);
                } catch {
                  console.warn(`[GEN DEBUG] RESTRUCTURED variant JSON parse failed — attempting recovery`);
                  const recovered = tryRecoverTruncatedJSON(rawRestructured);
                  if (recovered) {
                    logSafe(`[GEN DEBUG] RESTRUCTURED variant JSON recovery succeeded (${recovered.length} chars)`);
                    parsed = JSON.parse(recovered);
                  } else {
                    throw new Error("RESTRUCTURED JSON parse failed and recovery unsuccessful");
                  }
                }
                const normalized = validateAndNormalizePageTree(parsed);
                if (normalized.ok) {
                  let tree = normalized.tree as PageNode;
                  restructuredTreeSource = "ai";

                  // Validate + repair restructured
                  const rv = validateDirectiveCompliance(tree, compiledDirectives);
                  restructuredValidationScore = rv.score;
                  if (!rv.passed && rv.repairable) {
                    const { repairedTree, repairCount } = repairViolations(tree, rv.violations, compiledDirectives);
                    restructuredTreeSource = repairCount / countNodes(tree) > 0.3 ? "repaired" : "ai";
                    tree = repairedTree;
                  } else if (!rv.passed) {
                    throw new Error("Restructured variant not repairable");
                  }

                  restructuredTree = tree;
                  // Resolve photo intent strings to real image URLs
                  restructuredTree = await resolveMediaUrls(restructuredTree);
                  logTreeStructure("RESTRUCTURED variant", restructuredTree);
                  logSafe(`[GEN DEBUG] RESTRUCTURED variant OK: validation=${rv.score}, source=${restructuredTreeSource}`);
                } else {
                  console.error(`[GEN DEBUG] RESTRUCTURED variant invalid: ${normalized.reason}`);
                }
              }
            } catch (err) {
              console.error(`[GEN DEBUG] RESTRUCTURED variant parse failed:`, err instanceof Error ? err.message : err);
            }
          } else {
            console.error(`[GEN DEBUG] RESTRUCTURED variant call failed:`, restructuredResult.reason instanceof Error ? restructuredResult.reason.message : restructuredResult.reason);
          }
        } else {
          logSafe(`[GEN DEBUG] Skipping derivation — base is template or no taste profile`);
        }
      }

      // ── Assemble final variants ──
      // TSX is on-demand only (compilePageTreeToTSX runs at export time, not here)
      const variants = [
        {
          ...fallbackVariants[0],
          name: "Variant A — Faithful",
          pageTree: baseTree,
          pageTreeSource: baseTreeSource,
          validationScore: baseValidationScore,
          fidelityScore: baseFidelityScore,
          tasteTags: ["closest to references"],
          sourcePrompt: baseSourcePrompt,
          description: "Stays closest to your reference signal and protects the strongest taste cues.",
          previewImage: createVariantPreviewImage("Faithful", tokens),
          compiledCode: compilePageTreeToTSX(baseTree, tokens, "Faithful"),
          previewSource: "fallback" as const,
          previewFallbackReason: null,
        },
        {
          ...fallbackVariants[1],
          name: "Variant B — Pushed",
          pageTree: pushedTree,
          pageTreeSource: pushedTreeSource,
          validationScore: pushedValidationScore,
          fidelityScore: null,
          tasteTags: ["tighter spacing", "bolder CTAs", "more editorial"],
          sourcePrompt: baseSourcePrompt,
          description: "Pushes the visual interpretation while staying grounded in your references.",
          previewImage: createVariantPreviewImage("Pushed", tokens),
          compiledCode: compilePageTreeToTSX(pushedTree, tokens, "Pushed"),
          previewSource: "fallback" as const,
          previewFallbackReason: null,
        },
        {
          ...fallbackVariants[2],
          name: "Variant C — Restructured",
          pageTree: restructuredTree,
          pageTreeSource: restructuredTreeSource,
          validationScore: restructuredValidationScore,
          fidelityScore: null,
          tasteTags: ["different layout", "same palette", "reordered sections"],
          sourcePrompt: baseSourcePrompt,
          description: "Keeps the same taste but explores a different layout direction.",
          previewImage: createVariantPreviewImage("Restructured", tokens),
          compiledCode: compilePageTreeToTSX(restructuredTree, tokens, "Restructured"),
          previewSource: "fallback" as const,
          previewFallbackReason: null,
        },
      ];

      logSafe(`[GEN DEBUG] Final variants: base=${baseTreeSource}, pushed=${pushedTreeSource}, restructured=${restructuredTreeSource}`);

      return NextResponse.json({
        siteName: resolvedSiteName,
        generationResult: v6Failure?.kind ?? (v6Debug?.fallbackUsed ? "fallback" : "pagenode"),
        fallbackUsed: v6Debug?.fallbackUsed ?? baseTreeSource === "template",
        fallbackReason: v6Debug?.fallbackReason ?? (baseTreeSource === "template" ? "PageNode/template fallback used." : null),
        v6Debug,
        variants,
      });
    }

    // ── Single section / full-page generation ────────────────────────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const router = getRouter();
    const systemPrompt = buildSitePrompt(tokens, prompt, sectionId, existingSections, {
      tasteProfile: tasteProfile ?? null,
      fidelityMode: fidelityMode ?? "balanced",
    });
    const referenceImageBlocks = cappedReferenceUrls
      .slice(0, 4)
      .map((url) => imageUrlBlock(url, "low"));

    const response = await router.chat.completions.create({
      model: SONNET_4_6,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${systemPrompt}

Use the attached reference images as visual grounding. Translate their design direction into the page rather than defaulting to generic SaaS patterns.`,
            },
            ...referenceImageBlocks,
          ],
        },
      ],
      max_tokens: 16000,
      temperature: 0.6,
    });

    const code = stripCodeFences(response.choices[0]?.message?.content ?? "");
    const validation = validateGeneratedPreviewCode(code);
    if (!validation.ok) {
      return NextResponse.json(
        { error: `Generated code is preview-incompatible: ${validation.reason}` },
        { status: 422 }
      );
    }
    const nameMatch = code.match(/export\s+default\s+function\s+(\w+)/);
    const name = nameMatch?.[1] || "Page";

    return NextResponse.json({
      code,
      name,
      description: sectionId
        ? `Regenerated section: ${sectionId}`
        : `Generated site from brief`,
      sectionId: sectionId || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Site generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
