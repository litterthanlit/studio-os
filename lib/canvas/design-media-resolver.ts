import type { DesignNode } from "./design-node";
import { walkDesignTree } from "./design-node";

const LUMMI_API = "https://api.lummi.ai/v1";

/**
 * Search Lummi for a stock photo matching the description.
 * Returns the best image URL, or null if no results.
 */
async function searchLummiImage(
  query: string,
  apiKey: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      query,
      perPage: "1",
      page: "1",
    });

    const res = await fetch(`${LUMMI_API}/images/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      images?: Array<{
        id: string;
        url?: string;
        urls?: { full?: string; regular?: string; small?: string };
      }>;
      data?: Array<{
        id: string;
        url?: string;
        urls?: { full?: string; regular?: string; small?: string };
      }>;
      results?: Array<{
        id: string;
        url?: string;
        urls?: { full?: string; regular?: string; small?: string };
      }>;
    };

    const images = data.images ?? data.data ?? data.results ?? [];
    const img = images[0];
    if (!img) return null;

    return img.urls?.regular ?? img.urls?.full ?? img.url ?? null;
  } catch {
    return null;
  }
}

type IntentTarget = { nodeId: string; field: "content.src" | "style.coverImage" };

/**
 * Resolve all "photo:..." intent strings in a DesignNode tree
 * to real image URLs via Lummi stock photo API.
 *
 * Handles two resolution targets:
 * - `content.src` on image nodes (e.g. "photo:fashion model in dramatic lighting")
 * - `style.coverImage` on frame nodes (e.g. "photo:editorial hero photograph")
 *
 * - Collects all unique photo intents from both fields
 * - Batch-resolves via Lummi (max 6 concurrent)
 * - Replaces intent strings with real CDN URLs
 * - Strips unresolvable intents (deletes the property)
 *
 * If LUMMI_API_KEY is not set, strips all photo intents silently.
 */
export async function resolveDesignMediaUrls(tree: DesignNode): Promise<DesignNode> {
  const lummiKey = process.env.LUMMI_API_KEY;

  // Collect all unique photo intent descriptions and their node targets
  const intents = new Map<string, IntentTarget[]>(); // description -> targets

  walkDesignTree(tree, (node) => {
    // Check content.src
    const src = node.content?.src;
    if (src && src.startsWith("photo:")) {
      const desc = src.slice(6).trim();
      if (desc) {
        if (!intents.has(desc)) intents.set(desc, []);
        intents.get(desc)!.push({ nodeId: node.id, field: "content.src" });
      }
    }

    // Check style.coverImage
    const coverImage = node.style?.coverImage;
    if (coverImage && coverImage.startsWith("photo:")) {
      const desc = coverImage.slice(6).trim();
      if (desc) {
        if (!intents.has(desc)) intents.set(desc, []);
        intents.get(desc)!.push({ nodeId: node.id, field: "style.coverImage" });
      }
    }
  });

  if (intents.size === 0) return tree;

  console.log(
    `[MEDIA-V6] Resolving ${intents.size} unique image intents via Lummi...`
  );

  // Resolve each unique description
  const resolved = new Map<string, string>();

  if (lummiKey) {
    // Resolve in parallel (max 6 concurrent)
    const entries = [...intents.keys()];
    const batchSize = 6;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (desc) => {
          const url = await searchLummiImage(desc, lummiKey);
          if (url) resolved.set(desc, url);
        })
      );
      // Log failures
      results.forEach((r, idx) => {
        if (r.status === "rejected") {
          console.warn(
            `[MEDIA-V6] Lummi search failed for "${batch[idx].slice(0, 40)}": ${r.reason}`
          );
        }
      });
    }
    console.log(
      `[MEDIA-V6] Resolved ${resolved.size}/${intents.size} images`
    );
  } else {
    console.log(
      "[MEDIA-V6] No LUMMI_API_KEY — stripping photo intents"
    );
  }

  // Apply resolved URLs or strip unresolvable intents
  walkDesignTree(tree, (node) => {
    // Handle content.src
    const src = node.content?.src;
    if (src && src.startsWith("photo:")) {
      const desc = src.slice(6).trim();
      const realUrl = resolved.get(desc);
      if (realUrl) {
        node.content!.src = realUrl;
      } else {
        // Strip — renderer returns null for missing src
        delete node.content!.src;
        delete node.content!.alt;
      }
    }

    // Handle style.coverImage
    const coverImage = node.style?.coverImage;
    if (coverImage && coverImage.startsWith("photo:")) {
      const desc = coverImage.slice(6).trim();
      const realUrl = resolved.get(desc);
      if (realUrl) {
        node.style.coverImage = realUrl;
      } else {
        // Strip — renderer falls back to background color
        delete node.style.coverImage;
      }
    }
  });

  return tree;
}
