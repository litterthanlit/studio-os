/* eslint-disable @typescript-eslint/no-explicit-any */
import { v, type PropertyValidators } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canReadProject, canWriteProject, now } from "./authHelpers";
import {
  DEFAULT_TOKEN_SET,
  migrateLegacyDesignState,
  type LegacyDesignStateRow,
} from "../lib/design-memory/types";

/**
 * Design Memory (master plan 1.1): briefs, taste layers, token sets, reference
 * analyses and preferences. Every function has three access paths, mirroring
 * convex/projects.ts:
 *   name              — signed-in project owner (reads also allow shared projects)
 *   nameForAgent      — server with CONVEX_INTERNAL_API_SECRET
 *   nameForUserAgent  — server secret + acting owner (personal agent tokens)
 */

type AnyCtx = QueryCtx | MutationCtx;
type Access = { project: Doc<"projects">; ownerId: Id<"users"> };
type Handler<Ctx, Args> = (ctx: Ctx, access: Access, args: Args) => Promise<any>;

const MAX_PAYLOAD_BYTES = 256 * 1024;

function assertServiceSecret(value: string) {
  const expected = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!expected || value !== expected) throw new Error("FORBIDDEN");
}

function assertSize(value: unknown, field: string) {
  if (value !== undefined && JSON.stringify(value).length > MAX_PAYLOAD_BYTES) {
    throw new Error(`${field.toUpperCase()}_TOO_LARGE`);
  }
}

async function projectForAgent(ctx: AnyCtx, projectId: Id<"projects">, actingUserId?: Id<"users">) {
  const project = await ctx.db.get(projectId);
  if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
  if (actingUserId && project.ownerId !== actingUserId) throw new Error("PROJECT_FORBIDDEN");
  return project as Doc<"projects">;
}

function accessTrio<Args extends Record<string, any>>(
  kind: "query" | "mutation",
  args: PropertyValidators,
  handler: Handler<any, Args>,
) {
  const register = (kind === "query" ? query : mutation) as typeof mutation;
  const owner = register({
    args: { projectId: v.id("projects"), ...args },
    handler: async (ctx: any, a: any) => {
      const { project } = kind === "query" ? await canReadProject(ctx, a.projectId) : await canWriteProject(ctx, a.projectId);
      return handler(ctx, { project, ownerId: project.ownerId }, a);
    },
  });
  const forAgent = register({
    args: { projectId: v.id("projects"), serviceSecret: v.string(), ...args },
    handler: async (ctx: any, a: any) => {
      assertServiceSecret(a.serviceSecret);
      const project = await projectForAgent(ctx, a.projectId);
      return handler(ctx, { project, ownerId: project.ownerId }, a);
    },
  });
  const forUserAgent = register({
    args: { projectId: v.id("projects"), actingUserId: v.id("users"), serviceSecret: v.string(), ...args },
    handler: async (ctx: any, a: any) => {
      assertServiceSecret(a.serviceSecret);
      const project = await projectForAgent(ctx, a.projectId, a.actingUserId);
      return handler(ctx, { project, ownerId: project.ownerId }, a);
    },
  });
  return { owner, forAgent, forUserAgent };
}

// ── Internal helpers (shared by the trios and convex/designState.ts) ─────────

export async function listTasteLayers(ctx: AnyCtx, projectId: Id<"projects">) {
  return await ctx.db
    .query("tasteLayers")
    .withIndex("by_project_kind", (q: any) => q.eq("projectId", projectId))
    .collect();
}

export async function upsertTasteLayer(
  ctx: MutationCtx,
  access: Access,
  layer: { kind: "derived" | "explicit" | "learned"; data: unknown; provenance: unknown[]; cacheKey?: string; updatedAt?: number },
) {
  assertSize(layer.data, "tasteLayer");
  const existing = await ctx.db
    .query("tasteLayers")
    .withIndex("by_project_kind", (q: any) => q.eq("projectId", access.project._id).eq("kind", layer.kind))
    .first();
  const row = {
    ownerId: access.ownerId,
    projectId: access.project._id,
    kind: layer.kind,
    data: layer.data,
    provenance: layer.provenance,
    ...(layer.cacheKey ? { cacheKey: layer.cacheKey } : {}),
    updatedAt: layer.updatedAt ?? now(),
  };
  if (existing) {
    await ctx.db.replace(existing._id, row);
    return existing._id;
  }
  return await ctx.db.insert("tasteLayers", row);
}

