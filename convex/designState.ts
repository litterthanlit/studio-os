/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canReadProject, canWriteProject, now } from "./authHelpers";
import {
  deleteTasteLayer,
  listTasteLayers,
  listTokenSets,
  migrateProjectDesignStateRow,
  upsertTasteLayer,
  upsertTokenSet,
} from "./designMemory";
import {
  DEFAULT_TOKEN_SET,
  splitTasteProfile,
  tasteProfileFromLayers,
  type LegacyTasteProfile,
} from "../lib/design-memory/types";

/**
 * Project design state (taste profile + design tokens) — the 0.4 API, now
 * stored in Design Memory: the taste profile as `derived` + `explicit` taste
 * layers and the tokens as the `default` token set (master plan 1.1). Reads fall
 * back to a not-yet-migrated `projectDesignState` row; the first save migrates it.
 */

const MAX_DESIGN_STATE_BYTES = 256 * 1024;

const designStateResult = v.union(
  v.null(),
  v.object({
    tasteProfile: v.union(v.null(), v.any()),
    designTokens: v.union(v.null(), v.any()),
    tasteUpdatedAt: v.union(v.null(), v.number()),
    tokensUpdatedAt: v.union(v.null(), v.number()),
    updatedAt: v.number(),
  }),
);

/** `undefined` leaves a field unchanged; `null` clears it. */
const optionalValue = v.optional(v.union(v.null(), v.any()));

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}

function assertSize(value: unknown, field: string) {
  if (value === undefined || value === null) return;
  if (typeof value !== "object") throw new Error(`INVALID_${field.toUpperCase()}`);
  if (JSON.stringify(value).length > MAX_DESIGN_STATE_BYTES) throw new Error(`${field.toUpperCase()}_TOO_LARGE`);
}

async function readDesignState(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  const [layers, tokenSets] = await Promise.all([listTasteLayers(ctx, projectId), listTokenSets(ctx, projectId)]);
  const tokenSet = tokenSets.find((row: any) => row.name === DEFAULT_TOKEN_SET);
  if (layers.length > 0 || tokenSet) {
    const tasteLayers = layers.filter((row: any) => row.kind === "derived" || row.kind === "explicit");
    const tasteUpdatedAt = tasteLayers.reduce((max: number, row: any) => Math.max(max, row.updatedAt), 0) || null;
    return {
      tasteProfile: tasteProfileFromLayers(tasteLayers),
      designTokens: tokenSet?.tokens ?? null,
      tasteUpdatedAt,
      tokensUpdatedAt: tokenSet?.updatedAt ?? null,
      updatedAt: Math.max(tasteUpdatedAt ?? 0, tokenSet?.updatedAt ?? 0),
    };
  }

  const legacy = await ctx.db
    .query("projectDesignState")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .unique();
  if (!legacy) return null;
  return {
    tasteProfile: legacy.tasteProfile ?? null,
    designTokens: legacy.designTokens ?? null,
    tasteUpdatedAt: legacy.tasteUpdatedAt ?? null,
    tokensUpdatedAt: legacy.tokensUpdatedAt ?? null,
    updatedAt: legacy.updatedAt,
  };
}

async function requireOwnedProjectForUserAgent(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  actingUserId: Id<"users">,
) {
  const project = await ctx.db.get(projectId);
  if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
  if (project.ownerId !== actingUserId) throw new Error("PROJECT_FORBIDDEN");
  return project;
}

export const get = query({
  args: { projectId: v.id("projects") },
  returns: designStateResult,
  handler: async (ctx, args) => {
    await canReadProject(ctx, args.projectId);
    return await readDesignState(ctx, args.projectId);
  },
});

export const save = mutation({
  args: {
    projectId: v.id("projects"),
    tasteProfile: optionalValue,
    designTokens: optionalValue,
  },
  returns: v.object({ updatedAt: v.number() }),
  handler: async (ctx, args) => {
    const { project } = await canWriteProject(ctx, args.projectId);
    assertSize(args.tasteProfile, "tasteProfile");
    assertSize(args.designTokens, "designTokens");
    const access = { project: project as Doc<"projects">, ownerId: project.ownerId };
    await migrateProjectDesignStateRow(ctx, access);

    const time = now();
    if (args.tasteProfile === null) {
      await deleteTasteLayer(ctx, args.projectId, "derived");
      await deleteTasteLayer(ctx, args.projectId, "explicit");
    } else if (args.tasteProfile !== undefined) {
      const { derived, explicit } = splitTasteProfile(args.tasteProfile as LegacyTasteProfile);
      await upsertTasteLayer(ctx, access, {
        kind: "derived",
        data: derived,
        provenance: [{ source: "perceived", confidence: typeof derived.confidence === "number" ? derived.confidence : 0.5 }],
        updatedAt: time,
      });
      if (explicit) {
        await upsertTasteLayer(ctx, access, {
          kind: "explicit",
          data: explicit,
          provenance: [{ source: "explicit", confidence: 1 }],
          updatedAt: time,
        });
      } else {
        await deleteTasteLayer(ctx, args.projectId, "explicit");
      }
    }

    if (args.designTokens === null) {
      const existing = (await listTokenSets(ctx, args.projectId)).find((row: any) => row.name === DEFAULT_TOKEN_SET);
      if (existing) await ctx.db.delete(existing._id);
    } else if (args.designTokens !== undefined) {
      await upsertTokenSet(ctx, access, { name: DEFAULT_TOKEN_SET, tokens: args.designTokens, updatedAt: time });
    }
    return { updatedAt: time };
  },
});

export const getForAgent = query({
  args: {
    projectId: v.id("projects"),
    serviceSecret: v.string(),
  },
  returns: designStateResult,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
    return await readDesignState(ctx, args.projectId);
  },
});

export const getForUserAgent = query({
  args: {
    projectId: v.id("projects"),
    actingUserId: v.id("users"),
    serviceSecret: v.string(),
  },
  returns: designStateResult,
  handler: async (ctx, args) => {
    assertServiceSecret(args.serviceSecret);
    await requireOwnedProjectForUserAgent(ctx, args.projectId, args.actingUserId);
    return await readDesignState(ctx, args.projectId);
  },
});
