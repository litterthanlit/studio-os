import { NextResponse } from "next/server";

const ARENA_API = "https://api.are.na/v2";

export type ArenaBlockNormalized = {
  id: string;
  imageUrl: string;
  title: string;
  source: "arena";
  tags: string[];
};

type ArenaBlock = {
  id: number;
  class?: string;
  title?: string | null;
  generated_title?: string | null;
  description?: string | null;
  image?: {
    display?: { url?: string };
    original?: { url?: string };
    thumb?: { url?: string };
  } | null;
  source?: { url?: string } | null;
};

function extractImageUrl(block: ArenaBlock): string | null {
  if (block.class === "Image" && block.image) {
    return (
      block.image.original?.url ??
      block.image.display?.url ??
      block.image.thumb?.url ??
      null
    );
  }
  if (block.class === "Link" && block.image) {
    return (
      block.image.display?.url ??
      block.image.thumb?.url ??
      block.image.original?.url ??
      null
    );
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelSlug: string }> }
) {
  const { channelSlug } = await params;
  const token = process.env.ARENA_ACCESS_TOKEN;
  if (!token || token === "your_token_here") {
    return NextResponse.json(
      { error: "ARENA_ACCESS_TOKEN is not configured" },
      { status: 401 }
    );
  }

  if (!channelSlug?.trim()) {
    return NextResponse.json(
      { error: "Channel slug is required" },
      { status: 400 }
    );
  }

  try {
    const channelRes = await fetch(
      `${ARENA_API}/channels/${encodeURIComponent(channelSlug)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 30 },
      }
    );
    if (!channelRes.ok) {
      if (channelRes.status === 404) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to load channel" },
        { status: channelRes.status }
      );
    }
    const channelData = await channelRes.json();
    const channelId = channelData.id;
    if (channelId == null) {
      return NextResponse.json(
        { error: "Invalid channel response" },
        { status: 502 }
      );
    }

    const allBlocks: ArenaBlockNormalized[] = [];
    let page = 1;
    const per = 50;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${ARENA_API}/channels/${channelId}/contents?page=${page}&per=${per}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 30 },
        }
      );

      if (!res.ok) {
        if (res.status === 404) {
          return NextResponse.json(
            { error: "Channel not found" },
            { status: 404 }
          );
        }
        if (res.status === 401) {
          return NextResponse.json(
            { error: "Invalid or expired Are.na token" },
            { status: 401 }
          );
        }
        const text = await res.text();
        return NextResponse.json(
          { error: "Are.na API error", details: text },
          { status: res.status }
        );
      }

      const data = await res.json();
      const contents: ArenaBlock[] = data.contents ?? data.blocks ?? data ?? [];
      const totalPages = data.total_pages ?? 1;

      for (const block of contents) {
        const imageUrl = extractImageUrl(block as ArenaBlock);
        if (!imageUrl) continue;

        const title =
          (block as ArenaBlock).title ??
          (block as ArenaBlock).generated_title ??
          "";
        const tags: string[] = [];
        const desc = (block as ArenaBlock).description;
        if (desc && typeof desc === "string") {
          const words = desc.replace(/#\w+/g, "").trim().split(/\s+/).filter(Boolean);
          tags.push(...words.slice(0, 5));
        }

        allBlocks.push({
          id: `arena-${(block as ArenaBlock).id}`,
          imageUrl,
          title: title || "Untitled",
          source: "arena",
          tags,
        });
      }

      hasMore = page < totalPages && contents.length === per;
      page += 1;
    }

    return NextResponse.json({ blocks: allBlocks });
  } catch (err) {
    console.error("[arena] channel contents error:", err);
    return NextResponse.json(
      { error: "Failed to fetch channel contents" },
      { status: 500 }
    );
  }
}
