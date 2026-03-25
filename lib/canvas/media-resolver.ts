import type { PageNode } from "./compose";

const LUMMI_API = "https://api.lummi.ai/v1";

/**
 * Walk a PageNode tree and call a callback on every node.
 */
function walkTree(node: PageNode, callback: (n: PageNode) => void): void {
  callback(node);
  node.children?.forEach((child) => walkTree(child, callback));
}

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

/**
 * Resolve all "photo:..." intent strings in a PageNode tree
 * to real image URLs via Lummi stock photo API.
 *
 * - Collects all unique photo intents
 * - Batch-resolves via Lummi (one search per unique description)
 * - Replaces intent strings with real CDN URLs
 * - Strips unresolvable intents (so MediaFrame returns null cleanly)
 *
 * If LUMMI_API_KEY is not set, strips all photo intents silently.
 */
export async function resolveMediaUrls(tree: PageNode): Promise<PageNode> {
  const lummiKey = process.env.LUMMI_API_KEY;

  // Collect all unique photo intent descriptions
  const intents = new Map<string, string[]>(); // description -> nodeIds
  walkTree(tree, (node) => {
    const url = node.content?.mediaUrl;
    if (url && url.startsWith("photo:")) {
      const desc = url.slice(6).trim();
      if (desc) {
        if (!intents.has(desc)) intents.set(desc, []);
        intents.get(desc)!.push(node.id);
      }
    }
  });

  if (intents.size === 0) return tree;

  console.log(
    `[MEDIA] Resolving ${intents.size} unique image intents via Lummi...`
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
            `[MEDIA] Lummi search failed for "${batch[idx].slice(0, 40)}": ${r.reason}`
          );
        }
      });
    }
    console.log(
      `[MEDIA] Resolved ${resolved.size}/${intents.size} images`
    );
  } else {
    console.log(
      "[MEDIA] No LUMMI_API_KEY — stripping photo intents"
    );
  }

  // Apply resolved URLs or strip unresolvable intents
  walkTree(tree, (node) => {
    const url = node.content?.mediaUrl;
    if (url && url.startsWith("photo:")) {
      const desc = url.slice(6).trim();
      const realUrl = resolved.get(desc);
      if (realUrl) {
        node.content!.mediaUrl = realUrl;
      } else {
        // Strip — MediaFrame returns null for missing src
        delete node.content!.mediaUrl;
        delete node.content!.mediaAlt;
      }
    }
  });

  return tree;
}
