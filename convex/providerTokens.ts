/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const provider = v.union(v.literal("pinterest"), v.literal("arena"), v.literal("dribbble"), v.literal("savee"), v.literal("cosmosso"));

export const storeTokens = action({
  args: {
    provider,
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    scopes: v.array(v.string()),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    const access = args.accessToken ? await encrypt(args.accessToken) : undefined;
    const refresh = args.refreshToken ? await encrypt(args.refreshToken) : undefined;
    await ctx.runMutation(internal.providerTokens.upsertEncrypted, {
      tokenIdentifier: identity.tokenIdentifier,
      provider: args.provider,
      encryptedAccessToken: access,
      encryptedRefreshToken: refresh,
      scopes: args.scopes,
      expiresAt: args.expiresAt,
      metadata: args.metadata,
    });
    return { ok: true };
  },
});

export const getAccessToken = internalAction({
  args: { provider },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    const row = await ctx.runQuery(internal.providerTokens.getEncryptedForIdentity, {
      tokenIdentifier: identity.tokenIdentifier,
      provider: args.provider,
    });
    if (!row?.encryptedAccessToken) return null;
    return await decrypt(row.encryptedAccessToken);
  },
});

export const upsertEncrypted = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    provider,
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    scopes: v.array(v.string()),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
    if (!user) throw new Error("USER_NOT_FOUND");
    const time = Date.now();
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_user_provider", (q: any) => q.eq("userId", user._id).eq("provider", args.provider))
      .unique();
    const patch = {
      encryptedAccessToken: args.encryptedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      tokenVersion: 1,
      scopes: args.scopes,
      expiresAt: args.expiresAt,
      metadata: args.metadata,
      updatedAt: time,
      rotatedAt: time,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("integrations", {
      userId: user._id,
      provider: args.provider,
      ...patch,
      createdAt: time,
    });
  },
});

export const getEncryptedForIdentity = internalQuery({
  args: {
    tokenIdentifier: v.string(),
    provider,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
    if (!user) return null;
    return await ctx.db
      .query("integrations")
      .withIndex("by_user_provider", (q: any) => q.eq("userId", user._id).eq("provider", args.provider))
      .unique();
  },
});

async function encrypt(value: string) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value)
  );
  return `v1:${base64(iv)}:${base64(new Uint8Array(encrypted))}`;
}

async function decrypt(value: string) {
  const [version, ivRaw, encryptedRaw] = value.split(":");
  if (version !== "v1" || !ivRaw || !encryptedRaw) throw new Error("INVALID_TOKEN_PAYLOAD");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivRaw) },
    await encryptionKey(),
    fromBase64(encryptedRaw)
  );
  return new TextDecoder().decode(decrypted);
}

async function encryptionKey() {
  const raw = process.env.PROVIDER_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("PROVIDER_TOKEN_ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function base64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
