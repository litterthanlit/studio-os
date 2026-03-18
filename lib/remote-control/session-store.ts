export type RemoteCommand = {
  id: string;
  type:
    | "navigate-stage"
    | "select-breakpoint"
    | "select-node"
    | "scroll-to"
    | "toggle-panel"
    | "select-variant"
    | "zoom"
    | "custom";
  payload: Record<string, unknown>;
  timestamp: number;
};

export type RemoteSession = {
  id: string;
  code: string;
  hostId: string;
  controllerId: string | null;
  createdAt: number;
  lastActivity: number;
  commands: RemoteCommand[];
  /** SSE writers keyed by client ID */
  listeners: Map<string, ReadableStreamDefaultController<Uint8Array>>;
};

const sessions = new Map<string, RemoteSession>();
const codeIndex = new Map<string, string>(); // code → sessionId

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  return `rs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSession(hostId: string): RemoteSession {
  let code = generateCode();
  while (codeIndex.has(code)) {
    code = generateCode();
  }

  const session: RemoteSession = {
    id: generateId(),
    code,
    hostId,
    controllerId: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    commands: [],
    listeners: new Map(),
  };

  sessions.set(session.id, session);
  codeIndex.set(code, session.id);
  return session;
}

export function joinSession(
  code: string,
  controllerId: string
): RemoteSession | null {
  const sessionId = codeIndex.get(code.toUpperCase());
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.controllerId = controllerId;
  session.lastActivity = Date.now();
  broadcastEvent(session, {
    type: "controller-joined",
    controllerId,
  });
  return session;
}

export function getSession(sessionId: string): RemoteSession | null {
  return sessions.get(sessionId) ?? null;
}

export function getSessionByCode(code: string): RemoteSession | null {
  const sessionId = codeIndex.get(code.toUpperCase());
  if (!sessionId) return null;
  return sessions.get(sessionId) ?? null;
}

export function pushCommand(
  sessionId: string,
  command: RemoteCommand
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.commands.push(command);
  session.lastActivity = Date.now();
  // Keep only last 100 commands
  if (session.commands.length > 100) {
    session.commands = session.commands.slice(-100);
  }
  broadcastEvent(session, { type: "command", command });
  return true;
}

export function addListener(
  sessionId: string,
  clientId: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.listeners.set(clientId, controller);
  return true;
}

export function removeListener(sessionId: string, clientId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.listeners.delete(clientId);
}

export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  broadcastEvent(session, { type: "session-ended" });
  for (const ctrl of session.listeners.values()) {
    try {
      ctrl.close();
    } catch {
      // already closed
    }
  }
  codeIndex.delete(session.code);
  sessions.delete(sessionId);
}

function broadcastEvent(
  session: RemoteSession,
  data: Record<string, unknown>
): void {
  const encoded = new TextEncoder().encode(
    `data: ${JSON.stringify(data)}\n\n`
  );
  for (const [clientId, ctrl] of session.listeners) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      session.listeners.delete(clientId);
    }
  }
}

// Clean up stale sessions (no activity for 30 minutes)
const STALE_TIMEOUT = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > STALE_TIMEOUT) {
      destroySession(id);
    }
  }
}, 60_000);
