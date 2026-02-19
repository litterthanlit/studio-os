import { GoogleGenerativeAI } from "@google/generative-ai";

export type TagTiers = {
  confirmed: string[];  // high confidence — shown as primary
  suggested: string[];  // medium confidence — shown dimmer
  possible: string[];   // lower confidence — hidden by default, searchable
};

export type TagResult = {
  tags: string[];       // flat union of all tiers for search
  tagTiers: TagTiers;
  colors: string[];
  mood: string;
  style: string;
  contentType: string;
  era: string;
  composition: string;
  typography: string;
};

const FALLBACK: TagResult = {
  tags: [],
  tagTiers: { confirmed: [], suggested: [], possible: [] },
  colors: [],
  mood: "calm",
  style: "minimal",
  contentType: "ui",
  era: "",
  composition: "",
  typography: "",
};

const PROMPT = `Analyze this design reference image. You are tagging it for a designer's personal reference library. Think like a senior creative director categorizing their inspiration.

Return ONLY a valid JSON object with no markdown fences or extra text. Use this exact shape:

{
  "tags": {
    "confirmed": ["<5-8 primary tags, very confident these apply>"],
    "suggested": ["<3-5 secondary tags, likely apply>"],
    "possible": ["<2-4 tertiary tags, plausible but less certain>"]
  },
  "colors": ["<3-6 dominant hex color codes, e.g. #1a1a1a>"],
  "mood": "<single word from the mood list>",
  "style": "<single style classification>",
  "contentType": "<what kind of design work this is>",
  "era": "<design era or movement if identifiable, empty string if not>",
  "composition": "<layout or composition type>",
  "typography": "<typography style if text is visible, empty string if no text>"
}

TAG VOCABULARY — use these categories and terms. Pick what's relevant, don't force tags that don't apply:

UI Patterns:
hero section, card UI, navigation bar, sidebar, modal, dropdown, footer, header, dashboard, form, table, pricing page, login screen, onboarding, empty state, loading state, error state, notification, toast, tooltip, breadcrumb, tab bar, accordion, carousel, mega menu, floating action button, bottom sheet, command palette, search bar, avatar, badge, chip, tag, toggle, slider, progress bar, skeleton, stepper, timeline

Layout Patterns:
bento grid, masonry, magazine layout, split screen, full bleed, asymmetric, centered, z-pattern, f-pattern, single column, two column, three column, sidebar layout, hero + grid, card grid, stacked sections, overlap, layered, floating elements, sticky header, parallax

Visual Effects:
gradient, linear gradient, radial gradient, mesh gradient, aurora gradient, grain, noise, texture, blur, glass, glassmorphism, glow, neon, shadow, drop shadow, long shadow, duotone, halftone, double exposure, glitch, distortion, 3D, isometric, flat, depth, parallax, motion blur, light leak, bokeh, film grain, scanlines, ASCII art, pixel art, dot pattern, line art, wireframe, outline style

Design Trends:
neubrutalism, brutalist, glassmorphism, claymorphism, neumorphism, skeuomorphism, flat design, material design, swiss style, international typographic, bauhaus, art deco, art nouveau, memphis, y2k, vaporwave, cyberpunk, solarpunk, cottagecore, dark mode, light mode, monochrome, maximalist, minimalist, organic, geometric, retro, vintage, futuristic, editorial, corporate, playful, premium, luxury, handmade, raw, polished

Typography:
serif, sans serif, display type, script, monospace, slab serif, geometric sans, humanist sans, grotesque, didone, blackletter, condensed, extended, variable font, type specimen, type pairing, type scale, large type, micro type, kinetic typography, 3D type, outlined type, filled type, gradient type, textured type, hand lettered, calligraphy, stencil

Color & Palette:
monochrome, black and white, pastel, neon, earth tones, jewel tones, muted, vibrant, warm palette, cool palette, neutral, cream, off-white, dark theme, light theme, high contrast, low contrast, complementary, analogous, triadic, split complementary, accent color, brand colors, gradient palette, duotone palette

Content Type:
landing page, portfolio, blog, e-commerce, product page, mobile app, desktop app, web app, dashboard, admin panel, SaaS, marketing site, personal site, agency site, restaurant, fashion, tech, music, art, architecture, editorial, magazine, book cover, poster, business card, packaging, logo, icon set, illustration, 3D render, photography, motion graphics, video, social media, email template, presentation, infographic

Mood:
professional, playful, calm, energetic, serious, whimsical, elegant, rugged, bold, subtle, warm, cold, intimate, grand, minimal, rich, clean, raw, soft, sharp, dreamy, grounded, futuristic, nostalgic, luxurious, accessible, experimental, confident, quiet, loud

Composition:
rule of thirds, golden ratio, centered, symmetrical, asymmetrical, diagonal, radial, grid based, free form, tight crop, wide shot, negative space, dense, spacious, overlapping, layered, flat, depth, foreground/background, framed, bleeding edge, contained

Industry:
tech, fashion, food, healthcare, finance, entertainment, education, automotive, real estate, travel, fitness, beauty, music, gaming, architecture, legal, nonprofit, government, media, retail, luxury, startup, enterprise, creative agency, freelance

IMPORTANT:
- Use the EXACT terms from above when they match. Don't invent synonyms.
- A landing page screenshot should get confirmed tags like: "landing page", "hero section", "gradient", "sans serif", "dark mode", "SaaS", "clean"
- A brutalist poster should get confirmed tags like: "poster", "brutalist", "large type", "high contrast", "monochrome", "bold", "experimental"
- A mobile app screenshot should get confirmed tags like: "mobile app", "card UI", "tab bar", "rounded", "pastel", "playful", "minimal"
- Always include at least one tag from: content type, mood, and style categories
- If you see text/typography, ALWAYS tag the typography style
- If it's a UI screenshot, ALWAYS tag the UI patterns you see`;

