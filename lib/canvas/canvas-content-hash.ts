/**
 * Stable persist fingerprint for canvas documents.
 *
 * Viewport, selection, prompt chrome, and `updatedAt` change constantly while
 * the editor is open. They must not count as a Convex write. Items, components,
 * export artifact, and the authored prompt payload do.
 *
 * Keep this file isomorphic (no React / DOM / Node-only APIs). Convex
 * `persistCanvasState` imports it so the client and server skip on the same hash.
 */

export type CanvasPersistWriter = "user" | "agent";

function stripCompiledCodeFromItems(items: unknown): unknown {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const record = item as Record<string, unknown>;
    if (record.kind !== "artboard" || !("compiledCode" in record)) return item;
    const { compiledCode: _compiledCode, ...rest } = record;
    return rest;
  });
}

/**
 * Canonical subset of canvas state that is allowed to create a Convex revision.
 */
export function meaningfulCanvasPersistPayload(state: unknown): unknown {
  if (!state || typeof state !== "object") return state;
  const record = state as Record<string, unknown>;
  const prompt =
    record.prompt && typeof record.prompt === "object"
      ? (record.prompt as Record<string, unknown>)
      : {};

  return {
    schemaVersion: record.schemaVersion ?? null,
    items: stripCompiledCodeFromItems(record.items),
    components: record.components ?? [],
    exportArtifact: record.exportArtifact ?? null,
    activeBreakpoint: record.activeBreakpoint ?? null,
    prompt: {
      value: prompt.value ?? "",
      siteType: prompt.siteType ?? null,
      history: prompt.history ?? [],
    },
  };
}

export function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`)
    .join(",")}}`;
}

export function hashString(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + (i + 1);
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export function hashCanvasPersistState(state: unknown): string {
  return hashString(stableSerialize(meaningfulCanvasPersistPayload(state)));
}
