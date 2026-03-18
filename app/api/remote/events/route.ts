import { NextRequest } from "next/server";
import {
  getSession,
  addListener,
  removeListener,
} from "@/lib/remote-control/session-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!sessionId || !clientId) {
    return new Response("sessionId and clientId required", { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      addListener(sessionId, clientId, controller);

      // Send initial connected event
      const msg = new TextEncoder().encode(
        `data: ${JSON.stringify({ type: "connected", sessionId, role: session.hostId === clientId ? "host" : "controller" })}\n\n`
      );
      controller.enqueue(msg);
    },
    cancel() {
      removeListener(sessionId, clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