export async function deleteTasteLayer(ctx: MutationCtx, projectId: Id<"projects">, kind: "derived" | "explicit" | "learned") {
  const existing = await ctx.db
    .query("tasteLayers")
    .withIndex("by_project_kind", (q: any) => q.eq("projectId", projectId).eq("kind", kind))
    .first();
  if (existing) await ctx.db.delete(existing._id);
}

export async function listTokenSets(ctx: AnyCtx, projectId: Id<"projects">) {
  return await ctx.db
    .query("tokenSets")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .collect();
}

export async function upsertTokenSet(
  ctx: MutationCtx,
  access: Access,
  set: { name: string; tokens: unknown; dtcg?: unknown; modes?: unknown; updatedAt?: number },
) {
  assertSize(set.tokens, "tokens");
  const existing = (await listTokenSets(ctx, access.project._id)).find((row: any) => row.name === set.name);
  const row = {
    ownerId: access.ownerId,
    projectId: access.project._id,
    name: set.name,
    tokens: set.tokens,
    ...(set.dtcg !== undefined ? { dtcg: set.dtcg } : {}),
    ...(set.modes !== undefined ? { modes: set.modes } : {}),
    updatedAt: set.updatedAt ?? now(),
  };
  if (existing) {
    await ctx.db.replace(existing._id, row);
    return existing._id;
  }
  return await ctx.db.insert("tokenSets", row);
}

async function latestBrief(ctx: AnyCtx, projectId: Id<"projects">) {
  return await ctx.db
    .query("designBriefs")
    .withIndex("by_project_version", (q: any) => q.eq("projectId", projectId))
    .order("desc")
    .first();
}

/**
 * Idempotent migration of the 0.4 `projectDesignState` row into taste layers
 * and the default token set. Newer Design Memory rows are never overwritten,
 * and the legacy row is removed once migrated.
 */
export async function migrateProjectDesignStateRow(ctx: MutationCtx, access: Access) {
  const legacy = await ctx.db
    .query("projectDesignState")
    .withIndex("by_project", (q: any) => q.eq("projectId", access.project._id))
    .unique();
  if (!legacy) return { migrated: false, layers: 0, tokenSet: false };

  const plan = migrateLegacyDesignState(legacy as unknown as LegacyDesignStateRow);
  const layers = await listTasteLayers(ctx, access.project._id);
  let written = 0;
  for (const layer of plan.layers) {
    const existing = layers.find((row: any) => row.kind === layer.kind);
    if (existing && existing.updatedAt >= layer.updatedAt) continue;
    await upsertTasteLayer(ctx, access, layer);
    written++;
  }
  let tokenSet = false;
  if (plan.tokenSet) {
    const existing = (await listTokenSets(ctx, access.project._id)).find((row: any) => row.name === DEFAULT_TOKEN_SET);
    if (!existing || existing.updatedAt < plan.tokenSet.updatedAt) {
      await upsertTokenSet(ctx, access, plan.tokenSet);
      tokenSet = true;
    }
  }
  // One-shot: the legacy row is consumed, so later edits to Design Memory are
  // never overwritten by a re-run (and re-running is a no-op).
  await ctx.db.delete(legacy._id);
  return { migrated: written > 0 || tokenSet, layers: written, tokenSet };
}

function publicBrief(row: any) {
  if (!row) return null;
  return { ...row.brief, id: row._id, projectId: row.projectId, version: row.version, createdAt: row.createdAt };
}

function publicPreference(row: any) {
  const { _creationTime: _c, _id, ...rest } = row;
  return { ...rest, id: _id };
}

