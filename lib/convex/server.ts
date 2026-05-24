/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  return new ConvexHttpClient(url);
}

export async function consumeServerRouteLimit(input: {
  namespace: string;
  subjectKey: string;
  limit: number;
  windowMs: number;
  provider: "openrouter" | "openai" | "lummi" | "arena" | "pinterest" | "resend" | "internal";
  route: string;
  costCategory: "free" | "standard" | "expensive";
  costUnits?: number;
}) {
  const client = getConvexClient();
  const serviceSecret = process.env.CONVEX_INTERNAL_API_SECRET;
  if (!client || !serviceSecret) {
    return {
      configured: false,
      allowed: process.env.NODE_ENV !== "production",
      retryAfterMs: 0,
      remaining: 0,
    };
  }
  const result = await client.mutation(api.providerSecurity.consumeServerRoute, {
    serviceSecret,
    ...input,
  });
  return { configured: true, ...result };
}

export async function convexQuery<T>(queryRef: unknown, args: Record<string, unknown>): Promise<T | null> {
  const client = getConvexClient();
  if (!client) return null;
  return (await client.query(queryRef as any, args)) as T;
}