const ARCHETYPE_BOOST: Record<string, string> = {
  visual:     "PRIORITY: Focus especially on style, mood, color palette, and composition tags.",
  typography: "PRIORITY: Focus especially on typography style, font classification, and type hierarchy tags.",
  systems:    "PRIORITY: Focus especially on UI patterns, layout patterns, and component types.",
};

export async function tagReference(imageUrl: string, archetype?: string): Promise<TagResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return FALLBACK;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.status}`);
    }

    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const fullPrompt = archetype && ARCHETYPE_BOOST[archetype]
      ? `${PROMPT}\n\n${ARCHETYPE_BOOST[archetype]}`
      : PROMPT;

    const result = await model.generateContent([
      fullPrompt,
      {
        inlineData: {
          data: base64,
          mimeType: contentType as "image/jpeg" | "image/png" | "image/webp",
        },
      },
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    type RawResponse = {
      tags?: { confirmed?: string[]; suggested?: string[]; possible?: string[] } | string[];
      colors?: string[];
      mood?: string;
      style?: string;
      contentType?: string;
      era?: string;
      composition?: string;
      typography?: string;
    };

    const parsed = JSON.parse(cleaned) as RawResponse;

    // Handle both the new tiered format and old flat array (graceful fallback)
    let tagTiers: TagTiers;
    let flatTags: string[];

    if (parsed.tags && !Array.isArray(parsed.tags) && typeof parsed.tags === "object") {
      const raw = parsed.tags as { confirmed?: string[]; suggested?: string[]; possible?: string[] };
      tagTiers = {
        confirmed: Array.isArray(raw.confirmed) ? raw.confirmed : [],
        suggested: Array.isArray(raw.suggested) ? raw.suggested : [],
        possible: Array.isArray(raw.possible) ? raw.possible : [],
      };
      flatTags = [...tagTiers.confirmed, ...tagTiers.suggested, ...tagTiers.possible];
    } else if (Array.isArray(parsed.tags)) {
      // Legacy flat array — put first 5 as confirmed, rest as suggested
      const all = parsed.tags as string[];
      tagTiers = {
        confirmed: all.slice(0, 5),
        suggested: all.slice(5, 10),
        possible: all.slice(10),
      };
      flatTags = all;
    } else {
      tagTiers = { confirmed: [], suggested: [], possible: [] };
      flatTags = [];
    }

    return {
      tags: flatTags.slice(0, 15),
      tagTiers,
      colors: Array.isArray(parsed.colors) ? parsed.colors.slice(0, 6) : [],
      mood: typeof parsed.mood === "string" ? parsed.mood : FALLBACK.mood,
      style: typeof parsed.style === "string" ? parsed.style : FALLBACK.style,
      contentType: typeof parsed.contentType === "string" ? parsed.contentType : FALLBACK.contentType,
      era: typeof parsed.era === "string" ? parsed.era : "",
      composition: typeof parsed.composition === "string" ? parsed.composition : "",
      typography: typeof parsed.typography === "string" ? parsed.typography : "",
    };
  } catch (err) {
    console.error("[tagger] tagReference failed:", err);
    return FALLBACK;
  }
}
