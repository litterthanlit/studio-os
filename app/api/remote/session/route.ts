import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  joinSession,
  getSession,
  destroySession,
} from "@/lib/remote-control/session-store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, clientId, code, sessionId } = body as {
    action: "create" | "join" | "leave";
    clientId?: string;
    code?: string;
    sessionId?: string;
  };

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  if (action === "create") {
    const session = createSession(clientId);
    return NextResponse.json({
      sessionId: session.id,
      code: session.code,
      role: "host",
    });
  }

  if (action === "join") {
    if (!code) {
      return NextResponse.json({ error: "code required" }, { status: 400 });
    }
    const session = joinSession(code, clientId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      sessionId: session.id,
      code: session.code,
      role: "controller",
    });
  }

  if (action === "leave") {
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId required" },
        { status: 400 }
      );
    }
    const session = getSession(sessionId);
    if (session && session.hostId === clientId) {
      destroySession(sessionId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
