/* eslint-disable @typescript-eslint/no-explicit-any */
"use node";

import OpenAI from "openai";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const PINTEREST_API = "https://api.pinterest.com/v5";
const LUMMI_API = "https://api.lummi.ai/v1";
const GEMINI_FLASH = "google/gemini-2.5-flash";

export const listPinterestBoards = action({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdminAction(ctx);
    await consumeAdminBudget(ctx, admin.userId, "pinterest", "inspiration-admin-list-boards", 30, "standard");
    const token = requireEnv("PINTEREST_PERSONAL_ACCESS_TOKEN");
    return { boards: await listBoardsWithToken(token) };
  },
});

export const scorePinterest = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAction(ctx);
    await consumeAdminBudget(ctx, admin.userId, "pinterest", "inspiration-admin-score-pinterest", 10, "expensive");
    const query = args.query.trim();
    if (!query) throw new Error("QUERY_REQUIRED");
    const limit = Math.min(args.limit ?? 5, 5);
    const token = requireEnv("PINTEREST_PERSONAL_ACCESS_TOKEN");
    const importId = await ctx.runMutation(internal.inspirationAdmin.createImport, {
      requestedBy: admin.userId,
      provider: "pinterest",
      source: query,
    });

    try {
      const pins = await searchPinsWithToken(query, token, limit * 2);
      const results = await scoreAndStorePins(ctx, pins.slice(0, limit), query);
      await ctx.runMutation(internal.inspirationAdmin.finishImport, {
        importId,
        total: results.total,
        scored: results.scored,
        approved: results.approved,
      });
      return { query, ...results };
    } catch (error) {
      await ctx.runMutation(internal.inspirationAdmin.finishImport, {
        importId,
        total: 0,
        scored: 0,
        approved: 0,
        error: safeError(error),
      });
      throw error;
    }
  },
});

export const importPinterestBoard = action({
  args: {
    boardId: v.string(),
    boardName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAction(ctx);
    await consumeAdminBudget(ctx, admin.userId, "pinterest", "inspiration-admin-import-board", 10, "expensive");
    const boardId = args.boardId.trim();
    if (!boardId) throw new Error("BOARD_ID_REQUIRED");
    const limit = Math.min(args.limit ?? 5, 5);
    const token = requireEnv("PINTEREST_PERSONAL_ACCESS_TOKEN");
    const importId = await ctx.runMutation(internal.inspirationAdmin.createImport, {
      requestedBy: admin.userId,
      provider: "pinterest",
      source: boardId,
    });

    try {
      const pins = await fetchBoardPinsWithToken(boardId, token, limit * 3);
      const results = await scoreAndStorePins(ctx, pins.slice(0, limit), args.boardName ?? "Pinterest");
      await ctx.runMutation(internal.inspirationAdmin.finishImport, {
        importId,
        total: results.total,
        scored: results.scored,
        approved: results.approved,
      });
      return { boardId, boardName: args.boardName, ...results };
    } catch (error) {
      await ctx.runMutation(internal.inspirationAdmin.finishImport, {
        importId,
        total: 0,
        scored: 0,
        approved: 0,
        error: safeError(error),
      });
      throw error;
    }
  },
});

export const batchScoreLummi = action({
  args: {
    useLummi: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAction(ctx);
    await consumeAdminBudget(ctx, admin.userId, "lummi", "inspiration-admin-batch-score", 10, "expensive");
    const limit = Math.min(args.limit ?? 6, 8);
    const importId = await ctx.runMutation(internal.inspirationAdmin.createImport, {
      requestedBy: admin.userId,
      provider: "lummi",
      source: args.useLummi ? "lummi-random" : "sample",
    });

    try {
      const images = args.useLummi ? await fetchLummiImages(limit) : sampleImages(limit);
      const results = await scoreAndStoreImages(ctx, images, args.useLummi ? "lummi" : "sample");
      await ctx.runMutation(internal.inspirationAdmin.finishImport, {
        importId,
        total: results.total,
        scored: results.scored,
        approved: results.approved,
      });
      return results;
    } catch (error) {
      await ctx.runMutation(internal.inspirationAdmin.finishImport, {
        importId,
        total: 0,
        scored: 0,
        approved: 0,
        error: safeError(error),
      });
      throw error;
    }
  },
});

