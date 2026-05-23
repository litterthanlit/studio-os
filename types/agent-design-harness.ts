import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { TasteProfile } from "@/types/taste-profile";

export type ProjectStage =
  | "raw-idea"
  | "moodboard"
  | "working-prototype"
  | "mid-build"
  | "near-launch";

export type ProjectContext = {
  brief: string;
  stage: ProjectStage;
  targetAudience: string;
  appArchetype: string;
  prototypeUrls: string[];
  screenshots: string[];
  references: string[];
  brandAssets: string[];
  agentSummaries: string[];
  constraints: string[];
  selectedDirection?: string;
};

export type ScreenState =
  | "default"
  | "empty"
  | "loading"
  | "error"
  | "success"
  | "permissionRequired"
  | "unauthenticated"
  | "firstRun";

export type AppStructure = {
  appArchetype: string;
  routes: Array<{ id: string; path: string; label: string; screenIds: string[] }>;
  screens: Array<{ id: string; label: string; routeId: string; breakpoint: "desktop" | "mobile"; states: ScreenState[] }>;
  flows: Array<{ id: string; label: string; screenIds: string[] }>;
  userStates: ScreenState[];
  keyMoments: string[];
  componentInventory: string[];
  dataSurfaces: string[];
  interactionPatterns: string[];
};

export type ReferenceIntent = {
  referenceId: string;
  title: string;
  weight: "primary" | "default" | "muted";
  appliesTo: string[];
  extractedQualities: string[];
  preserve: string[];
  avoidCopying: string[];
  generatedConstraints: string[];
};

export type ScreenDirection = {
  screenId: string;
  purpose: string;
  hierarchy: string[];
  referenceInfluences: string[];
  layoutConstraints: string[];
  componentRules: string[];
  contentRules: string[];
  states: ScreenState[];
  acceptanceCriteria: string[];
};

export type FlowDirection = {
  flowId: string;
  steps: string[];
  intent: string;
  frictionPoints: string[];
  emotionalTone: string;
  visualContinuityRules: string[];
};

export type ScreenshotCheckpoint = {
  screenId: string;
  artboardId: string;
  label: string;
  requiredComparisons: string[];
};

export type AntiPatternCheck = {
  detectedPatterns: string[];
  severity: "info" | "warning" | "critical";
  violatesArchetype: boolean;
  violatesReferenceIntent: boolean;
  correction: string;
};

export type AgentTask =
  | "implement_screen_from_contract"
  | "update_existing_route_to_match_artboard"
  | "create_component_from_component_rules"
  | "apply_design_tokens"
  | "fix_visual_drift"
  | "generate_missing_states"
  | "refactor_generic_ui_to_match_archetype";

export type DesignContract = {
  id: string;
  createdAt: string;
  projectIntent: {
    projectId: string;
    name: string;
    brief: string;
    stage: ProjectStage;
    targetAudience: string;
    appArchetype: string;
    selectedDirection?: string;
  };
  appStructure: AppStructure;
  tasteProfile: TasteProfile | null;
  referenceIntent: ReferenceIntent[];
  designTokens: DesignSystemTokens | null;
  layoutConstraints: string[];
  componentRules: string[];
  screenDirections: ScreenDirection[];
  flowDirections: FlowDirection[];
  acceptanceCriteria: string[];
  screenshotCheckpoints: ScreenshotCheckpoint[];
  antiPatternChecks: AntiPatternCheck[];
  agentTasks: AgentTask[];
};

export type VisualReview = {
  screenId: string;
  reviewedAt: string;
  sourceScreenshot: string;
  comparedAgainstArtboard: string;
  contractMatchScore: number;
  tasteMatchScore: number;
  referenceIntentScore: number;
  layoutMatchScore: number;
  typographyMatchScore: number;
  colorMatchScore: number;
  spacingMatchScore: number;
  hierarchyMatchScore: number;
  preservedQualities: string[];
  drift: string[];
  issues: string[];
  severity: "pass" | "minor" | "major" | "blocked";
  requiredFixes: string[];
  recommendedAgentPrompt: string;
  passFail: "pass" | "fail";
};

export type AgentDesignHarnessState = {
  projectContext?: ProjectContext;
  latestDesignContract?: DesignContract;
  visualReviews?: VisualReview[];
};
