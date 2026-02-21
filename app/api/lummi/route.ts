import dns from "dns";
import { NextResponse } from "next/server";

dns.setDefaultResultOrder("ipv4first");

const LUMMI_API = (process.env.LUMMI_API_BASE_URL ?? "https://api.lummi.ai/v1").replace(/\/$/, "");

// --- In-memory cache ---
type CacheEntry = { data: unknown; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// --- Types ---
type LummiImage = {
  id: string;
  url?: string;
  urls?: {
    regular?: string;
    small?: string;
    thumb?: string;
    original?: string;
  };
  title?: string;
  alt?: string;
  alt_description?: string;
  colors?: string[];
  color?: string;
  width?: number;
  height?: number;
  attributionUrl?: string;
  author?: {
    name?: string;
    attributionUrl?: string;
  };
};

type NormalizedImage = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  source: "lummi";
  sourceUrl: string;
  tags: string[];
  colors: string[];
  projectId: null;
  boardId: string;
  createdAt: string;
  width?: number;
  height?: number;
};

function normalizeImage(img: LummiImage): NormalizedImage {
  const imageUrl =
    img.url ?? img.urls?.regular ?? img.urls?.original ?? "";
  const thumbnailUrl =
    img.urls?.small ?? img.urls?.thumb ?? imageUrl;
  const title =
    img.title ?? img.alt ?? img.alt_description ?? "Lummi AI Image";
  const colors: string[] = img.colors
    ? img.colors
    : img.color
    ? [img.color]
    : [];

  return {
    id: img.id,
    imageUrl,
    thumbnailUrl,
    title,
    source: "lummi",
    sourceUrl: `https://www.lummi.ai/photo/${img.id}`,
    tags: [],
    colors,
    projectId: null,
    boardId: "",
    createdAt: new Date().toISOString(),
    width: img.width,
    height: img.height,
  };
}

function extractImages(data: unknown): LummiImage[] {
  if (Array.isArray(data)) return data as LummiImage[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.images)) return d.images as LummiImage[];
    if (Array.isArray(d.results)) return d.results as LummiImage[];
    if (Array.isArray(d.data)) return d.data as LummiImage[];
    if (Array.isArray(d.photos)) return d.photos as LummiImage[];
  }
  return [];
}

function isNetworkLookupError(error: unknown): boolean {
  const e = error as {
    code?: string;
    cause?: { code?: string; message?: string };
    message?: string;
  };
  return (
    e?.code === "ENOTFOUND" ||
    e?.cause?.code === "ENOTFOUND" ||
    e?.code === "EAI_AGAIN" ||
    e?.cause?.code === "EAI_AGAIN" ||
    e?.message?.includes("fetch failed") === true
  );
}

export async function GET(req: Request) {
  const apiKey = process.env.LUMMI_API_KEY;
  const { searchParams } = new URL(req.url);

  // Config probe — lets the client decide whether to show the Stock tab
  if (searchParams.get("check") === "true") {
    return NextResponse.json({ configured: Boolean(apiKey) });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "LUMMI_API_KEY is not configured" },
      { status: 401 }
    );
  }

  const query = searchParams.get("query") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "12"), 50);
  const offset = Number(searchParams.get("offset") ?? "0");

  const cacheKey = `lummi:${query}:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    let endpoint: string;
    if (query.trim()) {
      endpoint = `${LUMMI_API}/images/search?query=${encodeURIComponent(query.trim())}&perPage=${limit}&page=${Math.floor(offset / limit) + 1}`;
    } else {
      endpoint = `${LUMMI_API}/images/random?perPage=${limit}`;
    }

    console.log("[lummi] endpoint:", endpoint);
    console.log("[lummi] apiKey exists:", Boolean(apiKey));
    console.log("[lummi] apiKey length:", apiKey?.length);

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json(
          { error: "Invalid Lummi API key" },
          { status: 401 }
        );
      }
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Lummi API error", details: text },
        { status: res.status }
      );
    }

    const data: unknown = await res.json();
    console.log(
      "[lummi] raw response keys:",
      data && typeof data === "object"
        ? Object.keys(data as Record<string, unknown>)
        : "not an object"
    );
    console.log("[lummi] images found:", extractImages(data).length);
    const raw = extractImages(data);
    const images = raw.map(normalizeImage);

    const total =
      data && typeof data === "object"
        ? ((data as Record<string, unknown>).total as number | undefined) ??
          images.length
        : images.length;

    const result = { images, total };
    setCache(cacheKey, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[lummi] fetch error:", err);
    if (isNetworkLookupError(err)) {
      // Graceful fallback so client screens don't hard-fail when upstream DNS/API is unavailable.
      return NextResponse.json(
        {
          images: [],
          total: 0,
          degraded: true,
          error: "Lummi API is temporarily unreachable",
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch Lummi images" },
      { status: 500 }
    );
  }
}