async function requireAdminAction(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  return await ctx.runQuery(internal.authorization.assertAdminIdentity, {
    tokenIdentifier: identity.tokenIdentifier,
    email: identity.email,
  });
}

async function consumeAdminBudget(
  ctx: any,
  userId: string,
  provider: "pinterest" | "lummi",
  route: string,
  limit: number,
  costCategory: "standard" | "expensive"
) {
  const result = await ctx.runMutation(internal.providerSecurity.consume, {
    namespace: route,
    subjectKey: `user:${userId}`,
    limit,
    windowMs: 60 * 60 * 1000,
    provider,
    route,
    costCategory,
    costUnits: costCategory === "expensive" ? 5 : 1,
  });
  if (!result.allowed) throw new Error("RATE_LIMITED");
}

async function scoreAndStorePins(ctx: any, pins: PinterestPin[], fallbackTitle: string) {
  const images: Array<{ id: string; url: string; thumbnailUrl?: string; title: string }> = [];
  for (const pin of pins) {
    const url = pinImageUrl(pin);
    if (!url) continue;
    images.push({
      id: pin.id,
      url,
      thumbnailUrl: url,
      title: pin.title || pin.description || fallbackTitle,
    });
  }
  return scoreAndStoreImages(ctx, images, "pinterest");
}

async function scoreAndStoreImages(
  ctx: any,
  images: Array<{ id: string; url: string; thumbnailUrl?: string; title?: string }>,
  source: "pinterest" | "lummi" | "sample"
) {
  let scored = 0;
  let approved = 0;
  const errors: string[] = [];

  for (const image of images) {
    try {
      const analysis = await scoreImage(image.url);
      const result = await ctx.runMutation(internal.inspirationAdmin.upsertScoredImage, {
        source,
        sourceId: image.id,
        imageUrl: image.url,
        thumbnailUrl: image.thumbnailUrl ?? image.url,
        title: image.title ?? "Untitled",
        analysis,
      });
      if (result.inserted) scored++;
      if (result.approved) approved++;
    } catch (error) {
      errors.push(safeError(error));
    }
  }

  return {
    total: images.length,
    scored,
    approved,
    errors: errors.length ? errors : undefined,
  };
}

async function scoreImage(imageUrl: string) {
  const apiKey = requireEnv("OPENROUTER_API_KEY");
  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://studio-os.io",
      "X-Title": process.env.OPENROUTER_APP_TITLE || "Studio OS",
    },
  });
  const response = await client.chat.completions.create({
    model: GEMINI_FLASH,
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: SCORING_PROMPT },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        ],
      },
    ],
  });
  const content = response.choices[0]?.message?.content ?? "";
  const raw = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? content) as Record<string, unknown>;
  return normalizeScore(raw);
}

function normalizeScore(raw: Record<string, unknown>) {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    flat[key.toLowerCase().replace(/[\s_-]+/g, "")] = value;
  }
  const nested = flat.scores && typeof flat.scores === "object" ? (flat.scores as Record<string, unknown>) : {};
  const score = (key: string) => {
    const value = nested[key] ?? flat[key];
    return typeof value === "number" ? Math.max(0, Math.min(Math.round(value), 100)) : 65;
  };
  const composition = score("composition");
  const color = score("color");
  const mood = score("mood");
  const uniqueness = score("uniqueness");
  const overall = Math.round(composition * 0.3 + color * 0.25 + mood * 0.25 + uniqueness * 0.2);
  const tags = toStringArray(flat.tags);
  const colors = toStringArray(flat.dominantcolors ?? flat.colors);
  return {
    scores: { composition, color, mood, uniqueness, overall },
    tags,
    colors,
    mood: typeof flat.mood === "string" ? flat.mood : "refined",
    style: typeof flat.style === "string" ? flat.style : "editorial",
    reasoning: typeof flat.reasoning === "string" ? flat.reasoning : "",
  };
}

