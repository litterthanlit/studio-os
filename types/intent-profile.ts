export type IntentBusinessGoal =
  | "portfolio"
  | "conversion"
  | "launch"
  | "editorial"
  | "commerce"
  | "community"
  | "documentation"
  | "app-ui"
  | "component-system"
  | "unknown";

export type IntentOutputType =
  | "marketing-site"
  | "web-app-ui"
  | "mobile-app-ui"
  | "component"
  | "component-gallery"
  | "multi-page-site";

export type IntentReferenceRole =
  | "layout"
  | "palette"
  | "typography"
  | "mood"
  | "imagery"
  | "component"
  | "interaction";

export type IntentProfile = {
  summary: string;
  audience?: string;
  businessGoal: IntentBusinessGoal;
  outputType: IntentOutputType;
  contentPriority: string[];
  mustInclude: string[];
  mustAvoid: string[];
  referenceRoles: Array<{
    referenceId: string;
    role: IntentReferenceRole;
    weight: "primary" | "default" | "muted";
    rationale?: string;
  }>;
  literalness: "loose-inspiration" | "balanced" | "close-match";
  copyTone: string;
  successCriteria: string[];
  userLanguage: string;
  confidence: number;
  warnings: string[];
};

export function extractIntentProfile(args: {
  prompt: string;
  siteType?: string;
  projectBrief?: string;
  references?: Array<{
    id?: string;
    annotation?: string;
    weight?: "primary" | "default" | "muted";
  }>;
}): IntentProfile {
  const text = [args.prompt, args.siteType, args.projectBrief].filter(Boolean).join(" ").toLowerCase();
  const has = (words: string[]) => words.some((word) => text.includes(word));

  const businessGoal: IntentBusinessGoal = has(["portfolio", "work", "case study"])
    ? "portfolio"
    : has(["launch", "waitlist", "coming soon"])
      ? "launch"
      : has(["shop", "commerce", "buy", "collection"])
        ? "commerce"
        : has(["docs", "documentation", "guide"])
          ? "documentation"
          : has(["app", "dashboard", "interface"])
            ? "app-ui"
            : has(["editorial", "magazine", "issue", "story"])
              ? "editorial"
              : has(["convert", "signup", "trial", "lead"])
                ? "conversion"
                : "unknown";

  const outputType: IntentOutputType = businessGoal === "app-ui"
    ? "web-app-ui"
    : has(["component gallery", "components"])
      ? "component-gallery"
      : has(["component"])
        ? "component"
        : "marketing-site";

  const contentPriority = [
    has(["portfolio", "work", "case study"]) ? "work samples" : "",
    has(["pricing"]) ? "pricing" : "",
    has(["waitlist", "signup", "trial"]) ? "primary CTA" : "",
    has(["story", "editorial", "magazine"]) ? "editorial narrative" : "",
    has(["product", "feature"]) ? "product value" : "",
  ].filter(Boolean);

  const mustAvoid = [
    businessGoal === "portfolio" ? "pricing section unless explicitly requested" : "",
    businessGoal === "editorial" ? "generic SaaS feature grids" : "",
    businessGoal === "editorial" ? "logo bars and stats rows" : "",
  ].filter(Boolean);

  const referenceRoles = (args.references ?? []).map((reference, index) => ({
    referenceId: reference.id ?? `reference-${index + 1}`,
    role: inferReferenceRole(reference.annotation ?? args.prompt),
    weight: reference.weight ?? "default",
    rationale: reference.annotation,
  }));

  return {
    summary: args.projectBrief || args.prompt,
    businessGoal,
    outputType,
    contentPriority: contentPriority.length > 0 ? contentPriority : ["clear page hierarchy"],
    mustInclude: [],
    mustAvoid,
    referenceRoles,
    literalness: referenceRoles.some((ref) => ref.weight === "primary") ? "balanced" : "loose-inspiration",
    copyTone: businessGoal === "editorial" ? "editorial" : businessGoal === "portfolio" ? "personal and specific" : "clear",
    successCriteria: ["matches structural intent", "honors reference taste", "avoids category leakage"],
    userLanguage: args.prompt,
    confidence: text.trim().length > 24 ? 0.7 : 0.45,
    warnings: businessGoal === "unknown" ? ["Intent is broad; using conservative marketing-site defaults."] : [],
  };
}

function inferReferenceRole(text: string): IntentReferenceRole {
  const lower = text.toLowerCase();
  if (lower.includes("layout") || lower.includes("composition")) return "layout";
  if (lower.includes("color") || lower.includes("palette")) return "palette";
  if (lower.includes("type") || lower.includes("font")) return "typography";
  if (lower.includes("photo") || lower.includes("image")) return "imagery";
  if (lower.includes("button") || lower.includes("component")) return "component";
  return "mood";
}
