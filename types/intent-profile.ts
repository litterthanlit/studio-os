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
  /** Which classifier produced outputType/businessGoal. */
  classifiedBy?: "model" | "heuristic";
  /** Runner-up readings from the model classifier, most likely first. */
  alternatives?: IntentAlternative[];
};

export const INTENT_OUTPUT_TYPES: readonly IntentOutputType[] = [
  "marketing-site", "web-app-ui", "mobile-app-ui", "component", "component-gallery", "multi-page-site",
];
export const INTENT_BUSINESS_GOALS: readonly IntentBusinessGoal[] = [
  "portfolio", "conversion", "launch", "editorial", "commerce", "community",
  "documentation", "app-ui", "component-system", "unknown",
];

export type IntentReferenceInput = {
  id?: string;
  annotation?: string;
  weight?: "primary" | "default" | "muted";
};

export type IntentAlternative = {
  outputType: IntentOutputType;
  businessGoal: IntentBusinessGoal;
  confidence: number;
};

/**
 * Word-boundary phrase matcher. `has(["app"])` matches "an app" / "apps" never
 * "approachable" / "apparel" / "happy"; multi-word phrases tolerate any whitespace
 * or hyphen between words ("e-commerce", "sign up").
 */
export function createPhraseMatcher(text: string): (phrases: string[]) => boolean {
  const haystack = text.toLowerCase();
  return (phrases) =>
    phrases.some((phrase) => {
      const pattern = phrase
        .toLowerCase()
        .trim()
        .split(/[\s-]+/)
        .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[\\s-]+");
      return new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, "i").test(haystack);
    });
}

const MARKETING_PHRASES = [
  "landing page", "landing pages", "website", "websites", "web site", "site", "homepage", "home page",
  "marketing page", "marketing site", "microsite", "launch page", "one-pager", "splash page",
];
const MOBILE_PLATFORM_PHRASES = [
  "ios", "android", "iphone", "ipad", "mobile app", "mobile apps", "phone app", "native app",
  "tab bar", "375px", "phone ui", "ios screen", "watchos", "apple watch",
];
const APP_NOUN_PHRASES = [
  "app", "apps", "application", "web app", "dashboard", "dashboards", "admin", "admin panel",
  "console", "crm", "inbox", "control panel", "back office", "backoffice", "workspace", "tracker",
];
const APP_SCREEN_PHRASES = [
  "screen", "screens", "flow", "flows", "onboarding", "checkout", "sign in", "sign-in", "login",
  "log in", "settings", "empty state", "modal", "sidebar", "table view", "detail view", "wizard",
];
const COMPONENT_GALLERY_PHRASES = ["component gallery", "components", "ui kit", "design system", "component library"];
const COMPONENT_PHRASES = ["component", "widget"];

export function extractIntentProfile(args: {
  prompt: string;
  siteType?: string;
  projectBrief?: string;
  references?: IntentReferenceInput[];
}): IntentProfile {
  const text = [args.prompt, args.siteType, args.projectBrief].filter(Boolean).join(" ").toLowerCase();
  const has = createPhraseMatcher(text);

  // Output type first: marketing nouns ("landing page for an iOS app") win over app signals.
  const marketingNoun = has(MARKETING_PHRASES);
  const mobileSignal =
    has(MOBILE_PLATFORM_PHRASES) ||
    (has(["mobile", "phone"]) && (has(APP_NOUN_PHRASES) || has(APP_SCREEN_PHRASES)));
  const appSignal = has(APP_NOUN_PHRASES) || (has(APP_SCREEN_PHRASES) && !marketingNoun);

  const outputType: IntentOutputType = marketingNoun
    ? "marketing-site"
    : mobileSignal && (appSignal || has(MOBILE_PLATFORM_PHRASES))
      ? "mobile-app-ui"
      : has(COMPONENT_GALLERY_PHRASES)
        ? "component-gallery"
        : has(COMPONENT_PHRASES)
          ? "component"
          : appSignal
            ? "web-app-ui"
            : "marketing-site";
  const isAppOutput = outputType === "web-app-ui" || outputType === "mobile-app-ui";

  const businessGoal: IntentBusinessGoal = has(["portfolio", "case study", "case studies", "my work", "selected work"])
    ? "portfolio"
    : isAppOutput
      ? "app-ui"
      : has(["launch", "waitlist", "wait list", "coming soon", "pre-launch", "pre-order"])
        ? "launch"
        : has(["shop", "store", "storefront", "commerce", "ecommerce", "e-commerce", "buy", "product catalog"])
          ? "commerce"
          : has(["docs", "documentation", "api reference", "developer guide", "knowledge base"])
            ? "documentation"
            : outputType === "component" || outputType === "component-gallery"
              ? "component-system"
              : has(["editorial", "magazine", "journal", "blog", "story", "stories", "zine"])
                ? "editorial"
                : has(["event", "events", "meetup", "conference", "community", "networking", "club", "camp", "festival"])
                  ? "community"
                  : has(["convert", "conversion", "signup", "sign up", "trial", "lead", "leads", "book a demo"])
                    ? "conversion"
                    : "unknown";

  const contentPriority = [
    businessGoal === "portfolio" ? "work samples" : "",
    has(["pricing"]) ? "pricing" : "",
    has(["waitlist", "signup", "sign up", "trial"]) ? "primary CTA" : "",
    has(["story", "stories", "editorial", "magazine"]) ? "editorial narrative" : "",
    has(["product", "products", "feature", "features"]) ? "product value" : "",
  ].filter(Boolean);

  const mustAvoid = [
    businessGoal === "portfolio" ? "pricing section unless explicitly requested" : "",
    businessGoal === "editorial" ? "generic SaaS feature grids" : "",
    businessGoal === "editorial" ? "logo bars and stats rows" : "",
  ].filter(Boolean);

  const referenceRoles = (args.references ?? []).map((reference, index) => ({
    referenceId: reference.id ?? `reference-${index + 1}`,
    role: inferReferenceRole(reference.annotation?.trim() || args.prompt),
    weight: reference.weight ?? "default",
    rationale: reference.annotation?.trim() || undefined,
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
    classifiedBy: "heuristic",
  };
}

function inferReferenceRole(text: string): IntentReferenceRole {
  const has = createPhraseMatcher(text);
  if (has(["layout", "composition", "grid", "structure"])) return "layout";
  if (has(["color", "colors", "colour", "palette"])) return "palette";
  if (has(["type", "typography", "font", "fonts", "typeface"])) return "typography";
  if (has(["photo", "photos", "photography", "image", "images", "imagery", "illustration"])) return "imagery";
  if (has(["button", "buttons", "component", "components", "card", "cards"])) return "component";
  if (has(["interaction", "motion", "animation", "hover"])) return "interaction";
  return "mood";
}
