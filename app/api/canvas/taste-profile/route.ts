import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { TasteProfile } from "@/types/taste-profile";

const TASTE_PROFILE_SYSTEM_PROMPT = `You are a senior design director translating visual references into a usable taste profile for a website generation product.

You extract direction, not generic trends. Be opinionated, concise, and specific. Focus on what should guide generation and editing.

Respond ONLY with valid JSON matching the requested schema.`;

const TASTE_PROFILE_PROMPT = `Create a taste profile from the supplied visual references and any existing design tokens.

Return this exact JSON structure:
{
  "summary": "2-3 sentence summary",
  "adjectives": ["word"],
  "layoutBias": {
    "density": "string",
    "gridStyle": "string",
    "whitespacePreference": "string",
    "heroStyle": "string"
  },
  "typographyTraits": {
    "headingMood": "string",
    "bodyMood": "string",
    "scale": "string",
    "suggestedPairings": ["string"]
  },
  "colorBehavior": {
    "palette": ["#hex"],
    "dominantMood": "string",
    "contrast": "string",
    "backgroundPreference": "string"
  },
  "imageTreatment": {
    "style": "string",
    "mood": "string",
    "corners": "string",
    "overlays": "string"
  },
  "ctaTone": "aggressive" | "subtle" | "minimal",
  "avoid": ["string"],
  "confidence": 0.0
}

Rules:
- summary must be 2-3 sentences
- adjectives should be 4-8 strong descriptors
- suggestedPairings should be real pairing suggestions or clear style pairings
- palette should contain 3-6 hex colors
- avoid should contain concrete anti-patterns to avoid
- confidence must be between 0 and 1
- if tokens are present, use them as supporting context but let the references lead`;

function fallbackTasteProfile(tokens?: DesignSystemTokens | null): TasteProfile {
  return {
    summary:
      "The direction leans intentional and system-led, with references supporting a refined visual language for the generated site. Use the existing palette and typography as the starting point, then refine with more references for stronger taste signals.",
    adjectives: ["intentional", "editorial", "structured", "refined"],
    layoutBias: {
      density: "balanced",
      gridStyle: "structured modular grid",
      whitespacePreference: "generous spacing around hero and sections",
      heroStyle: "clear headline with supporting proof and CTA",
    },
    typographyTraits: {
      headingMood: "confident and crisp",
      bodyMood: "quiet and readable",
      scale: "clear hierarchy with strong display-to-body contrast",
      suggestedPairings: tokens?.typography.fontFamily
        ? [tokens.typography.fontFamily.replace(/['"]/g, "")]
        : ["Display serif with clean sans body"],
    },
    colorBehavior: {
      palette: tokens ? Object.values(tokens.colors).slice(0, 5) : ["#111111", "#F5F5F5", "#3B5EFC"],
      dominantMood: "controlled and brand-led",
      contrast: "medium-high contrast with deliberate accents",
      backgroundPreference: "clean surfaces with subtle tonal separation",
    },
    imageTreatment: {
      style: "curated and consistent",
      mood: "polished, taste-led",
      corners: "soft radii on cards, sharper structure on layout",
      overlays: "minimal overlays and restrained gradients",
    },
    ctaTone: "subtle",
    avoid: ["generic hero gradients", "overcrowded layouts", "random accent colors"],
    confidence: 0.42,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, tokens } = body as {
      images?: string[];
      tokens?: DesignSystemTokens | null;
    };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ tasteProfile: fallbackTasteProfile(tokens) });
    }

    const openai = new OpenAI({ apiKey });

    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
      images.slice(0, 8).map((img) => ({
        type: "image_url" as const,
        image_url: {
          url: img,
          detail: "auto" as const,
        },
      }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: TASTE_PROFILE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${TASTE_PROFILE_PROMPT}\n\nExisting tokens:\n${JSON.stringify(tokens ?? null, null, 2)}`,
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 1800,
      temperature: 0.45,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ tasteProfile: fallbackTasteProfile(tokens) });
    }

    const raw = JSON.parse(jsonMatch[0]) as Partial<TasteProfile>;
    const tasteProfile: TasteProfile = {
      summary: raw.summary ?? fallbackTasteProfile(tokens).summary,
      adjectives: raw.adjectives ?? fallbackTasteProfile(tokens).adjectives,
      layoutBias: raw.layoutBias ?? fallbackTasteProfile(tokens).layoutBias,
      typographyTraits:
        raw.typographyTraits ?? fallbackTasteProfile(tokens).typographyTraits,
      colorBehavior: {
        ...(fallbackTasteProfile(tokens).colorBehavior),
        ...(raw.colorBehavior ?? {}),
        palette:
          raw.colorBehavior?.palette?.length
            ? raw.colorBehavior.palette
            : fallbackTasteProfile(tokens).colorBehavior.palette,
      },
      imageTreatment:
        raw.imageTreatment ?? fallbackTasteProfile(tokens).imageTreatment,
      ctaTone:
        raw.ctaTone === "aggressive" ||
        raw.ctaTone === "subtle" ||
        raw.ctaTone === "minimal"
          ? raw.ctaTone
          : fallbackTasteProfile(tokens).ctaTone,
      avoid: raw.avoid ?? fallbackTasteProfile(tokens).avoid,
      confidence:
        typeof raw.confidence === "number"
          ? Math.max(0, Math.min(1, raw.confidence))
          : fallbackTasteProfile(tokens).confidence,
    };

    return NextResponse.json({ tasteProfile });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Taste profile generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