// ── Snapshot ──────────────────────────────────────────────────────────────

const snapshot = accessTrio("query", {}, async (ctx, access) => {
  const projectId = access.project._id;
  const [tasteLayers, tokenSets, brief, accepted] = await Promise.all([
    listTasteLayers(ctx, projectId),
    listTokenSets(ctx, projectId),
    latestBrief(ctx, projectId),
    ctx.db
      .query("preferences")
      .withIndex("by_project_status", (q: any) => q.eq("projectId", projectId).eq("status", "accepted"))
      .collect(),
  ]);
  return {
    projectId,
    tasteLayers: tasteLayers.map((row: any) => ({
      projectId: row.projectId,
      kind: row.kind,
      cacheKey: row.cacheKey,
      data: row.data,
      provenance: row.provenance,
      updatedAt: row.updatedAt,
    })),
    tokenSets: tokenSets.map((row: any) => ({
      projectId: row.projectId,
      name: row.name,
      tokens: row.tokens,
      dtcg: row.dtcg,
      modes: row.modes,
      updatedAt: row.updatedAt,
    })),
    brief: publicBrief(brief),
    preferences: accepted.map(publicPreference),
  };
});
export const getSnapshot = snapshot.owner;
export const getSnapshotForAgent = snapshot.forAgent;
export const getSnapshotForUserAgent = snapshot.forUserAgent;

// ── Briefs (versioned; every save is a new version) ──────────────────────

const saveBriefTrio = accessTrio("mutation", { brief: v.any() }, async (ctx, access, args: { brief: any }) => {
  assertSize(args.brief, "brief");
  const previous = await latestBrief(ctx, access.project._id);
  const version = (previous?.version ?? 0) + 1;
  const { id: _id, projectId: _p, version: _v, createdAt: _c, ...brief } = args.brief ?? {};
  if (Array.isArray(brief.questions) && brief.questions.length > 3) brief.questions = brief.questions.slice(0, 3);
  const createdAt = now();
  const briefId = await ctx.db.insert("designBriefs", {
    ownerId: access.ownerId,
    projectId: access.project._id,
    version,
    brief,
    createdAt,
  });
  return { briefId, version, createdAt };
});
export const saveBrief = saveBriefTrio.owner;
export const saveBriefForAgent = saveBriefTrio.forAgent;
export const saveBriefForUserAgent = saveBriefTrio.forUserAgent;

// ── Taste layers ──────────────────────────────────────────────────────────

const tasteLayerKind = v.union(v.literal("derived"), v.literal("explicit"), v.literal("learned"));
const saveTasteLayerTrio = accessTrio(
  "mutation",
  { kind: tasteLayerKind, data: v.any(), provenance: v.array(v.any()), cacheKey: v.optional(v.string()) },
  async (ctx, access, args: any) => ({
    layerId: await upsertTasteLayer(ctx, access, {
      kind: args.kind,
      data: args.data,
      provenance: args.provenance,
      cacheKey: args.cacheKey,
    }),
  }),
);
export const saveTasteLayer = saveTasteLayerTrio.owner;
export const saveTasteLayerForAgent = saveTasteLayerTrio.forAgent;
export const saveTasteLayerForUserAgent = saveTasteLayerTrio.forUserAgent;

// ── Token sets ────────────────────────────────────────────────────────────

const saveTokenSetTrio = accessTrio(
  "mutation",
  { name: v.optional(v.string()), tokens: v.any(), dtcg: v.optional(v.any()), modes: v.optional(v.any()) },
  async (ctx, access, args: any) => ({
    tokenSetId: await upsertTokenSet(ctx, access, {
      name: args.name ?? DEFAULT_TOKEN_SET,
      tokens: args.tokens,
      dtcg: args.dtcg,
      modes: args.modes,
    }),
  }),
);
export const saveTokenSet = saveTokenSetTrio.owner;
export const saveTokenSetForAgent = saveTokenSetTrio.forAgent;
export const saveTokenSetForUserAgent = saveTokenSetTrio.forUserAgent;

