import { GoogleGenerativeAI } from "@google/generative-ai";

export type TagResult = {
  tags: string[];
  colors: string[];
  mood: string;
  style: string;
  contentType: string;
};

const FALLBACK: TagResult = {
  tags: [],
  colors: [],
  mood: "calm",
  style: "minimal",
  contentType: "ui",
};

const PROMPT = `Analyze this design reference image. Return ONLY a valid JSON object with no markdown fences or extra text. Use this exact shape:
{
  "tags": ["<5-10 descriptive tags like brutalist, serif typography, gradient, dark mode, grid, whitespace, editorial, geometric>"],
  "colors": ["<3-6 hex codes for dominant colors, e.g. #1a1a1a>"],
  "mood": "<single word: bold | calm | playful | elegant | raw | tense | warm | cold | focused | dreamy>",
  "style": "<single word: minimal | maximalist | brutalist | editorial | organic | technical | luxury | retro | futurist>",
  "contentType": "<single word: ui | typography | branding | illustration | photography | pattern | layout | motion>"
}`;

export async function tagReference(imageUrl: string): Promise<TagResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return FALLBACK;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Fetch the image and convert to base64 for Gemini's inline data format
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.status}`);
    }

    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: base64,
          mimeType: contentType as "image/jpeg" | "image/png" | "image/webp",
        },
      },
    ]);

    const text = result.response.text().trim();

    // Strip markdown fences if Gemini wraps response
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<TagResult>;

    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
      colors: Array.isArray(parsed.colors) ? parsed.colors.slice(0, 6) : [],
      mood: typeof parsed.mood === "string" ? parsed.mood : FALLBACK.mood,
      style: typeof parsed.style === "string" ? parsed.style : FALLBACK.style,
      contentType:
        typeof parsed.contentType === "string"
          ? parsed.contentType
          : FALLBACK.contentType,
    };
  } catch (err) {
    console.error("[tagger] tagReference failed:", err);
    return FALLBACK;
  }
}
