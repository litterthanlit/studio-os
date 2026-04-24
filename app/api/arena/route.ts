export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const ARENA_API = "https://api.are.na/v2";

export type ArenaChannel = {
  id: number;
  title: string;
  slug: string;
  length: number;
  status: string;
  thumb?: { url: string } | null;
  user?: { full_name: string };
};

export async function GET() {
  const token = process.env.ARENA_ACCESS_TOKEN;
  if (!token || token === "your_token_here") {
    return NextResponse.json(
      { error: "ARENA_ACCESS_TOKEN is not configured" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${ARENA_API}/me/channels`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
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
    const channels: ArenaChannel[] = Array.isArray(data)
      ? data
      : data.channels ?? data.contents ?? [];

    const withThumbnails = await Promise.all(
      channels.map(async (ch): Promise<ArenaChannel> => {
        const slug = ch.slug ?? ch.title;
        if (!slug) return { ...ch, thumb: null };
        try {
          const thumbRes = await fetch(
            `${ARENA_API}/channels/${encodeURIComponent(String(slug))}/thumb`,
            {
              headers: { Authorization: `Bearer ${token}` },
              next: { revalidate: 300 },
            }
          );
          if (!thumbRes.ok) return { ...ch, thumb: null };
          const thumbData = await thumbRes.json();
          const firstBlock = thumbData?.blocks?.[0] ?? thumbData?.[0];
          const thumbUrl =
            firstBlock?.image?.thumb?.url ??
            firstBlock?.image?.display?.url ??
            firstBlock?.image?.original?.url;
          return { ...ch, thumb: thumbUrl ? { url: thumbUrl } : null };
        } catch {
          return { ...ch, thumb: null };
        }
      })
    );

    return NextResponse.json({
      channels: withThumbnails.map((ch) => ({
        id: ch.id,
        title: ch.title,
        slug: ch.slug,
        length: ch.length,
        status: ch.status,
        thumb: ch.thumb?.url ?? null,
        user: ch.user,
      })),
    });
  } catch (err) {
    console.error("[arena] channels error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Are.na channels" },
      { status: 500 }
    );
  }
}