async function fetchLummiImages(limit: number) {
  const token = requireEnv("LUMMI_API_KEY");
  const res = await fetch(`${LUMMI_API}/images/random?perPage=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Lummi ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.images ?? data.data ?? [];
  return items
    .map((item: any) => ({
      id: String(item.id),
      url: item.url ?? item.urls?.regular ?? item.urls?.original,
      thumbnailUrl: item.urls?.small ?? item.url ?? item.urls?.regular,
      title: item.title ?? item.alt ?? "Untitled",
    }))
    .filter((item: any) => item.id && item.url)
    .slice(0, limit);
}

function sampleImages(limit: number) {
  return SAMPLE_IMAGE_TEMPLATES.slice(0, limit).map((image, index) => ({
    id: `sample-${Date.now()}-${index}`,
    ...image,
  }));
}

async function listBoardsWithToken(token: string) {
  const boards: PinterestBoard[] = [];
  let bookmark: string | undefined;
  do {
    const params = new URLSearchParams({ page_size: "50" });
    if (bookmark) params.set("bookmark", bookmark);
    const res = await fetch(`${PINTEREST_API}/boards?${params}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Pinterest boards ${res.status}`);
    const data = await res.json();
    boards.push(...(data.items ?? []));
    bookmark = data.bookmark;
  } while (bookmark && boards.length < 200);
  return boards;
}

async function fetchBoardPinsWithToken(boardId: string, token: string, limit: number) {
  const pins: PinterestPin[] = [];
  let bookmark: string | undefined;
  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (bookmark) params.set("bookmark", bookmark);
    const res = await fetch(`${PINTEREST_API}/boards/${encodeURIComponent(boardId)}/pins?${params}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Pinterest board pins ${res.status}`);
    const data = await res.json();
    pins.push(...(data.items ?? []).filter((pin: PinterestPin) => pinImageUrl(pin)));
    bookmark = data.bookmark;
  } while (bookmark && pins.length < limit);
  return pins.slice(0, limit);
}

async function searchPinsWithToken(query: string, token: string, limit: number) {
  const params = new URLSearchParams({
    query,
    page_size: String(Math.min(limit, 25)),
    pin_type: "STATIC",
  });
  const res = await fetch(`${PINTEREST_API}/pins/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Pinterest search ${res.status}`);
  const data = await res.json();
  return (data.items ?? []).filter((pin: PinterestPin) => pinImageUrl(pin)).slice(0, limit);
}

function pinImageUrl(pin: PinterestPin) {
  const images = pin.media?.images;
  return images?.["1200x"]?.url ?? images?.original?.url ?? images?.["600x"]?.url ?? images?.["400x300"]?.url ?? null;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  pin_count: number;
  image_thumbnail_url?: string;
  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
};

type PinterestPin = {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  board_id: string;
  media?: {
    images?: {
      original?: { url: string; width: number; height: number };
      "1200x"?: { url: string; width: number; height: number };
      "600x"?: { url: string; width: number; height: number };
      "400x300"?: { url: string; width: number; height: number };
    };
  };
};

const SAMPLE_IMAGE_TEMPLATES = [
  { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80", title: "Modern interior" },
  { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80", title: "Minimal architecture" },
  { url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80", title: "Living space" },
  { url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=80", title: "Design detail" },
  { url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80", title: "Furniture design" },
  { url: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=400&q=80", title: "Interior detail" },
];

const SCORING_PROMPT = `You are an expert design curator analyzing images for a creative studio's inspiration feed.

Score this image from 0-100 for composition, color, mood, uniqueness, and overall. Return JSON only:
{"scores":{"composition":0,"color":0,"mood":0,"uniqueness":0,"overall":0},"tags":[],"colors":[],"mood":"","style":"","reasoning":""}`;
