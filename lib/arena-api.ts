export type ArenaImportedReference = {
  id: string;
  imageUrl: string;
  title?: string;
  sourceUrl?: string;
};

type ArenaPublicBlock = {
  id: number;
  class?: string;
  title?: string | null;
  generated_title?: string | null;
  image?: {
    original?: { url?: string };
    display?: { url?: string };
    thumb?: { url?: string };
  } | null;
  source?: { url?: string } | null;
};

const ARENA_API = "https://api.are.na/v2";

function normalizeArenaSlug(input: string): string {
  const value = input.trim();
  if (!value) return "";

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      if (!url.hostname.includes("are.na")) {
        return "";
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1] ?? "";
    }
  } catch {
    // Fall back to slug-like input parsing below.
  }

  return value
    .replace(/^@/, "")
    .replace(/^channels\//i, "")
    .replace(/^channel\//i, "")
    .replace(/\/+$/, "");
}

export async function fetchArenaReferences(channelInput: string): Promise<{
  channelSlug: string;
  channelName: string;
  references: ArenaImportedReference[];
}> {
  const channelSlug = normalizeArenaSlug(channelInput);
  if (!channelSlug) {
    throw new Error("Enter a valid Are.na channel URL or slug.");
  }

  const channelRes = await fetch(`${ARENA_API}/channels/${encodeURIComponent(channelSlug)}`);
  const channelData = await channelRes.json().catch(() => ({}));
  if (!channelRes.ok) {
    throw new Error(channelData.error ?? "Failed to load Are.na channel.");
  }
  const channelName = String(channelData.title ?? channelSlug);

  const references: ArenaImportedReference[] = [];
  let page = 1;
  const per = 100;
  let hasMore = true;

  while (hasMore) {
    const contentsRes = await fetch(
      `${ARENA_API}/channels/${encodeURIComponent(channelSlug)}/contents?page=${page}&per=${per}`
    );
    const contentsData = await contentsRes.json().catch(() => ({}));
    if (!contentsRes.ok) {
      throw new Error(contentsData.error ?? "Failed to load Are.na channel contents.");
    }

    const items = (contentsData.contents ?? contentsData.blocks ?? []) as ArenaPublicBlock[];
    for (const block of items) {
      const imageUrl =
        block.image?.original?.url ??
        block.image?.display?.url ??
        block.image?.thumb?.url;
      if (!imageUrl) continue;
      references.push({
        id: `arena-${block.id}`,
        imageUrl,
        title: block.title || block.generated_title || channelName,
        sourceUrl: block.source?.url ?? `https://www.are.na/block/${block.id}`,
      });
    }

    const totalPages = Number(contentsData.total_pages ?? 1);
    hasMore = page < totalPages && items.length === per;
    page += 1;
  }

  return { channelSlug, channelName, references };
}
