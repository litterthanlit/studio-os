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
import { extractIntentProfile } from "@/types/intent-profile";
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
import { validateAndNormalizeDesignSectionTree } from "@/lib/canvas/design-tree-validator";
import { resolveDesignMediaUrls } from "@/lib/canvas/design-media-resolver";
import type { CompositionAnalysis } from "@/types/composition-analysis";
import { buildCompositionBlueprint } from "@/lib/canvas/composition-blueprint";
import { deriveDesignKnobs } from "@/lib/canvas/design-knobs";
import { buildTasteRetryPrompt, repairDesignNodeTaste } from "@/lib/canvas/design-node-taste-validator";
import { API_LIMITS, capStringArray, logSafe, readGuardedJson } from "@/lib/security/api-guard";
import {
  generateV6DesignVariants,
  createVariantPreviewImage,
  parseDesignNodeResponse,
  evaluateV6TasteGate,
  tryRecoverTruncatedJSON,
  type V6TasteGate,
  type V6GenerationDebug,
} from "@/lib/canvas/generate-design-core";

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
      compositionContext?: string;
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
      compositionContext,
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
        const v6Result = await generateV6DesignVariants({
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
        });

        if (v6Result.ok) {
          return NextResponse.json({
            siteName: v6Result.siteName,
            generationResult: v6Result.generationResult,
            fallbackUsed: false,
            v6Debug: v6Result.v6Debug,
            variants: v6Result.variants,
          });
        }

        v6Debug = v6Result.v6Debug;
        v6Failure = v6Result.v6Failure;

        if (v6Result.strictError) {
          return NextResponse.json({
            error: v6Result.strictError,
            generationResult: v6Result.generationResult ?? "v6-failed",
            fallbackUsed: false,
            fallbackReason: v6Debug.fallbackReason,
            v6Debug,
          }, { status: v6Result.strictStatus ?? 502 });
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

    // ── V6 single-tree path (section regen) ──────────────────────────────────
    if (useDesignNode) {
      if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json(
          { error: "OPENROUTER_API_KEY not configured. Add it to your .env.local file." },
          { status: 500 }
        );
      }

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
      }
      const knobVector = deriveDesignKnobs({
        tasteProfile: tasteProfile ?? null,
        intentProfile,
        compositionData: cappedCompositionData,
        compositionBlueprint,
        fidelityMode: resolvedFidelityMode,
      });

      const designPrompt = prompt;
      const referenceImageBlocks = cappedReferenceUrls
        .slice(0, 4)
        .map((url) => imageUrlBlock(url, "low"));

      logSafe("[V6-SECTION] Starting section DesignNode generation", {
        regenerationIntent,
        hasTasteProfile: Boolean(tasteProfile),
        referenceCount: cappedReferenceUrls.length,
      });

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
          temperature: regenerationIntent === "different-approach" ? 0.6 : 0.5,
          response_format: { type: "json_object" },
        });

        const raw = response.choices[0]?.message?.content ?? "";
        const finishReason = response.choices[0]?.finish_reason;
        if (raw.length === 0) throw new Error("Empty response");

        const parsed = parseDesignNodeResponse(raw, finishReason);
        const validated = validateAndNormalizeDesignSectionTree(parsed);
        if (!validated.ok) throw new Error(`Validation failed: ${validated.reason}`);

        let sectionTree = await resolveDesignMediaUrls(validated.tree);
        let tasteGate: V6TasteGate | null = null;

        if (tasteProfile) {
          let gate = evaluateV6TasteGate({
            tree: sectionTree,
            tasteProfile,
            intentProfile,
            knobVector,
            fidelityMode: resolvedFidelityMode,
          });
          let repaired = false;
          let attempts = 1;

          if (!gate.passed && gate.validation.repairable) {
            const repairedTree = repairDesignNodeTaste(sectionTree, gate.validation, knobVector.color.palette);
            const repairedGate = evaluateV6TasteGate({
              tree: repairedTree,
              tasteProfile,
              intentProfile,
              knobVector,
              fidelityMode: resolvedFidelityMode,
            });
            if (repairedGate.score.overall >= gate.score.overall) {
              sectionTree = repairedTree;
              gate = repairedGate;
              repaired = true;
            }
          }

          if (!gate.passed) {
            attempts = 2;
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
            const retryParsed = parseDesignNodeResponse(retryRaw, retryResponse.choices[0]?.finish_reason);
            const retryValidated = validateAndNormalizeDesignSectionTree(retryParsed);
            if (retryValidated.ok) {
              const retryTree = await resolveDesignMediaUrls(retryValidated.tree);
              const retryGate = evaluateV6TasteGate({
                tree: retryTree,
                tasteProfile,
                intentProfile,
                knobVector,
                fidelityMode: resolvedFidelityMode,
              });
              if (retryGate.score.overall >= gate.score.overall) {
                sectionTree = retryTree;
                gate = retryGate;
                repaired = false;
              }
            }
          }

          tasteGate = {
            ...gate,
            repaired,
            attempts,
            warnings: gate.passed ? [] : gate.validation.violations.map((violation) => violation.message),
          };
        }

        const sectionLabel = sectionId ? `Regenerated section: ${sectionId}` : "Regenerated section";
        const variants = [
          {
            id: `v6-section-${Date.now()}`,
            name: sectionLabel,
            pageTree: sectionTree,
            pageTreeSource: "ai" as const,
            description: sectionLabel,
            previewImage: createVariantPreviewImage("Faithful", tokens),
            sourcePrompt: prompt,
            createdAt: new Date().toISOString(),
            strategy: "safe" as VariantMode,
            strategyLabel: regenerationIntent === "different-approach" ? "Different" : "Similar",
            tasteGate,
            intentProfile,
            designKnobs: knobVector,
          },
        ];

        logSafe("[V6-SECTION] Complete — returning DesignNode section variant");
        return NextResponse.json({
          generationResult: "v6",
          fallbackUsed: false,
          variants,
        });
      } catch (err) {
        const failure = describeModelFailure(err);
        console.error("[V6-SECTION] Section generation failed:", failure.message);
        if (strictV6Mode) {
          const status = failure.kind === "credit-exhaustion" ? 402 : 502;
          return NextResponse.json({
            error: "Strict V6 QA failed: section regeneration produced no valid DesignNode output.",
            generationResult: failure.kind ?? "v6-failed",
            fallbackUsed: false,
            fallbackReason: failure.message,
          }, { status });
        }
        return NextResponse.json(
          { error: failure.message },
          { status: failure.kind === "credit-exhaustion" ? 402 : 500 }
        );
      }
    }

    // ── Legacy TSX single section / full-page generation ─────────────────────
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
