import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  pushCommand,
  type RemoteCommand,
} from "@/lib/remote-control/session-store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, clientId, command } = body as {
    sessionId: string;
    clientId: string;
    command: Omit<RemoteCommand, "id" | "timestamp">;
  };

  if (!sessionId || !clientId || !command) {
    return NextResponse.json(
      { error: "sessionId, clientId, and command required" },
      { status: 400 }
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Only the controller (or host for testing) can send commands
  if (session.controllerId !== clientId && session.hostId !== clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const fullCommand: RemoteCommand = {
    ...command,
    id: `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  pushCommand(sessionId, fullCommand);
  return NextResponse.json({ ok: true, commandId: fullCommand.id });
}
