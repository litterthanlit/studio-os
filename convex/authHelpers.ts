/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AnyCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AnyCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  return identity;
}

export async function getUserByToken(
  db: any,
  tokenIdentifier: string
): Promise<Doc<"users"> | null> {
  return await db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

function isDisabledUser(user: Doc<"users"> | null): boolean {
  return Boolean(user && user.status === "disabled");
}

export async function getCurrentUser(ctx: AnyCtx): Promise<Doc<"users"> | null> {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId) {
    const user = await ctx.db.get(authUserId);
    if (!user || isDisabledUser(user)) return null;
    return user;
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await getUserByToken(ctx.db, identity.tokenIdentifier);
  if (!user || isDisabledUser(user)) return null;
  return user;
}

export async function requireUser(ctx: AnyCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(ctx: AnyCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await getCurrentUser(ctx);
  const email = identity.email?.toLowerCase();
  const allowlisted = Boolean(email && adminEmails().has(email));

  if (!user) {
    if (allowlisted) throw new Error("ADMIN_USER_NOT_STORED");
    throw new Error("UNAUTHORIZED");
  }

  const role = await ctx.db
    .query("roles")
    .withIndex("by_user_role", (q: any) => q.eq("userId", user._id).eq("role", "admin"))
    .unique();

  if (!allowlisted && !role) throw new Error("ADMIN_REQUIRED");
  return user;
}

export async function requireProjectOwner(
  ctx: AnyCtx,
  projectId: Id<"projects">
): Promise<{ user: Doc<"users">; project: Doc<"projects"> }> {
  const user = await requireUser(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
  if (project.ownerId !== user._id) throw new Error("PROJECT_FORBIDDEN");
  return { user, project };
}

export async function canReadProject(
  ctx: AnyCtx,
  projectId: Id<"projects">
): Promise<{ user: Doc<"users">; project: Doc<"projects"> }> {
  const user = await requireUser(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.status === "deleted") throw new Error("PROJECT_NOT_FOUND");
  if (project.ownerId === user._id) return { user, project };
  if (project.visibility === "shared" || project.visibility === "published") {
    return { user, project };
  }
  throw new Error("PROJECT_FORBIDDEN");
}

export async function canWriteProject(
  ctx: AnyCtx,
  projectId: Id<"projects">
): Promise<{ user: Doc<"users">; project: Doc<"projects"> }> {
  return requireProjectOwner(ctx, projectId);
}

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.CONVEX_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function now() {
  return Date.now();
}

export async function writeAuditLog(
  ctx: MutationCtx,
  input: {
    actorId?: Id<"users">;
    actorTokenIdentifier?: string;
    action: string;
    targetTable?: string;
    targetId?: string;
    metadata?: unknown;
    ipHash?: string;
    userAgent?: string;
  }
) {
  await ctx.db.insert("auditLogs", {
    ...input,
    createdAt: now(),
  });
}

export async function syncStudioUserRecord(
  ctx: MutationCtx,
  userId: Id<"users">,
  identity?: {
    tokenIdentifier?: string;
    subject?: string;
    email?: string | null;
    name?: string | null;
    pictureUrl?: string | null;
  } | null
) {
  const existing = await ctx.db.get(userId);
  if (!existing) return userId;
  const time = now();
  const email = (identity?.email ?? existing.email)?.toLowerCase();
  await ctx.db.patch(userId, {
    tokenIdentifier: identity?.tokenIdentifier ?? existing.tokenIdentifier ?? `convex|${userId}`,
    subject: identity?.subject ?? existing.subject ?? String(userId),
    email,
    name: identity?.name ?? existing.name,
    avatarUrl: identity?.pictureUrl ?? existing.avatarUrl ?? existing.image,
    onboardingComplete: existing.onboardingComplete ?? false,
    status: existing.status ?? "active",
    createdAt: existing.createdAt ?? time,
    updatedAt: time,
  });
  await ensureAllowlistedAdminRole(ctx, userId, email, time);
  return userId;
}

export async function ensureAllowlistedAdminRole(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string | undefined,
  time: number
) {
  if (!email || !adminEmails().has(email)) return;
  const existingRole = await ctx.db
    .query("roles")
    .withIndex("by_user_role", (q: any) => q.eq("userId", userId).eq("role", "admin"))
    .unique();
  if (existingRole) {
    await ctx.db.patch(existingRole._id, { updatedAt: time });
    return;
  }
  await ctx.db.insert("roles", {
    userId,
    role: "admin",
    source: "allowlist",
    createdAt: time,
    updatedAt: time,
  });
}
