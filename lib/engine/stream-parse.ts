// lib/engine/stream-parse.ts
// Incremental parser for a streamed DesignNode tree (master plan 1.9, Live
// Build). The model streams one root frame; each completed element of the
// root's `children` array is a top-level section and is emitted as soon as its
// closing brace arrives, so the canvas can render sections while the rest of
// the page is still generating. The full text is kept for the final parse,
// which is validated exactly as a non-streamed response.

export type StreamedSection = {
  index: number;
  node: Record<string, unknown>;
};

export type SectionStreamParser = {
  /** Feed the next chunk of model output. Returns the sections completed by it. */
  push: (chunk: string) => StreamedSection[];
  /** Everything received so far (for the final, validated parse). */
  text: () => string;
  /** Sections emitted so far, in order. */
  sections: () => StreamedSection[];
  /**
   * Truncation recovery: the root object cut after the last complete section,
   * with `children` and the root closed. Root keys that follow `children` are
   * lost. Null before the first section completes.
   */
  recover: () => string | null;
};

type Frame =
  | { kind: "object"; key: string | null; expectKey: boolean; start: number }
  | { kind: "array"; key: string | null; start: number };

/**
 * Character-level scanner: tracks strings / escapes and an object/array stack,
 * remembers the key each container was opened under, and slices out each
 * element of `root.children` when it closes. Leading prose or ``` fences before
 * the first `{` are ignored. A malformed section (unparseable slice) is skipped;
 * the final parse still sees the full text.
 */
export function createSectionStreamParser(options: { onSection?: (section: StreamedSection) => void } = {}): SectionStreamParser {
  let buffer = "";
  let cursor = 0;
  let started = false;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let lastString: string | null = null;
  const stack: Frame[] = [];
  const emitted: StreamedSection[] = [];
  let rootStart = -1;
  let lastSectionEnd = -1;

  const inRootChildren = () => stack.length === 2 && stack[1]!.kind === "array" && stack[1]!.key === "children" && stack[0]!.kind === "object";

  function scan(): StreamedSection[] {
    const out: StreamedSection[] = [];
    for (; cursor < buffer.length; cursor++) {
      const ch = buffer[cursor]!;
      if (!started) {
        if (ch === "{") {
          started = true;
          rootStart = cursor;
          stack.push({ kind: "object", key: null, expectKey: true, start: cursor });
        }
        continue;
      }
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') {
          inString = false;
          try {
            lastString = JSON.parse(buffer.slice(stringStart, cursor + 1)) as string;
          } catch {
            lastString = null;
          }
        }
        continue;
      }
      const top = stack[stack.length - 1];
      switch (ch) {
        case '"':
          inString = true;
          stringStart = cursor;
          break;
        case ":":
          if (top?.kind === "object") top.expectKey = false;
          break;
        case ",":
          if (top?.kind === "object") top.expectKey = true;
          lastString = null;
          break;
        case "{":
        case "[": {
          const key = top?.kind === "object" && !top.expectKey ? lastString : null;
          stack.push(ch === "{" ? { kind: "object", key, expectKey: true, start: cursor } : { kind: "array", key, start: cursor });
          lastString = null;
          break;
        }
        case "}":
        case "]": {
          const closed = stack.pop();
          if (closed?.kind === "object" && ch === "}" && inRootChildren()) {
            try {
              const node = JSON.parse(buffer.slice(closed.start, cursor + 1)) as Record<string, unknown>;
              const section = { index: emitted.length, node };
              emitted.push(section);
              lastSectionEnd = cursor;
              out.push(section);
              options.onSection?.(section);
            } catch {
              // malformed slice: leave it to the final parse
            }
          }
          lastString = null;
          break;
        }
      }
    }
    return out;
  }

  return {
    push(chunk: string) {
      buffer += chunk;
      return scan();
    },
    text: () => buffer,
    sections: () => [...emitted],
    recover() {
      if (rootStart < 0 || lastSectionEnd < 0) return null;
      const candidate = `${buffer.slice(rootStart, lastSectionEnd + 1)}]}`;
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        return null;
      }
    },
  };
}
