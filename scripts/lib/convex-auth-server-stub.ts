/**
 * Proof-only stand-in for `@convex-dev/auth/server` (see scripts/lib/fake-convex.ts).
 * `getAuthUserId` mirrors the real implementation: the Convex Auth identity
 * subject is "<userId>|<sessionId>".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getAuthUserId(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const [userId] = String(identity.subject).split("|");
  return userId || null;
}

export function convexAuth() {
  throw new Error("convexAuth is not available in proofs");
}
