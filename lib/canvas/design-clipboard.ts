import type { DesignNode } from "./design-node";
import { cloneDesignNode } from "./design-node";

export const DN_CLIPBOARD_PREFIX = "studio-os/dn/v1:";

export function serializeDesignNodesForClipboard(nodes: DesignNode[]): string {
  return DN_CLIPBOARD_PREFIX + JSON.stringify({ v: 1, nodes });
}

export function parseDesignNodesFromClipboard(text: string): DesignNode[] | null {
  if (!text.startsWith(DN_CLIPBOARD_PREFIX)) return null;
  try {
    const raw = JSON.parse(text.slice(DN_CLIPBOARD_PREFIX.length)) as {
      v?: number;
      nodes?: DesignNode[];
    };
    if (raw?.v !== 1 || !Array.isArray(raw.nodes)) return null;
    return raw.nodes;
  } catch {
    return null;
  }
}

export function cloneNodesForPaste(nodes: DesignNode[]): DesignNode[] {
  return nodes.map((n) => cloneDesignNode(n));
}

/** In-session copy buffer so Cmd+V works without async clipboard read. */
let memoryDesignClip: DesignNode[] | null = null;

export function setMemoryDesignClip(nodes: DesignNode[]): void {
  memoryDesignClip = nodes.map((n) => JSON.parse(JSON.stringify(n)) as DesignNode);
}

export function getMemoryDesignClip(): DesignNode[] | null {
  return memoryDesignClip;
}