// ── Reference analyses (cached per owner + content hash + analyzer version) ──

const getAnalysisTrio = accessTrio(
  "query",
  { assetHash: v.string(), analyzerVersion: v.string() },
  async (ctx, access, args: any) => {
    const row = await ctx.db
      .query("referenceAnalyses")
      .withIndex("by_owner_asset_version", (q: any) =>
        q.eq("ownerId", access.ownerId).eq("assetHash", args.assetHash).eq("analyzerVersion", args.analyzerVersion),
      )
      .first();
    return row
      ? { assetHash: row.assetHash, analyzerVersion: row.analyzerVersion, measured: row.measured, perceived: row.perceived, confidence: row.confidence, createdAt: row.createdAt }
      : null;
  },
);
export const getReferenceAnalysis = getAnalysisTrio.owner;
export const getReferenceAnalysisForAgent = getAnalysisTrio.forAgent;
export const getReferenceAnalysisForUserAgent = getAnalysisTrio.forUserAgent;

const saveAnalysisTrio = accessTrio(
  "mutation",
  {
    assetHash: v.string(),
    analyzerVersion: v.string(),
    assetId: v.optional(v.id("assets")),
    measured: v.any(),
    perceived: v.any(),
    confidence: v.number(),
  },
  async (ctx, access, args: any) => {
    assertSize({ measured: args.measured, perceived: args.perceived }, "analysis");
    const existing = await ctx.db
      .query("referenceAnalyses")
      .withIndex("by_owner_asset_version", (q: any) =>
        q.eq("ownerId", access.ownerId).eq("assetHash", args.assetHash).eq("analyzerVersion", args.analyzerVersion),
      )
      .first();
    const row = {
      ownerId: access.ownerId,
      assetHash: args.assetHash,
      analyzerVersion: args.analyzerVersion,
      ...(args.assetId ? { assetId: args.assetId } : {}),
      measured: args.measured,
      perceived: args.perceived,
      confidence: Math.max(0, Math.min(1, args.confidence)),
      createdAt: now(),
    };
    if (existing) {
      await ctx.db.replace(existing._id, row);
      return { analysisId: existing._id };
    }
    return { analysisId: await ctx.db.insert("referenceAnalyses", row) };
  },
);
export const saveReferenceAnalysis = saveAnalysisTrio.owner;
export const saveReferenceAnalysisForAgent = saveAnalysisTrio.forAgent;
export const saveReferenceAnalysisForUserAgent = saveAnalysisTrio.forUserAgent;

// ── Preferences ───────────────────────────────────────────────────────────

const preferenceStatus = v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected"));

const listPreferencesTrio = accessTrio(
  "query",
  {
    status: v.optional(preferenceStatus),
    /** Also the owner's user-scoped rows from other projects (they apply everywhere). */
    includeUserScope: v.optional(v.boolean()),
    /** Also the owner's project- and user-scoped rows from other projects (scope inference evidence). */
    includeOwnerEvidence: v.optional(v.boolean()),
  },
  async (ctx, access, args: any) => {
    const statuses = args.status ? [args.status] : ["proposed", "accepted", "rejected"];
    const rows = [];
    for (const status of statuses) {
      rows.push(
        ...(await ctx.db
          .query("preferences")
          .withIndex("by_project_status", (q: any) => q.eq("projectId", access.project._id).eq("status", status))
          .collect()),
      );
    }
    if (args.includeUserScope || args.includeOwnerEvidence) {
      const levels = args.includeOwnerEvidence ? ["user", "project"] : ["user"];
      const owned = await ctx.db.query("preferences").withIndex("by_owner", (q: any) => q.eq("ownerId", access.ownerId)).collect();
      rows.push(
        ...owned.filter(
          (row: any) => row.projectId !== access.project._id && levels.includes(row.scope?.level) && statuses.includes(row.status),
        ),
      );
    }
    return rows.map(publicPreference);
  },
);
export const listPreferences = listPreferencesTrio.owner;
export const listPreferencesForAgent = listPreferencesTrio.forAgent;
export const listPreferencesForUserAgent = listPreferencesTrio.forUserAgent;

