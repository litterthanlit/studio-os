import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { PageNode, PageNodeStyle } from "@/lib/canvas/compose";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

type ComposeAction = "rewrite-copy" | "regenerate-section" | "restyle-section";

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

async function openAiEdit(
  action: ComposeAction,
  node: PageNode,
  prompt: string,
  tokens: DesignSystemTokens
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return compact JSON only. For rewrite-copy return {\"text\":\"...\"}. For regenerate-section return {\"heading\":\"...\",\"body\":\"...\"}. For restyle-section return {\"background\":\"#...\",\"borderRadius\":24,\"paddingY\":64,\"paddingX\":48,\"shadow\":\"soft\"}.",
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

    const ai = await openAiEdit(action, node, prompt, tokens);

    if (action === "rewrite-copy") {
      return NextResponse.json({
        text:
          typeof ai?.text === "string"
            ? ai.text
            : localRewrite(node, prompt),
      });
    }

    if (action === "regenerate-section") {
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

    return NextResponse.json({
      style: {
        ...localRestyle(tokens, prompt),
        ...(ai ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compose action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

