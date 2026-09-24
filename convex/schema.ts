import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const timestamp = v.number();

const role = v.union(v.literal("admin"), v.literal("member"));
const roleSource = v.union(v.literal("allowlist"), v.literal("manual"), v.literal("claim"));
const projectVisibility = v.union(v.literal("private"), v.literal("shared"), v.literal("published"));
const projectStatus = v.union(v.literal("active"), v.literal("archived"), v.literal("deleted"));
const provider = v.union(
  v.literal("openrouter"),
  v.literal("openai"),
  v.literal("lummi"),
  v.literal("arena"),
  v.literal("pinterest"),
  v.literal("dribbble"),
  v.literal("savee"),
  v.literal("cosmosso"),
  v.literal("resend"),
  v.literal("internal")
);
const inspirationSource = v.union(v.literal("lummi"), v.literal("arena"), v.literal("pinterest"), v.literal("upload"), v.literal("sample"));
const curationStatus = v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("featured"));
const referenceSource = v.union(
  v.literal("arena"),
  v.literal("pinterest"),
  v.literal("cosmosso"),
  v.literal("savee"),
  v.literal("dribbble"),
  v.literal("upload"),
  v.literal("extension"),
  v.literal("lummi")
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    tokenIdentifier: v.optional(v.string()),
    subject: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
    createdAt: v.optional(timestamp),
    updatedAt: v.optional(timestamp),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_subject", ["subject"]),

  roles: defineTable({
    userId: v.id("users"),
    role,
    source: roleSource,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_user", ["userId"])
    .index("by_user_role", ["userId", "role"])
    .index("by_role", ["role"]),

  projects: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    brief: v.optional(v.string()),
    color: v.string(),
    visibility: projectVisibility,
    status: projectStatus,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_slug", ["ownerId", "slug"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // One canvas document per project (looked up `.unique()` on by_project).
  // `revision` is the shared expectedRevision counter for UI + agent writes.
  // `contentHash` is the persist fingerprint; identical hashes are no-ops.
  // `lastWriter` / `lastAgentAt` / `lastAgentRevision` are document-level
  // authorship for live agent presence (not a CRDT).
  canvasDocuments: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    schemaVersion: v.number(),
    documentVersion: v.number(),
    revision: v.number(),
    state: v.any(),
    status: projectStatus,
    lastSavedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    contentHash: v.optional(v.string()),
    lastSnapshotAt: v.optional(timestamp),
    lastSnapshotRevision: v.optional(v.number()),
    lastWriter: v.optional(v.union(v.literal("user"), v.literal("agent"))),
    lastAgentAt: v.optional(timestamp),
    lastAgentRevision: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_owner", ["ownerId"])
    .index("by_owner_project", ["ownerId", "projectId"])
    .index("by_status", ["status"]),

  // Retention: not every revision. Agent writes, every 20th user revision, or
  // 10 minutes since last snapshot. Newest 20 per document are kept.
  canvasSnapshots: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    canvasDocumentId: v.id("canvasDocuments"),
    revision: v.number(),
    state: v.any(),
    createdAt: timestamp,
  })
    .index("by_project", ["projectId"])
    .index("by_document_revision", ["canvasDocumentId", "revision"])
    .index("by_owner", ["ownerId"]),

  // Project-level design state (taste profile + design tokens). One row per
  // project, looked up `.unique()` on by_project. Written by the signed-in
  // editor; read by every agent route when the caller does not pass them.
  // localStorage (`studio-os:*` project state) stays a cache.
  projectDesignState: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    tasteProfile: v.optional(v.any()),
    designTokens: v.optional(v.any()),
    tasteUpdatedAt: v.optional(timestamp),
    tokensUpdatedAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_project", ["projectId"])
    .index("by_owner", ["ownerId"]),

  // Generation runs (master plan 1.1; absorbs the 0.10 agentRuns table). Every
  // editor, agent and benchmark generation is one row: queued → running →
  // complete | partial | failed, with step checkpoints, progress events and outputs.
  generationRuns: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    kind: v.union(
      v.literal("screen"),
      v.literal("screen-set"),
      v.literal("section"),
      v.literal("restyle"),
      v.literal("stress-test"),
      v.literal("benchmark")
    ),
    briefId: v.optional(v.id("designBriefs")),
    inputHash: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("partial"),
      v.literal("failed")
    ),
    input: v.any(),
    steps: v.array(
      v.object({
        key: v.string(),
        status: v.union(v.literal("pending"), v.literal("running"), v.literal("done"), v.literal("failed")),
        startedAt: v.optional(timestamp),
        endedAt: v.optional(timestamp),
        error: v.optional(v.string()),
        checkpoint: v.optional(v.any()),
      })
    ),
    progress: v.array(v.object({ step: v.string(), at: timestamp, detail: v.optional(v.string()) })),
    outputs: v.array(v.object({ kind: v.string(), ref: v.string(), data: v.optional(v.any()) })),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    missing: v.optional(v.array(v.string())),
    costMicros: v.optional(v.number()),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: v.optional(timestamp),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"])
    .index("by_owner", ["ownerId"]),

  // Uploaded images in Convex file storage (references, image-node replacements,
  // later captures). The canvas document stores only url + storage id + hash.
  assets: defineTable({
    ownerId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    storageId: v.id("_storage"),
    url: v.string(),
    hash: v.string(),
    mime: v.string(),
    byteSize: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    source: v.union(v.literal("upload"), v.literal("import"), v.literal("generated"), v.literal("capture")),
    createdAt: timestamp,
  })
    .index("by_hash", ["hash"])
    .index("by_project", ["projectId"])
    .index("by_project_hash", ["projectId", "hash"])
    .index("by_owner", ["ownerId"]),

  // ── Design Memory (master plan 1.1) ─────────────────────────────────────
  // Measured + perceived reference analysis, cached per content hash + analyzer version.
  referenceAnalyses: defineTable({
    ownerId: v.id("users"),
    assetHash: v.string(),
    assetId: v.optional(v.id("assets")),
    analyzerVersion: v.string(),
    measured: v.any(),
    perceived: v.any(),
    confidence: v.number(),
    createdAt: timestamp,
  }).index("by_owner_asset_version", ["ownerId", "assetHash", "analyzerVersion"]),

  // Versioned design briefs (goal, output type, per-reference roles, conflicts, questions).
  designBriefs: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    version: v.number(),
    brief: v.any(),
    createdAt: timestamp,
  }).index("by_project_version", ["projectId", "version"]),

  // Taste in layers: derived (from references) ← explicit (designer) ← learned (accepted preferences).
  tasteLayers: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    kind: v.union(v.literal("derived"), v.literal("explicit"), v.literal("learned")),
    cacheKey: v.optional(v.string()),
    data: v.any(),
    provenance: v.array(v.any()),
    updatedAt: timestamp,
  }).index("by_project_kind", ["projectId", "kind"]),

  // Scoped preferences learned from design actions (proposed → accepted | rejected).
  preferences: defineTable({
    ownerId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    dimension: v.string(),
    rule: v.string(),
    value: v.any(),
    scope: v.object({
      level: v.union(v.literal("node"), v.literal("screen"), v.literal("project"), v.literal("user")),
      targetId: v.optional(v.string()),
    }),
    evidence: v.object({ eventIds: v.array(v.string()), count: v.number() }),
    confidence: v.number(),
    status: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected")),
    origin: v.union(v.literal("human-edit"), v.literal("agent-edit"), v.literal("variant-pick"), v.literal("inferred")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_owner", ["ownerId"])
    .index("by_project_status", ["projectId", "status"]),

  // Design token sets (legacy DesignSystemTokens + DTCG form).
  tokenSets: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    name: v.string(),
    tokens: v.any(),
    dtcg: v.optional(v.any()),
    modes: v.optional(v.any()),
    updatedAt: timestamp,
  }).index("by_project", ["projectId"]),

  // Model-call telemetry (tokens, latency, cost estimate), batched from the server.
  modelCalls: defineTable({
    step: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedInputTokens: v.number(),
    latencyMs: v.number(),
    finishReason: v.union(v.null(), v.string()),
    costUsd: v.union(v.null(), v.number()),
    ok: v.boolean(),
    error: v.optional(v.string()),
    runId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    at: timestamp,
  })
    .index("by_run", ["runId"])
    .index("by_step_at", ["step", "at"])
    .index("by_at", ["at"]),

  boards: defineTable({
    ownerId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    name: v.string(),
    type: v.union(v.literal("all"), v.literal("brand"), v.literal("typography"), v.literal("color"), v.literal("layout"), v.literal("custom")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_owner", ["ownerId"])
    .index("by_project", ["projectId"]),

  references: defineTable({
    ownerId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    boardId: v.optional(v.string()),
    imageUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    source: referenceSource,
    tags: v.array(v.string()),
    tagTiers: v.optional(v.any()),
    colors: v.array(v.string()),
    mood: v.optional(v.string()),
    style: v.optional(v.string()),
    contentType: v.optional(v.string()),
    era: v.optional(v.string()),
    composition: v.optional(v.string()),
    typography: v.optional(v.string()),
    curationStatus: v.optional(v.union(v.literal("flag"), v.literal("reject"))),
    embedding: v.optional(v.array(v.number())),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_project", ["ownerId", "projectId"])
    .index("by_project", ["projectId"])
    .index("by_source", ["source"])
    .index("by_status", ["curationStatus"]),

  inspirationImages: defineTable({
    source: inspirationSource,
    sourceId: v.string(),
    imageUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    scoreComposition: v.number(),
    scoreColor: v.number(),
    scoreMood: v.number(),
    scoreUniqueness: v.number(),
    scoreOverall: v.number(),
    gptAnalysis: v.optional(v.any()),
    tags: v.array(v.string()),
    colors: v.array(v.string()),
    mood: v.optional(v.string()),
    style: v.optional(v.string()),
    curationStatus,
    reviewedAt: v.optional(timestamp),
    reviewedBy: v.optional(v.id("users")),
    displayCount: v.number(),
    lastDisplayedAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_source", ["source", "sourceId"])
    .index("by_status", ["curationStatus"])
    .index("by_status_score", ["curationStatus", "scoreOverall"])
    .index("by_created", ["createdAt"]),

  inspirationLikes: defineTable({
    userId: v.id("users"),
    imageId: v.id("inspirationImages"),
    feedbackTags: v.array(v.string()),
    likedAt: timestamp,
  })
    .index("by_user", ["userId"])
    .index("by_image", ["imageId"])
    .index("by_user_image", ["userId", "imageId"]),

  inspirationDaily: defineTable({
    userId: v.id("users"),
    dateKey: v.string(),
    imageIds: v.array(v.id("inspirationImages")),
    collection: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "dateKey"]),

  inspirationImports: defineTable({
    requestedBy: v.id("users"),
    provider,
    source: v.string(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    total: v.number(),
    scored: v.number(),
    approved: v.number(),
    error: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_requested", ["requestedBy"])
    .index("by_provider", ["provider"])
    .index("by_status", ["status"]),

  publishedExports: defineTable({
    ownerId: v.id("users"),
    publicId: v.string(),
    html: v.string(),
    isActive: v.boolean(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_public_id", ["publicId"])
    .index("by_owner", ["ownerId"])
    .index("by_active", ["isActive"]),

  shareLinks: defineTable({
    ownerId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    shareId: v.string(),
    projectName: v.string(),
    snapshot: v.any(),
    isActive: v.boolean(),
    expiresAt: v.optional(timestamp),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_share_id", ["shareId"])
    .index("by_owner", ["ownerId"])
    .index("by_project", ["projectId"])
    .index("by_active", ["isActive"]),

  integrations: defineTable({
    userId: v.id("users"),
    provider,
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    tokenVersion: v.number(),
    scopes: v.array(v.string()),
    expiresAt: v.optional(timestamp),
    metadata: v.optional(v.any()),
    createdAt: timestamp,
    updatedAt: timestamp,
    rotatedAt: v.optional(timestamp),
  })
    .index("by_user_provider", ["userId", "provider"])
    .index("by_provider", ["provider"]),

  providerUsage: defineTable({
    provider,
    route: v.string(),
    subjectKey: v.string(),
    userId: v.optional(v.id("users")),
    dayKey: v.string(),
    costCategory: v.union(v.literal("free"), v.literal("standard"), v.literal("expensive")),
    requestCount: v.number(),
    costUnits: v.number(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_provider_day", ["provider", "dayKey"])
    .index("by_route_day", ["route", "dayKey"])
    .index("by_subject_day", ["subjectKey", "dayKey"])
    .index("by_user_provider_day", ["userId", "provider", "dayKey"]),

  rateLimitBuckets: defineTable({
    bucketKey: v.string(),
    namespace: v.string(),
    subjectKey: v.string(),
    windowStart: timestamp,
    windowEnd: timestamp,
    count: v.number(),
    updatedAt: timestamp,
  })
    .index("by_bucket_key", ["bucketKey"])
    .index("by_namespace_subject", ["namespace", "subjectKey"])
    .index("by_namespace_window", ["namespace", "windowEnd"]),

  auditLogs: defineTable({
    actorId: v.optional(v.id("users")),
    actorTokenIdentifier: v.optional(v.string()),
    action: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: timestamp,
  })
    .index("by_actor", ["actorId"])
    .index("by_action", ["action"])
    .index("by_target", ["targetTable", "targetId"])
    .index("by_created", ["createdAt"]),

  waitlistEntries: defineTable({
    email: v.string(),
    status: v.union(v.literal("pending"), v.literal("invited"), v.literal("blocked")),
    source: v.optional(v.string()),
    ipHash: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  agentTokens: defineTable({
    userId: v.id("users"),
    name: v.string(),
    tokenHash: v.string(),
    prefix: v.string(),
    projectId: v.optional(v.id("projects")),
    lastUsedAt: v.optional(timestamp),
    createdAt: timestamp,
    revokedAt: v.optional(timestamp),
  })
    .index("by_user", ["userId"])
    .index("by_hash", ["tokenHash"]),
});
