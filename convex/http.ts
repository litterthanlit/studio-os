import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return json({ ok: true });
  }),
});

http.route({
  path: "/waitlist",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email : "";
    const subjectKey = await anonymousKey(request);
    const limited = await ctx.runMutation(internal.providerSecurity.consume, {
      namespace: "waitlist",
      subjectKey,
      limit: 10,
      windowMs: 60 * 60 * 1000,
      provider: "resend",
      route: "waitlist",
      costCategory: "free",
      costUnits: 1,
    });
    if (!limited.allowed) {
      return json({ error: "Too many requests" }, 429, {
        "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
      });
    }
    try {
      const result = await ctx.runMutation(api.waitlist.add, {
        email,
        source: "convex-http",
        ipHash: subjectKey,
      });
      return json(result);
    } catch {
      return json({ error: "Invalid email address" }, 400);
    }
  }),
});

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

async function anonymousKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "";
  const input = `${ip}:${userAgent}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `anon:${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export default http;