const proposePreferenceTrio = accessTrio(
  "mutation",
  {
    dimension: v.string(),
    rule: v.string(),
    value: v.any(),
    scope: v.object({
      level: v.union(v.literal("node"), v.literal("screen"), v.literal("project"), v.literal("user")),
      targetId: v.optional(v.string()),
    }),
    eventIds: v.array(v.string()),
    confidence: v.number(),
    origin: v.union(v.literal("human-edit"), v.literal("agent-edit"), v.literal("variant-pick"), v.literal("inferred")),
  },
  async (ctx, access, args: any) => {
    // Same dimension + scope + value → accumulate evidence on the open proposal.
    const open = await ctx.db
      .query("preferences")
      .withIndex("by_project_status", (q: any) => q.eq("projectId", access.project._id).eq("status", "proposed"))
      .collect();
    const key = JSON.stringify([args.dimension, args.scope.level, args.scope.targetId ?? null, args.value]);
    const match = open.find(
      (row: any) => JSON.stringify([row.dimension, row.scope.level, row.scope.targetId ?? null, row.value]) === key,
    );
    const time = now();
    if (match) {
      const eventIds = Array.from(new Set([...match.evidence.eventIds, ...args.eventIds])).slice(-50);
      await ctx.db.patch(match._id, {
        evidence: { eventIds, count: eventIds.length },
        confidence: Math.max(match.confidence, Math.min(1, args.confidence)),
        updatedAt: time,
      });
      return { preferenceId: match._id, merged: true };
    }
    const preferenceId = await ctx.db.insert("preferences", {
      ownerId: access.ownerId,
      projectId: access.project._id,
      dimension: args.dimension.slice(0, 80),
      rule: args.rule.slice(0, 300),
      value: args.value,
      scope: args.scope,
      evidence: { eventIds: args.eventIds.slice(-50), count: args.eventIds.length },
      confidence: Math.max(0, Math.min(1, args.confidence)),
      status: "proposed",
      origin: args.origin,
      createdAt: time,
      updatedAt: time,
    });
    return { preferenceId, merged: false };
  },
);
export const proposePreference = proposePreferenceTrio.owner;
export const proposePreferenceForAgent = proposePreferenceTrio.forAgent;
export const proposePreferenceForUserAgent = proposePreferenceTrio.forUserAgent;

const setPreferenceStatusTrio = accessTrio(
  "mutation",
  {
    preferenceId: v.id("preferences"),
    status: preferenceStatus,
    scope: v.optional(
      v.object({
        level: v.union(v.literal("node"), v.literal("screen"), v.literal("project"), v.literal("user")),
        targetId: v.optional(v.string()),
      }),
    ),
  },
  async (ctx, access, args: any) => {
    const row = await ctx.db.get(args.preferenceId);
    if (!row || row.projectId !== access.project._id) throw new Error("PREFERENCE_NOT_FOUND");
    await ctx.db.patch(args.preferenceId, {
      status: args.status,
      ...(args.scope ? { scope: args.scope } : {}),
      updatedAt: now(),
    });
    return { preferenceId: args.preferenceId, status: args.status };
  },
);
export const setPreferenceStatus = setPreferenceStatusTrio.owner;
export const setPreferenceStatusForAgent = setPreferenceStatusTrio.forAgent;
export const setPreferenceStatusForUserAgent = setPreferenceStatusTrio.forUserAgent;

// ── Migration from 0.4 projectDesignState ─────────────────────────────────

const migrateTrio = accessTrio("mutation", {}, async (ctx, access) => migrateProjectDesignStateRow(ctx, access));
export const migrateProjectDesignState = migrateTrio.owner;
export const migrateProjectDesignStateForAgent = migrateTrio.forAgent;
export const migrateProjectDesignStateForUserAgent = migrateTrio.forUserAgent;
