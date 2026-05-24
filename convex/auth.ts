/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

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

export async function requireUser(ctx: AnyCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await getUserByToken(ctx.db, identity.tokenIdentifier);
  if (!user || user.status !== "active") throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(ctx: AnyCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await getUserByToken(ctx.db, identity.tokenIdentifier);
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
