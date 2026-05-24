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
  users: defineTable({
    tokenIdentifier: v.string(),
    subject: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    onboardingComplete: v.boolean(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_subject", ["subject"])
    .index("by_email", ["email"]),

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
  })
    .index("by_project", ["projectId"])
    .index("by_owner", ["ownerId"])
    .index("by_owner_project", ["ownerId", "projectId"])
    .index("by_status", ["status"]),

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
});
