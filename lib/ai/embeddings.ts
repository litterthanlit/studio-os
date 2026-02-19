import OpenAI from "openai";

/**
 * Build the text string that represents a reference for embedding.
 * Concatenates all semantic fields so the vector captures full intent.
 */
export function buildEmbeddingText(fields: {
  title?: string | null;
  tags?: string[];
  mood?: string | null;
  style?: string | null;
  contentType?: string | null;
  board?: string | null;
}): string {
  return [
    fields.title,
    fields.board,
    fields.mood,
    fields.style,
    fields.contentType,
    ...(fields.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .slice(0, 8000); // stay well under token limit
}

/**
 * Generate a 1536-dimension embedding via text-embedding-3-small.
 * Returns [] if the API key is not configured or the call fails.
 * Cost: ~$0.02 / 1M tokens (~$0.00002 per reference).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here" || !text.trim()) {
    return [];
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.trim(),
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("[embeddings] generateEmbedding failed:", err);
    return [];
  }
}
