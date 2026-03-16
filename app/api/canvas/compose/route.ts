import { NextRequest, NextResponse } from "next/server";
import type { PageNode, PageNodeStyle } from "@/lib/canvas/compose";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import { getRouter, GEMINI_FLASH } from "@/lib/ai/model-router";

type ComposeAction =
  | "rewrite-copy"
  | "regenerate-section"
  | "restyle-section"
  | "regenerate-page"
  | "change-style";

/** Validate and sanitize an AI-generated restyle object before it touches PageNodeStyle.
 *  Only known numeric/string/enum fields are passed through; unknown or wrong-typed
 *  values are silently dropped so a misbehaving model can never corrupt the style tree. */
function sanitizeRestyleResult(raw: Record<string, unknown>): Partial<PageNodeStyle> {
  const out: Partial<PageNodeStyle> = {};

  // String hex color fields
  for (const key of ["background", "foreground", "muted", "accent", "borderColor", "fontFamily"] as const) {
    const v = raw[key];
    if (typeof v === "string" && v.length > 0) out[key] = v;
  }

  // Positive-number fields
  for (const key of ["borderRadius", "paddingX", "paddingY", "gap", "columns", "maxWidth", "minHeight", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "opacity", "blur"] as const) {
    const v = raw[key];
    if (typeof v === "number" && isFinite(v) && v >= 0) out[key] = v;
  }

  // Enum fields
  const align = raw["align"];
  if (align === "left" || align === "center" || align === "right") out.align = align;

  const direction = raw["direction"];
  if (direction === "row" || direction === "column") out.direction = direction;

  const justify = raw["justify"];
  if (justify === "start" || justify === "center" || justify === "end" || justify === "between") {
    out.justify = justify;
  }

  const shadow = raw["shadow"];
  if (shadow === "none" || shadow === "soft" || shadow === "medium") out.shadow = shadow;

  const badgeTone = raw["badgeTone"];
  if (badgeTone === "surface" || badgeTone === "accent" || badgeTone === "outline") out.badgeTone = badgeTone;

  if (typeof raw["emphasized"] === "boolean") out.emphasized = raw["emphasized"];

  return out;
}

function localRewrite(node: PageNode, prompt: string): string {
  const base = prompt.trim() || node.content?.text || "Sharpen the message";
  if (node.type === "heading") {
    return base
      .replace(/[.!?]+$/, "")
      .split(/\s+/)
      .slice(0, 9)
      .join(" ");
  }

  return `${base.replace(/[.!?]+$/, "")}. Built to feel deliberate, clear, and ready to ship.`;
}

function localRestyle(tokens: DesignSystemTokens, prompt: string): Partial<PageNodeStyle> {
  const lower = prompt.toLowerCase();
  const elevated = lower.includes("bold") || lower.includes("dramatic");
  const refined = lower.includes("minimal") || lower.includes("quiet") || lower.includes("refined");

  return {
    background: elevated
      ? `${tokens.colors.accent}16`
      : refined
      ? tokens.colors.background
      : tokens.colors.surface,
    borderRadius: elevated ? 30 : refined ? 18 : 24,
    paddingY: elevated ? 80 : refined ? 56 : 64,
    paddingX: elevated ? 56 : refined ? 40 : 48,
    shadow: elevated ? "medium" : refined ? "none" : "soft",
    accent: tokens.colors.accent,
  };
}

async function geminiEdit(
  action: ComposeAction,
  node: PageNode,
  prompt: string,
  tokens: DesignSystemTokens
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const router = getRouter();
  const response = await router.chat.completions.create({
    model: GEMINI_FLASH,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return compact JSON only. For rewrite-copy return {\"text\":\"...\"}. For regenerate-section or regenerate-page return {\"heading\":\"...\",\"body\":\"...\"}. For restyle-section or change-style return {\"background\":\"#...\",\"borderRadius\":24,\"paddingY\":64,\"paddingX\":48,\"shadow\":\"soft\"}.",
      },
      {
        role: "user",
        content: JSON.stringify({
          action,
          prompt,
          node,
          tokens,
        }),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      node,
      prompt,
      tokens,
    } = body as {
      action: ComposeAction;
      node: PageNode;
      prompt: string;
      tokens: DesignSystemTokens;
    };

    if (!action || !node || !tokens) {
      return NextResponse.json(
        { error: "Action, node, and tokens are required" },
        { status: 400 }
      );
    }

    const ai = await geminiEdit(action, node, prompt, tokens);

    if (action === "rewrite-copy") {
      return NextResponse.json({
        text:
          typeof ai?.text === "string"
            ? ai.text
            : localRewrite(node, prompt),
      });
    }

    if (action === "regenerate-section" || action === "regenerate-page") {
      return NextResponse.json({
        heading:
          typeof ai?.heading === "string"
            ? ai.heading
            : localRewrite({ ...node, type: "heading" }, prompt),
        body:
          typeof ai?.body === "string"
            ? ai.body
            : localRewrite({ ...node, type: "paragraph" }, prompt),
      });
    }

    const localStyle = localRestyle(tokens, prompt);
    const aiStyle = ai ? sanitizeRestyleResult(ai) : {};
    return NextResponse.json({
      style: { ...localStyle, ...aiStyle },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compose action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
