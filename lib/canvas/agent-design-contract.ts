import { isDesignNodeTree } from "@/lib/canvas/compose";
import type { DesignNode } from "@/lib/canvas/design-node";
import { walkDesignTree } from "@/lib/canvas/design-node";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { getEffectiveReferenceWeight, type ArtboardItem, type ReferenceItem, type UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";
import type {
  AgentTask,
  AntiPatternCheck,
  AppStructure,
  DesignContract,
  FlowDirection,
  ProjectContext,
  ReferenceIntent,
  ScreenDirection,
  ScreenState,
  VisualReview,
} from "@/types/agent-design-harness";
import type { TasteProfile } from "@/types/taste-profile";

export const AGENT_CONTEXT_TOOLS = [
  "get_project_context",
  "get_taste_profile",
  "get_reference_intent",
  "get_design_contract",
  "request_design",
  "get_screen_direction",
  "get_flow_direction",
  "get_design_tokens",
  "get_component_rules",
  "get_layout_constraints",
  "get_agent_acceptance_criteria",
  "get_visual_review_for_screenshot",
  "submit_screenshot_for_review",
  "search_studio_os_context",
] as const;

export const AGENT_TASKS: AgentTask[] = [
  "implement_screen_from_contract",
  "update_existing_route_to_match_artboard",
  "create_component_from_component_rules",
  "apply_design_tokens",
  "fix_visual_drift",
  "generate_missing_states",
  "refactor_generic_ui_to_match_archetype",
];

export function createDefaultProjectContext(args: {
  brief?: string;
  appArchetype?: string;
  stage?: ProjectContext["stage"];
} = {}): ProjectContext {
  return {
    brief: args.brief ?? "",
    stage: args.stage ?? "working-prototype",
    targetAudience: "",
    appArchetype: args.appArchetype ?? "auto",
    prototypeUrls: [],
    screenshots: [],
    references: [],
    brandAssets: [],
    agentSummaries: [],
    constraints: [],
  };
}

type BuildDesignContractArgs = {
  projectId: string;
  projectName: string;
  state: UnifiedCanvasState;
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
  projectContext?: Partial<ProjectContext> | null;
};

type VisualReviewArgs = {
  contract: DesignContract;
  screenId: string;
  sourceScreenshot: string;
  comparedAgainstArtboard: string;
  observedIssues?: string[];
};

function compact(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function listFromText(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[\n.;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function resolveProjectContext(args: BuildDesignContractArgs): ProjectContext {
  const fallback = createDefaultProjectContext({
    brief: args.state.prompt.value,
    appArchetype: args.tasteProfile?.archetypeMatch ?? args.state.prompt.siteType,
  });
  const context = args.projectContext ?? {};
  return {
    ...fallback,
    ...context,
    brief: context.brief ?? fallback.brief,
    stage: context.stage ?? fallback.stage,
    targetAudience: context.targetAudience ?? fallback.targetAudience,
    appArchetype: context.appArchetype ?? fallback.appArchetype,
    prototypeUrls: normalizeStringArray(context.prototypeUrls),
    screenshots: normalizeStringArray(context.screenshots),
    references: normalizeStringArray(context.references),
    brandAssets: normalizeStringArray(context.brandAssets),
    agentSummaries: normalizeStringArray(context.agentSummaries),
    constraints: normalizeStringArray(context.constraints),
  };
}

function artboards(state: UnifiedCanvasState): ArtboardItem[] {
  return state.items.filter((item): item is ArtboardItem => item.kind === "artboard");
}

function references(state: UnifiedCanvasState): ReferenceItem[] {
  return state.items.filter((item): item is ReferenceItem => item.kind === "reference");
}

function slug(value: string): string {
  const clean = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return clean || "screen";
}

function inferStates(name: string): ScreenState[] {
  const lower = name.toLowerCase();
  const states: ScreenState[] = ["default"];
  if (lower.includes("empty")) states.push("empty");
  if (lower.includes("loading")) states.push("loading");
  if (lower.includes("error")) states.push("error");
  if (lower.includes("success")) states.push("success");
  if (lower.includes("permission")) states.push("permissionRequired");
  if (lower.includes("auth") || lower.includes("login")) states.push("unauthenticated");
  if (lower.includes("onboarding") || lower.includes("first")) states.push("firstRun");
  return unique(states) as ScreenState[];
}

function inferComponentInventory(items: ArtboardItem[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    if (!isDesignNodeTree(item.pageTree)) continue;
    walkDesignTree(item.pageTree as DesignNode, (node) => {
      if (node.type === "button") names.add("buttons / CTAs");
      if (node.type === "image" || node.style.coverImage) names.add("image treatments");
      if (node.type === "divider" || node.style.borderColor) names.add("rules / borders");
      if (node.style.display === "grid" || node.style.gridTemplate) names.add("grid modules");
      if (node.name) names.add(node.name);
    });
  }
  return [...names].slice(0, 14);
}

function inferDataSurfaces(items: ArtboardItem[]): string[] {
  const names = items.map((item) => item.name.toLowerCase()).join(" ");
  const surfaces = [];
  if (/dashboard|metric|analytics|report/.test(names)) surfaces.push("dashboard metrics");
  if (/table|list|row|index/.test(names)) surfaces.push("lists and tables");
  if (/form|settings|profile|account/.test(names)) surfaces.push("forms and settings");
  if (/ticket|checkout|cart|pricing/.test(names)) surfaces.push("transaction surfaces");
  return surfaces.length > 0 ? surfaces : ["primary screen content"];
}

function buildAppStructure(context: ProjectContext, boards: ArtboardItem[]): AppStructure {
  const screens = boards.map((board) => ({
    id: board.id,
    label: board.name,
    routeId: slug(board.name),
    breakpoint: board.breakpoint,
    states: inferStates(board.name),
  }));
  const routes = screens.map((screen) => ({
    id: screen.routeId,
    path: `/${screen.routeId === "home" ? "" : screen.routeId}`.replace(/\/$/, "/"),
    label: screen.label,
    screenIds: [screen.id],
  }));
  const desktopScreenIds = screens.filter((screen) => screen.breakpoint === "desktop").map((screen) => screen.id);
  const flowScreens = desktopScreenIds.length > 0 ? desktopScreenIds : screens.map((screen) => screen.id);

  return {
    appArchetype: context.appArchetype,
    routes,
    screens,
    flows: [
      {
        id: "primary-experience",
        label: "Primary experience",
        screenIds: flowScreens,
      },
    ],
    userStates: unique(screens.flatMap((screen) => screen.states)) as ScreenState[],
    keyMoments: unique([
      "first impression",
      context.references.length > 0 || context.screenshots.length > 0 ? "current-state comparison" : null,
      context.prototypeUrls.length > 0 ? "prototype import review" : null,
      "agent handoff",
      "post-build visual review",
    ].filter(Boolean) as string[]),
    componentInventory: inferComponentInventory(boards),
    dataSurfaces: inferDataSurfaces(boards),
    interactionPatterns: ["screen-level handoff", "responsive checkpoint", "visual drift review"],
  };
}

function qualitiesFromReference(ref: ReferenceItem): string[] {
  const tags = ref.extracted?.tags ?? [];
  const colors = ref.extracted?.colors?.slice(0, 4).map((color) => `color ${color}`) ?? [];
  const fonts = ref.extracted?.fonts?.slice(0, 3).map((font) => `type ${font}`) ?? [];
  const composition = ref.compositionAnalysis
    ? [
        ref.compositionAnalysis.keyCompositionalMove,
        `${ref.compositionAnalysis.spacingSystem} spacing`,
        `${ref.compositionAnalysis.balance} balance`,
      ]
    : [];
  return unique([...tags, ...colors, ...fonts, ...composition, ...listFromText(ref.annotation)]);
}

function preserveFromReference(ref: ReferenceItem, taste: TasteProfile | null): string[] {
  const annotation = listFromText(ref.annotation);
  const tags = ref.extracted?.tags ?? [];
  const preserve = [
    ...annotation,
    ...tags.map((tag) => `preserve ${tag} signal`),
    ref.compositionAnalysis?.keyCompositionalMove,
    taste?.layoutBias.gridBehavior ? `${taste.layoutBias.gridBehavior} grid behavior` : null,
    taste?.typographyTraits.scale ? `${taste.typographyTraits.scale} type scale` : null,
    taste?.ctaTone.style ? `${taste.ctaTone.style} CTA tone` : null,
  ];
  return unique(compact(preserve)).slice(0, 8);
}

function constraintsFromReference(ref: ReferenceItem, taste: TasteProfile | null): string[] {
  const weight = getEffectiveReferenceWeight(ref);
  const base = [
    weight === "primary" ? "Primary reference dominates visual decisions." : null,
    ref.extracted?.colors?.length ? `Use palette influence: ${ref.extracted.colors.slice(0, 4).join(", ")}.` : null,
    ref.extracted?.fonts?.length ? `Use type influence: ${ref.extracted.fonts.slice(0, 3).join(", ")}.` : null,
    ref.compositionAnalysis ? `Preserve composition move: ${ref.compositionAnalysis.keyCompositionalMove}.` : null,
    taste?.archetypeMatch ? `Resolve through ${taste.archetypeMatch} archetype grammar.` : null,
  ];
  return unique(compact(base));
}

function buildReferenceIntent(refs: ReferenceItem[], taste: TasteProfile | null, boards: ArtboardItem[]): ReferenceIntent[] {
  const screenTargets = boards.map((board) => board.name).slice(0, 3);
  return refs.map((ref) => ({
    referenceId: ref.id,
    title: ref.title ?? "Untitled reference",
    weight: getEffectiveReferenceWeight(ref),
    appliesTo: screenTargets.length > 0 ? screenTargets : ["project direction"],
    extractedQualities: qualitiesFromReference(ref),
    preserve: preserveFromReference(ref, taste),
    avoidCopying: ["exact imagery", "specific logo placement", "literal copy", "unlicensed brand assets"],
    generatedConstraints: constraintsFromReference(ref, taste),
  }));
}

function layoutConstraints(taste: TasteProfile | null, context: ProjectContext): string[] {
  const constraints = [
    context.constraints.length > 0 ? `User constraints: ${context.constraints.join("; ")}.` : null,
    taste ? `Use ${taste.layoutBias.gridBehavior} grid behavior with ${taste.layoutBias.rhythm} rhythm.` : null,
    taste ? `Hero should be ${taste.layoutBias.heroStyle}; section flow should be ${taste.layoutBias.sectionFlow}.` : null,
    taste ? `Whitespace intent: ${taste.layoutBias.whitespaceIntent}; density: ${taste.layoutBias.density}.` : null,
    context.appArchetype === "culture-event" || taste?.archetypeMatch === "culture-event"
      ? "Use fixed grid rails, oversized masthead hierarchy, program/lineup rhythm, and poster-like ticket CTA."
      : null,
  ];
  return unique(compact(constraints));
}

function componentRules(taste: TasteProfile | null, tokens: DesignSystemTokens | null): string[] {
  const rules = [
    taste ? `CTA tone: ${taste.ctaTone.style}; shape: ${taste.ctaTone.shape}; hierarchy: ${taste.ctaTone.hierarchy}.` : null,
    taste ? `Image treatment: ${taste.imageTreatment.style}, ${taste.imageTreatment.treatment}, ${taste.imageTreatment.cornerRadius} corners.` : null,
    tokens ? `Use accent ${tokens.colors.accent}, background ${tokens.colors.background}, surface ${tokens.colors.surface}.` : null,
    tokens ? `Use radius scale ${tokens.radii.sm}/${tokens.radii.md}/${tokens.radii.lg}; do not invent extra radius styles.` : null,
  ];
  return unique(compact(rules));
}

function hierarchyForArtboard(board: ArtboardItem): string[] {
  if (!isDesignNodeTree(board.pageTree)) return [board.name, "section hierarchy", "CTA"];
  const names: string[] = [];
  walkDesignTree(board.pageTree as DesignNode, (node) => {
    if (node.type === "text" || node.type === "button" || node.style.fontSize || node.name.toLowerCase().includes("hero")) {
      names.push(node.name || node.type);
    }
  });
  return unique(names).slice(0, 8);
}

function buildScreenDirections(boards: ArtboardItem[], refIntent: ReferenceIntent[], constraints: string[], rules: string[]): ScreenDirection[] {
  return boards.map((board) => ({
    screenId: board.id,
    purpose: `${board.name} should express the approved direction as an editable ${board.breakpoint} screen.`,
    hierarchy: hierarchyForArtboard(board),
    referenceInfluences: refIntent.filter((ref) => ref.weight !== "muted").map((ref) => ref.title).slice(0, 4),
    layoutConstraints: constraints,
    componentRules: rules,
    contentRules: ["Keep copy specific to the project brief.", "Preserve approved hierarchy before adding new sections."],
    states: inferStates(board.name),
    acceptanceCriteria: [
      "Implemented screenshot matches the approved artboard hierarchy.",
      "No new visual patterns are introduced outside the DesignContract.",
      "Responsive version preserves the same taste and composition logic.",
    ],
  }));
}

function buildFlowDirections(app: AppStructure, taste: TasteProfile | null): FlowDirection[] {
  return app.flows.map((flow) => ({
    flowId: flow.id,
    steps: flow.screenIds,
    intent: "Carry the same taste, hierarchy, and component rules across the flow.",
    frictionPoints: ["generic layout substitutions", "unreviewed state screens", "lost mobile hierarchy"],
    emotionalTone: taste?.adjectives.join(", ") || "clear, precise, production-ready",
    visualContinuityRules: [
      "Use the same token set across all screens.",
      "Keep CTA tone and hierarchy consistent.",
      "Preserve archetype-specific composition rules across states.",
    ],
  }));
}

function buildAntiPatternChecks(taste: TasteProfile | null, context: ProjectContext, refIntent: ReferenceIntent[]): AntiPatternCheck[] {
  const avoid = unique([
    ...(taste?.avoid ?? []),
    context.appArchetype === "culture-event" ? "generic SaaS card grids" : "",
    context.appArchetype === "culture-event" ? "pill CTAs" : "",
    "soft gradient blob backgrounds",
  ]);
  const checks = avoid.map((pattern) => ({
    detectedPatterns: [pattern],
    severity: /generic|pill|gradient|shadow|card/i.test(pattern) ? "critical" as const : "warning" as const,
    violatesArchetype: Boolean(taste?.archetypeMatch && pattern.toLowerCase().includes("saas") && taste.archetypeMatch !== "premium-saas"),
    violatesReferenceIntent: refIntent.some((ref) => ref.preserve.join(" ").toLowerCase().includes("grid") && pattern.toLowerCase().includes("card")),
    correction: `Reject ${pattern}; replace it with the approved ${context.appArchetype} composition rules from the DesignContract.`,
  }));
  return checks;
}

function buildScreenshotCheckpoints(boards: ArtboardItem[]): DesignContract["screenshotCheckpoints"] {
  return boards.map((board) => ({
    screenId: board.id,
    artboardId: board.id,
    label: `${board.name} ${board.breakpoint}`,
    requiredComparisons: ["approved artboard", "TasteProfile", "ReferenceIntent", "DesignContract constraints"],
  }));
}

function buildAcceptanceCriteria(taste: TasteProfile | null, checks: AntiPatternCheck[]): string[] {
  return [
    "Screenshot matches approved artboard hierarchy, spacing, color, and component rhythm.",
    taste ? `Output preserves ${taste.archetypeMatch} archetype logic and ${taste.typographyTraits.scale} typography scale.` : "Output preserves the selected direction and references.",
    "No critical anti-pattern checks are present in the implementation.",
    ...checks.slice(0, 4).map((check) => `Avoid: ${check.detectedPatterns.join(", ")}.`),
  ];
}

export function buildDesignContract(args: BuildDesignContractArgs): DesignContract {
  const context = resolveProjectContext(args);
  const boards = artboards(args.state);
  const refs = references(args.state);
  const appStructure = buildAppStructure(context, boards);
  const referenceIntent = buildReferenceIntent(refs, args.tasteProfile ?? null, boards);
  const layout = layoutConstraints(args.tasteProfile ?? null, context);
  const components = componentRules(args.tasteProfile ?? null, args.designTokens ?? null);
  const antiPatternChecks = buildAntiPatternChecks(args.tasteProfile ?? null, context, referenceIntent);

  return {
    id: `contract-${args.projectId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    projectIntent: {
      projectId: args.projectId,
      name: args.projectName,
      brief: context.brief,
      stage: context.stage,
      targetAudience: context.targetAudience,
      appArchetype: context.appArchetype,
      selectedDirection: context.selectedDirection,
    },
    appStructure,
    tasteProfile: args.tasteProfile ?? null,
    referenceIntent,
    designTokens: args.designTokens ?? null,
    layoutConstraints: layout,
    componentRules: components,
    screenDirections: buildScreenDirections(boards, referenceIntent, layout, components),
    flowDirections: buildFlowDirections(appStructure, args.tasteProfile ?? null),
    acceptanceCriteria: buildAcceptanceCriteria(args.tasteProfile ?? null, antiPatternChecks),
    screenshotCheckpoints: buildScreenshotCheckpoints(boards),
    antiPatternChecks,
    agentTasks: AGENT_TASKS,
  };
}

function scoreFromIssues(base: number, issueCount: number): number {
  return Math.max(0, Math.min(100, base - issueCount * 12));
}

function fixesFromIssues(contract: DesignContract, observedIssues: string[]): string[] {
  const text = observedIssues.join(" ").toLowerCase();
  const fixes = new Set<string>();
  for (const check of contract.antiPatternChecks) {
    const patternText = check.detectedPatterns.join(" ").toLowerCase();
    if (
      observedIssues.length === 0 ||
      patternText.split(/\s+/).some((word) => word.length > 4 && text.includes(word))
    ) {
      fixes.add(check.correction);
    }
  }
  if (/card|grid|rounded|saas/.test(text)) {
    fixes.add("Remove generic rounded card-grid substitutions and restore the approved layout constraints.");
  }
  if (/type|headline|font|masthead/.test(text)) {
    fixes.add("Restore the approved type scale, heading tone, and hierarchy from the DesignContract.");
  }
  if (/color|palette|gradient/.test(text)) {
    fixes.add("Use only approved design tokens; remove unapproved gradients, accents, and shadows.");
  }
  return [...fixes].slice(0, 8);
}

function buildAgentPrompt(contract: DesignContract, screenLabel: string, fixes: string[]): string {
  const intro = `Update ${screenLabel} to match the approved Studio OS DesignContract.`;
  const constraints = [
    ...contract.layoutConstraints.slice(0, 3),
    ...contract.componentRules.slice(0, 3),
    ...contract.acceptanceCriteria.slice(0, 2),
  ];
  return [
    intro,
    ...fixes.map((fix) => `- ${fix}`),
    ...constraints.map((constraint) => `- Preserve: ${constraint}`),
    "- Do not introduce new gradients, generic SaaS shadows, pill CTAs, or layout patterns not present in the contract.",
    "- After changes, provide a fresh screenshot for Studio OS visual review.",
  ].join("\n");
}

export function createVisualReview(args: VisualReviewArgs): VisualReview {
  const screen = args.contract.appStructure.screens.find((item) => item.id === args.screenId);
  const screenLabel = screen?.label ?? args.screenId;
  const observedIssues = args.observedIssues?.filter(Boolean) ?? [];
  const requiredFixes = fixesFromIssues(args.contract, observedIssues);
  const issueCount = Math.max(observedIssues.length, requiredFixes.length > 0 ? 1 : 0);
  const contractScore = scoreFromIssues(92, issueCount);
  const tasteScore = scoreFromIssues(90, issueCount);
  const refScore = scoreFromIssues(88, issueCount);
  const passFail = contractScore >= 80 && observedIssues.length === 0 ? "pass" : "fail";

  return {
    screenId: args.screenId,
    reviewedAt: new Date().toISOString(),
    sourceScreenshot: args.sourceScreenshot,
    comparedAgainstArtboard: args.comparedAgainstArtboard,
    contractMatchScore: contractScore,
    tasteMatchScore: tasteScore,
    referenceIntentScore: refScore,
    layoutMatchScore: scoreFromIssues(90, /grid|layout|card/i.test(observedIssues.join(" ")) ? issueCount + 1 : issueCount),
    typographyMatchScore: scoreFromIssues(90, /type|font|headline|masthead/i.test(observedIssues.join(" ")) ? issueCount + 1 : issueCount),
    colorMatchScore: scoreFromIssues(90, /color|palette|gradient/i.test(observedIssues.join(" ")) ? issueCount + 1 : issueCount),
    spacingMatchScore: scoreFromIssues(90, /spacing|dense|padding|gap/i.test(observedIssues.join(" ")) ? issueCount + 1 : issueCount),
    hierarchyMatchScore: scoreFromIssues(90, /hierarchy|cta|masthead/i.test(observedIssues.join(" ")) ? issueCount + 1 : issueCount),
    preservedQualities: args.contract.referenceIntent.flatMap((ref) => ref.preserve).slice(0, 6),
    drift: observedIssues.length > 0 ? observedIssues : [],
    issues: observedIssues,
    severity: passFail === "pass" ? "pass" : issueCount > 3 ? "blocked" : issueCount > 1 ? "major" : "minor",
    requiredFixes,
    recommendedAgentPrompt: buildAgentPrompt(args.contract, screenLabel, requiredFixes),
    passFail,
  };
}

function mdList(items: string[]): string {
  if (items.length === 0) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}

export function formatDesignContractMarkdown(contract: DesignContract): string {
  const tokenLines = contract.designTokens
    ? [
        `- Accent: ${contract.designTokens.colors.accent}`,
        `- Background: ${contract.designTokens.colors.background}`,
        `- Surface: ${contract.designTokens.colors.surface}`,
        `- Text: ${contract.designTokens.colors.text}`,
        `- Radius: ${contract.designTokens.radii.sm} / ${contract.designTokens.radii.md} / ${contract.designTokens.radii.lg}`,
      ]
    : ["- No token set available yet."];

  return [
    `# Design Contract — ${contract.projectIntent.name}`,
    "",
    "## Project Intent",
    mdList([
      `Brief: ${contract.projectIntent.brief || "Unspecified"}`,
      `Stage: ${contract.projectIntent.stage}`,
      `Audience: ${contract.projectIntent.targetAudience || "Unspecified"}`,
      `Archetype: ${contract.projectIntent.appArchetype}`,
    ]),
    "",
    "## Taste Profile",
    contract.tasteProfile
      ? mdList([
          contract.tasteProfile.summary,
          `Archetype confidence: ${Math.round(contract.tasteProfile.archetypeConfidence * 100)}%`,
          `Avoid: ${contract.tasteProfile.avoid.join(", ")}`,
        ])
      : "- No taste profile extracted yet.",
    "",
    "## Reference Intent",
    contract.referenceIntent.length === 0
      ? "- No references attached yet."
      : contract.referenceIntent
          .map((ref) => [
            `### ${ref.title}`,
            mdList([
              `Weight: ${ref.weight}`,
              `Applies to: ${ref.appliesTo.join(", ")}`,
              `Preserve: ${ref.preserve.join("; ") || "visual signal"}`,
              `Do not copy: ${ref.avoidCopying.join("; ")}`,
            ]),
          ].join("\n"))
          .join("\n\n"),
    "",
    "## Design Tokens",
    mdList(tokenLines.map((line) => line.replace(/^- /, ""))),
    "",
    "## Layout Constraints",
    mdList(contract.layoutConstraints),
    "",
    "## Component Rules",
    mdList(contract.componentRules),
    "",
    "## Screen Directions",
    contract.screenDirections.map((screen) => `### ${screen.screenId}\n${mdList(screen.acceptanceCriteria)}`).join("\n\n") || "- No screens yet.",
    "",
    "## Anti-Pattern Checks",
    mdList(contract.antiPatternChecks.map((check) => `${check.detectedPatterns.join(", ")} — ${check.correction}`)),
    "",
    "## Acceptance Criteria",
    mdList(contract.acceptanceCriteria),
    "",
    "## Screenshot Checkpoints",
    mdList(contract.screenshotCheckpoints.map((checkpoint) => `${checkpoint.label}: compare against ${checkpoint.requiredComparisons.join(", ")}`)),
    "",
    "## Agent Tasks",
    mdList(contract.agentTasks),
    "",
  ].join("\n");
}
