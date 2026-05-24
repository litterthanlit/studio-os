export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { api } from "@/convex/_generated/api";
import { consumeServerRouteLimit, getConvexClient } from "@/lib/convex/server";

// ─── Resend ──────────────────────────────────────────────────────────────────
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function addToAudience(email: string) {
  const resend = getResend();
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!resend || !audienceId) return;

  await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false,
  });
}

async function sendConfirmationEmail(email: string) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL ?? "Studio OS <hello@studio-os.io>";
  if (!resend) return;

  await resend.emails.send({
    from,
    to: email,
    subject: "You're on the Studio OS waitlist",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the list</title>
</head>
<body style="margin:0;padding:0;background:#F9F9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F7;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:12px;border:1px solid #E8E8E8;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid #F0F0F0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:32px;height:32px;background:#2430AD;border-radius:7px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:14px;font-weight:700;line-height:32px;">S</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-size:15px;font-weight:600;color:#111111;letter-spacing:-0.01em;">studio OS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111111;letter-spacing:-0.02em;line-height:1.25;">
                You&rsquo;re on the list.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#666666;line-height:1.6;font-weight:300;">
                Thanks for signing up for early access to Studio OS &mdash; the operating system built for creative studios.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#666666;line-height:1.6;font-weight:300;">
                We&rsquo;re building something we wish existed ourselves: one place for references, design tokens, briefs, and projects &mdash; scored, organised, and AI-ready.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#666666;line-height:1.6;font-weight:300;">
                We&rsquo;ll reach out personally when your spot is ready.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:999px;padding:12px 28px;">
                    <a href="https://studio-os.io" style="color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;letter-spacing:-0.01em;">
                      See what we&rsquo;re building &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #F0F0F0;background:#FAFAFA;">
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.5;">
                You&rsquo;re receiving this because you signed up at
                <a href="https://studio-os.io" style="color:#2430AD;text-decoration:none;">studio-os.io</a>.
                <br />If this was a mistake, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

// ─── POST /api/waitlist ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalised = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalised)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const subjectKey = `ip:${getClientIp(req)}`;
    const limited = await consumeServerRouteLimit({
      namespace: "waitlist",
      subjectKey,
      limit: 10,
      windowMs: 60 * 60 * 1000,
      provider: "resend",
      route: "waitlist",
      costCategory: "free",
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } }
      );
    }

    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json({ error: "Waitlist storage is not configured" }, { status: 503 });
    }
    const stored = await convex.mutation(api.waitlist.add, {
      email: normalised,
      source: "next-api",
      ipHash: subjectKey,
    });

    if (!stored.alreadyRegistered) {
      await Promise.allSettled([
        addToAudience(normalised),
        sendConfirmationEmail(normalised),
      ]);
    }

    return NextResponse.json(stored);
  } catch (err) {
    console.error("[waitlist]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── GET /api/waitlist — count only ─────────────────────────────────────────
export async function GET() {
  const convex = getConvexClient();
  if (!convex) return NextResponse.json({ count: 0 });
  const count = await convex.query(api.waitlist.count, {});
  return NextResponse.json({ count });
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}
