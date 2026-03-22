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
import type { TasteProfile } from "@/types/taste-profile";
import { callModel, getRouter, SONNET_4_6, imageUrlBlock } from "@/lib/ai/model-router";
import { scoreRealtimeFidelity, type TasteFidelityScore } from "@/lib/canvas/taste-evaluator";

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
    const body = await req.json();
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
    } = body as {
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
    };

    console.log(`[GEN DEBUG] generate-component called: mode=${mode}, prompt="${prompt?.slice(0, 60)}...", tasteProfile=${tasteProfile ? "YES" : "NULL"}, referenceUrls=${referenceUrls?.length ?? 0}, OPENROUTER_API_KEY=${!!process.env.OPENROUTER_API_KEY}`);

    if (!prompt || !tokens) {
      return NextResponse.json(
        { error: "Prompt and design tokens are required" },
        { status: 400 }
      );
    }

    if (mode === "variants") {
      const resolvedSiteName = siteName || inferSiteName(prompt);
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
        referenceUrls: Array.isArray(referenceUrls) ? referenceUrls : [],
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
        const referenceImageBlocks = (Array.isArray(referenceUrls) ? referenceUrls : [])
          .slice(0, 4)
          .map((url) => imageUrlBlock(url, "low"));

        // ── Step 1: Generate BASE variant (full generation) ──
        const generateBaseTree = async (temperature: number): Promise<PageNode | null> => {
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
            console.log(`[GEN DEBUG] Calling Sonnet for BASE PageNode tree: temp=${temperature}, prompt=${treePrompt.length} chars`);

            const router = getRouter();
            const response = await router.chat.completions.create({
              model: SONNET_4_6,
              messages: [{
                role: "user",
                content: [
                  { type: "text", text: treePrompt },
                  ...referenceImageBlocks,
                ],
              }],
              max_tokens: 8000,
              temperature,
              response_format: { type: "json_object" },
            });

            const raw = response.choices[0]?.message?.content ?? "";
            console.log(`[GEN DEBUG] BASE tree response: ${raw.length} chars, finish_reason: ${response.choices[0]?.finish_reason}`);
            if (raw.length === 0) throw new Error("Empty PageNode tree response");

            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in PageNode tree response");

            const parsed = JSON.parse(jsonMatch[0]);
            const validation = validateAndNormalizePageTree(parsed);
            if (!validation.ok) throw new Error(`PageNode tree invalid: ${validation.reason}`);

            return validation.tree as PageNode;
          } catch (err) {
            console.error(`[GEN DEBUG] BASE tree generation failed:`, err instanceof Error ? err.message : err);
            return null;
          }
        };

        // First attempt
        let candidateTree = await generateBaseTree(0.5);

        if (candidateTree) {
          baseTree = candidateTree;
          baseTreeSource = "ai";

          // ── Step 2: Validate + repair ──
          const validation = validateDirectiveCompliance(baseTree, compiledDirectives);
          baseValidationScore = validation.score;
          console.log(`[GEN DEBUG] BASE validation: score=${validation.score}, violations=${validation.violations.length}, passed=${validation.passed}`);

          if (!validation.passed && validation.repairable) {
            const { repairedTree, repairCount } = repairViolations(baseTree, validation.violations, compiledDirectives);
            const totalNodes = countNodes(baseTree);
            baseTreeSource = repairCount / totalNodes > 0.3 ? "repaired" : "ai";
            baseTree = repairedTree;
            console.log(`[GEN DEBUG] BASE repaired ${repairCount}/${totalNodes} nodes, source=${baseTreeSource}`);
          } else if (!validation.passed) {
            console.log(`[GEN DEBUG] BASE validation failed, not repairable. Using fallback.`);
            baseTree = fallbackTrees[0];
            baseTreeSource = "template";
          }

          // ── Step 3: Score ──
          if (tasteProfile && baseTreeSource !== "template") {
            try {
              baseFidelityScore = await scoreRealtimeFidelity(baseTree, tasteProfile);
              console.log(`[GEN DEBUG] BASE fidelity: overall=${baseFidelityScore.overall}, palette=${baseFidelityScore.palette}, type=${baseFidelityScore.typography}, density=${baseFidelityScore.density}`);
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
            console.log(`[GEN DEBUG] Quality gate FAILED: score=${baseFidelityScore.overall} < ${QUALITY_THRESHOLD}. Retrying with lower temperature.`);

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
                  console.log(`[GEN DEBUG] RETRY fidelity: overall=${retryScore.overall}`);
                } catch { /* keep original */ }
              }

              // Use whichever scored higher
              if (retryScore && retryScore.overall > baseFidelityScore.overall) {
                const originalScore = baseFidelityScore.overall;
                baseTree = finalRetryTree;
                baseTreeSource = retrySource;
                baseFidelityScore = retryScore;
                baseValidationScore = retryValidation.score;
                console.log(`[GEN DEBUG] Quality gate: RETRY wins (${retryScore.overall} > ${originalScore})`);
              } else {
                console.log(`[GEN DEBUG] Quality gate: ORIGINAL wins (keeping score=${baseFidelityScore.overall})`);
              }
            }
          } else if (baseFidelityScore) {
            console.log(`[GEN DEBUG] Quality gate PASSED: score=${baseFidelityScore.overall} >= ${QUALITY_THRESHOLD}`);
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
              maxTokens: 8000,
              temperature: 0.4,
              jsonMode: true,
            }),
            callModel({
              model: SONNET_4_6,
              messages: [{ role: "user", content: restructuredPrompt }],
              maxTokens: 8000,
              temperature: 0.5,
              jsonMode: true,
            }),
          ]);

          // Parse pushed variant
          if (pushedResult.status === "fulfilled") {
            try {
              const jsonMatch = pushedResult.value.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
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
                  console.log(`[GEN DEBUG] PUSHED variant OK: validation=${pv.score}, source=${pushedTreeSource}`);
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
              const jsonMatch = restructuredResult.value.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
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
                  console.log(`[GEN DEBUG] RESTRUCTURED variant OK: validation=${rv.score}, source=${restructuredTreeSource}`);
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
          console.log(`[GEN DEBUG] Skipping derivation — base is template or no taste profile`);
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

      console.log(`[GEN DEBUG] Final variants: base=${baseTreeSource}, pushed=${pushedTreeSource}, restructured=${restructuredTreeSource}`);

      return NextResponse.json({ siteName: resolvedSiteName, variants });
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
    const referenceImageBlocks = (Array.isArray(referenceUrls) ? referenceUrls : [])
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
