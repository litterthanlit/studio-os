/**
 * Debut track 3 — live agent presence on the open canvas.
 *
 * Authorship lives on `canvasDocuments` metadata (`lastWriter`, `lastAgentAt`,
 * `lastAgentRevision`), not a CRDT. The signed-in editor reads it from the
 * reactive `loadCanvas` query.
 */

export const CANVAS_WRITERS = ["user", "agent"] as const;
export type CanvasWriter = (typeof CANVAS_WRITERS)[number];

export type CanvasDocumentAuthorship = {
  lastWriter: CanvasWriter | null;
  lastAgentAt: number | null;
  lastAgentRevision: number | null;
  revision: number | null;
};

export type AgentPresenceView = {
  visible: boolean;
  headline: string;
  meta: string;
};

export type CanvasAuthorshipPatch = {
  lastWriter: CanvasWriter;
  lastAgentAt?: number;
  lastAgentRevision?: number;
};

export function parseCanvasWriter(value: unknown): CanvasWriter | null {
  if (value === "user" || value === "agent") return value;
  return null;
}

export function authorshipFromCanvasDocument(
  doc:
    | {
        revision?: unknown;
        lastWriter?: unknown;
        lastAgentAt?: unknown;
        lastAgentRevision?: unknown;
      }
    | null
    | undefined,
): CanvasDocumentAuthorship {
  if (!doc) {
    return {
      lastWriter: null,
      lastAgentAt: null,
      lastAgentRevision: null,
      revision: null,
    };
  }

  return {
    lastWriter: parseCanvasWriter(doc.lastWriter),
    lastAgentAt: typeof doc.lastAgentAt === "number" ? doc.lastAgentAt : null,
    lastAgentRevision:
      typeof doc.lastAgentRevision === "number" ? doc.lastAgentRevision : null,
    revision: typeof doc.revision === "number" ? doc.revision : null,
  };
}

/**
 * Fields to patch onto `canvasDocuments` for a persist.
 * Agent writes stamp `lastAgentAt` / `lastAgentRevision`.
 * User writes only flip `lastWriter` — last agent markers stay.
 */
export function canvasDocumentAuthorshipPatch(args: {
  writer: CanvasWriter;
  nextRevision: number;
  time: number;
}): CanvasAuthorshipPatch {
  if (args.writer === "agent") {
    return {
      lastWriter: "agent",
      lastAgentAt: args.time,
      lastAgentRevision: args.nextRevision,
    };
  }
  return { lastWriter: "user" };
}

export function formatRelativeAgentTime(at: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - at);
  if (delta < 5_000) return "just now";
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function formatAgentPresence(
  authorship: CanvasDocumentAuthorship,
  nowMs: number,
): AgentPresenceView {
  if (authorship.lastWriter !== "agent") {
    return { visible: false, headline: "", meta: "" };
  }

  const revision = authorship.lastAgentRevision ?? authorship.revision;
  const parts: string[] = [];
  if (typeof revision === "number") parts.push(`rev ${revision}`);
  if (authorship.lastAgentAt != null) {
    parts.push(formatRelativeAgentTime(authorship.lastAgentAt, nowMs));
  }

  return {
    visible: true,
    headline: "Agent updated canvas",
    meta: parts.join(" · "),
  };
}

export function externalUpdateToastCopy(lastWriter: CanvasWriter | null): string {
  return lastWriter === "agent" ? "Agent updated canvas" : "Canvas updated externally";
}

/**
 * Local persist (including human undo) must not overwrite a newer remote
 * revision. Same comparison as Track 1 `shouldPromptExternalReload`.
 */
export function shouldBlockLocalPersistForNewerRemote(args: {
  localAppliedRevision: number | null;
  remoteRevision: number | null | undefined;
}): boolean {
  if (args.localAppliedRevision == null || args.remoteRevision == null) return false;
  return args.remoteRevision > args.localAppliedRevision;
}
