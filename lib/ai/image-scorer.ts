// lib/ai/image-scorer.ts
// GPT-4 Vision API service for scoring inspiration images

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ImageScore {
  composition: number;
  color: number;
  mood: number;
  uniqueness: number;
  overall: number;
}

export interface ImageAnalysis {
  scores: ImageScore;
  tags: string[];
  colors: string[];
  mood: string;
  style: string;
  reasoning: string;
}

const SCORING_PROMPT = `You are an expert design curator analyzing images for a creative studio's inspiration feed.

Analyze this image and score it on four criteria (0-100):

1. COMPOSITION (0-100): Balance, visual hierarchy, rule of thirds, negative space usage, framing
2. COLOR (0-100): Color harmony, palette sophistication, contrast, color psychology
3. MOOD (0-100): Emotional impact, atmosphere, storytelling, evocativeness
4. UNIQUENESS (0-100): Originality, creative approach, distinctiveness from common stock imagery

Also provide:
- Tags: 5-8 descriptive keywords (e.g., "minimal", "editorial", "warm tones", "architectural")
- Dominant colors: 3-5 hex colors found in the image
- Mood: Single word describing the feeling (e.g., "serene", "energetic", "mysterious")
- Style: Design style category (e.g., "minimalist", "brutalist", "organic", "futuristic")
- Reasoning: Brief 1-2 sentence explanation of why it scored this way

Respond in this exact JSON format:
{
  "scores": {
    "composition": number,
    "color": number,
    "mood": number,
    "uniqueness": number,
    "overall": number
  },
  "tags": string[],
  "colors": string[],
  "mood": string,
  "style": string,
  "reasoning": string
}

Calculate overall as weighted average: (composition * 0.3 + color * 0.25 + mood * 0.25 + uniqueness * 0.2)
Round all scores to integers.
Only return valid JSON, no markdown formatting.`;

export async function scoreImage(imageUrl: string): Promise<ImageAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Using mini for cost-effectiveness, upgrade to gpt-4o if needed
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: SCORING_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "low", // Use low detail for faster/cheaper processing
            },
          },
        ],
      },
    ],
    max_tokens: 500,
    temperature: 0.3, // Lower temperature for consistent scoring
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from GPT-4 Vision");
  }

  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const analysis = JSON.parse(jsonStr) as ImageAnalysis;

    // Validate scores
    const scores = analysis.scores;
    if (
      typeof scores.composition !== "number" ||
      typeof scores.color !== "number" ||
      typeof scores.mood !== "number" ||
      typeof scores.uniqueness !== "number" ||
      typeof scores.overall !== "number"
    ) {
      throw new Error("Invalid score format from GPT-4 Vision");
    }

    // Ensure overall matches our formula
    const calculatedOverall = Math.round(
      scores.composition * 0.3 +
      scores.color * 0.25 +
      scores.mood * 0.25 +
      scores.uniqueness * 0.2
    );
    analysis.scores.overall = calculatedOverall;

    return analysis;
  } catch (error) {
    console.error("[image-scorer] Failed to parse GPT-4 Vision response:", content);
    throw new Error("Failed to parse image analysis");
  }
}

// Batch score multiple images with rate limiting
export async function scoreImagesBatch(
  images: { id: string; url: string }[],
  options: { delayMs?: number; onProgress?: (completed: number, total: number) => void } = {}
): Promise<Map<string, ImageAnalysis>> {
  const { delayMs = 100, onProgress } = options;
  const results = new Map<string, ImageAnalysis>();

  for (let i = 0; i < images.length; i++) {
    const { id, url } = images[i];

    try {
      const analysis = await scoreImage(url);
      results.set(id, analysis);
    } catch (error) {
      console.error(`[image-scorer] Failed to score image ${id}:`, error);
    }

    onProgress?.(i + 1, images.length);

    // Rate limiting delay between requests
    if (i < images.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
