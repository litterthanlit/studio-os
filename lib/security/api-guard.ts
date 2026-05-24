import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { consumeServerRouteLimit, getConvexClient } from "@/lib/convex/server";

type GuardOptions = {
  requireAuth?: boolean;
  maxBytes?: number;
  rateLimit?: {
    limit: number;
    windowMs: number;
    namespace: string;
  };
};

type GuardResult<T> =
  | {
      ok: true;
      body: T;
      userId: string | null;
      devBypass: boolean;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export const API_LIMITS = {
  aiRequestBytes: 512 * 1024,
  compositionRequestBytes: 128 * 1024,
  tokenRequestBytes: 256 * 1024,
  publishRequestBytes: 2 * 1024 * 1024,
  maxReferenceUrls: 8,
  maxAnalysisImages: 8,
} as const;

export function isConvexAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export async function readGuardedJson<T>(
  req: NextRequest,
  options: GuardOptions
): Promise<GuardResult<T>> {
  const maxBytes = options.maxBytes ?? API_LIMITS.aiRequestBytes;
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body too large" }, { status: 413 }),
    };
  }

  let userId: string | null = null;
  const devBypass = isDevAuthBypassEnabled();
  if (options.requireAuth && !devBypass) {
    const user = await getUserFromAuthorizationHeader(req);
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
      };
    }
    userId = user._id;
  }

  if (options.rateLimit) {
    const subjectKey = userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
    const limited = await consumeServerRouteLimit({
      namespace: options.rateLimit.namespace,
      subjectKey,
      limit: options.rateLimit.limit,
      windowMs: options.rateLimit.windowMs,
      provider: routeProvider(options.rateLimit.namespace),
      route: options.rateLimit.namespace,
      costCategory: options.rateLimit.limit <= 30 ? "expensive" : "standard",
    });
    if (!limited.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
            },
          }
        ),
      };
    }
  }

  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
    };
  }

  if (byteLength(raw) > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body too large" }, { status: 413 }),
    };
  }

  try {
    return { ok: true, body: JSON.parse(raw) as T, userId, devBypass };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
}

export function capStringArray(values: unknown, max: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .slice(0, max);
}

export function logSafe(message: string, metadata?: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  if (metadata) console.log(message, metadata);
  else console.log(message);
}

export function warnSafe(message: string, metadata?: unknown): void {
  if (metadata) console.warn(message, metadata);
  else console.warn(message);
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

async function getUserFromAuthorizationHeader(req: NextRequest) {
  const header = req.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const client = getConvexClient();
  if (!client) return null;
  client.setAuth(token);
  try {
    return await client.query(api.users.current, {});
  } catch {
    return null;
  } finally {
    client.clearAuth();
  }
}

function isDevAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.STUDIO_OS_DEV_AUTH_BYPASS !== "false"
  );
}

function routeProvider(namespace: string): "openrouter" | "openai" | "lummi" | "arena" | "pinterest" | "resend" | "internal" {
  if (namespace.includes("lummi")) return "lummi";
  if (namespace.includes("arena")) return "arena";
  if (namespace.includes("pinterest")) return "pinterest";
  if (namespace.includes("embed")) return "openai";
  if (namespace.includes("waitlist")) return "resend";
  return "openrouter";
}
