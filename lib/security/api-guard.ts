import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

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

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export const API_LIMITS = {
  aiRequestBytes: 512 * 1024,
  compositionRequestBytes: 128 * 1024,
  tokenRequestBytes: 256 * 1024,
  publishRequestBytes: 2 * 1024 * 1024,
  maxReferenceUrls: 8,
  maxAnalysisImages: 8,
} as const;

export function isSupabaseAuthConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    supabaseUrl &&
      supabaseKey &&
      !supabaseUrl.includes("your-project-ref")
  );
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
  const devBypass = !isSupabaseAuthConfigured();
  if (options.requireAuth && !devBypass) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
      };
    }
    userId = user.id;
  }

  if (options.rateLimit) {
    const key = `${options.rateLimit.namespace}:${userId ?? getClientIp(req)}`;
    const limited = checkRateLimit({
      key,
      limit: options.rateLimit.limit,
      windowMs: options.rateLimit.windowMs,
    });
    if (limited) return { ok: false, response: limited };
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

function checkRateLimit(options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const bucket = rateBuckets.get(options.key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }
  if (bucket.count >= options.limit) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      }
    );
  }
  bucket.count++;
  return null;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
