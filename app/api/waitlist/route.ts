export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Resend } from "resend";

// ─── Storage ────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), "data", "waitlist.json");

async function readEntries(): Promise<string[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeEntries(entries: string[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2));
}

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

    const entries = await readEntries();

    if (entries.includes(normalised)) {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    // Save locally first
    await writeEntries([...entries, normalised]);

    // Add to Resend audience + send confirmation (non-blocking)
    await Promise.allSettled([
      addToAudience(normalised),
      sendConfirmationEmail(normalised),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waitlist]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── GET /api/waitlist — count only ─────────────────────────────────────────
export async function GET() {
  const entries = await readEntries();
  return NextResponse.json({ count: entries.length });
}
