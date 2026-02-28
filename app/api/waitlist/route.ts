export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// ─── Storage ────────────────────────────────────────────────────────────────
// Saves to /data/waitlist.json in the project root.
// Swap this for Resend, Loops, Mailchimp, or a DB write when you're ready.
// e.g. Resend: POST https://api.resend.com/contacts with { email, audience_id }

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
      // Idempotent — already on the list, just return success
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    await writeEntries([...entries, normalised]);

    // ── Optional: forward to Resend audience ──────────────────────────────
    // const RESEND_API_KEY = process.env.RESEND_API_KEY;
    // const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
    // if (RESEND_API_KEY && RESEND_AUDIENCE_ID) {
    //   await fetch("https://api.resend.com/contacts", {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Bearer ${RESEND_API_KEY}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ email: normalised, audience_id: RESEND_AUDIENCE_ID }),
    //   });
    // }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waitlist]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── GET /api/waitlist — simple count (no email exposure) ───────────────────
export async function GET() {
  const entries = await readEntries();
  return NextResponse.json({ count: entries.length });
}
