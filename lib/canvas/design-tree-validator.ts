// lib/canvas/design-tree-validator.ts
// Validates and normalizes AI-generated DesignNode JSON.
// Structural validation, ID deduplication, grid constraint enforcement.

import type { DesignNode, DesignNodeType } from "./design-node";

const VALID_TYPES: Set<string> = new Set([
  "frame",
  "text",
  "image",
  "button",
  "divider",
]);

// MVP grid patterns — anything else falls back to flex column
const VALID_GRID_PATTERNS = [
  /^repeat\(\s*[2-4]\s*,\s*1fr\s*\)$/, // repeat(2, 1fr) through repeat(4, 1fr)
  /^[1-4]fr(\s+[1-4]fr){1,2}$/,         // "2fr 1fr", "1fr 2fr", "3fr 2fr", "2fr 1fr 1fr", etc.
];

function isValidGrid(template: string): boolean {
  const normalized = template.trim();
  return VALID_GRID_PATTERNS.some((p) => p.test(normalized));
}

/** Normalize shorthand grids: "1fr 1fr" → "repeat(2, 1fr)" */
function normalizeGrid(template: string): string {
  const t = template.trim();
  const parts = t.split(/\s+/);
  if (parts.every((p) => p === "1fr") && parts.length >= 2 && parts.length <= 4) {
    return `repeat(${parts.length}, 1fr)`;
  }
  return t;
}

let idCounter = 0;
function ensureUniqueId(prefix: string): string {
  idCounter++;
  return `${prefix}-v6${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function isValidNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  if (typeof n.type !== "string" || !VALID_TYPES.has(n.type)) return false;
  if (typeof n.id !== "string" || n.id.length === 0) return false;
  if (typeof n.name !== "string") return false;
  return true;
}

function sanitizeEffects(rawEffects: unknown): unknown[] | undefined {
  if (!Array.isArray(rawEffects)) return undefined;
  const sanitized = rawEffects.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const effect = entry as Record<string, unknown>;
    const type = effect.type;
    const id = typeof effect.id === "string" && effect.id.length > 0 ? effect.id : ensureUniqueId("fx");
    const enabled = typeof effect.enabled === "boolean" ? effect.enabled : true;

    if (type === "dropShadow" || type === "innerShadow") {
      return [{
        id,
        type,
        enabled,
        x: Number(effect.x ?? 0),
        y: Number(effect.y ?? 0),
        blur: Math.max(0, Number(effect.blur ?? 0)),
        spread: Number(effect.spread ?? 0),
        color: typeof effect.color === "string" ? effect.color : "rgba(0,0,0,0.15)",
      }];
    }

    if (type === "layerBlur" || type === "backgroundBlur") {
      return [{
        id,
        type,
        enabled,
        radius: Math.max(0, Number(effect.radius ?? 0)),
      }];
    }

    return [];
  });

  return sanitized.length > 0 ? sanitized : undefined;
}

export function validateAndNormalizeDesignTree(
  raw: unknown
): { ok: true; tree: DesignNode } | { ok: false; reason: string } {
  idCounter = 0;

  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "root is not an object" };
  }

  const root = raw as Record<string, unknown>;

  // DesignNode root must be type "frame"
  if (root.type !== "frame") {
    return { ok: false, reason: `root type is "${root.type}", expected "frame"` };
  }

  if (!Array.isArray(root.children) || root.children.length === 0) {
    return { ok: false, reason: "root has no children" };
  }

  // At least one child should be a frame (section-level)
  const frameChildren = root.children.filter(
    (c: unknown) =>
      c && typeof c === "object" && (c as Record<string, unknown>).type === "frame"
  );
  if (frameChildren.length === 0) {
    return { ok: false, reason: "no frame children found in root (expected section-level frames)" };
  }

  const seenIds = new Set<string>();

  function normalizeNode(node: unknown): unknown {
    if (!isValidNode(node)) return null;
    const n = { ...(node as Record<string, unknown>) };

    // Ensure unique ID
    let id = n.id as string;
    if (seenIds.has(id)) {
      id = ensureUniqueId(n.type as string);
    }
    seenIds.add(id);
    n.id = id;

    // Normalize style
    if (n.style && typeof n.style === "object") {
      const style = { ...(n.style as Record<string, unknown>) };

      // Validate and normalize grid template
      if (typeof style.gridTemplate === "string") {
        const normalized = normalizeGrid(style.gridTemplate as string);
        if (isValidGrid(normalized)) {
          style.gridTemplate = normalized;
        } else {
          // Invalid grid → fall back to flex column
          console.warn(
            `[V6-VALIDATE] Invalid gridTemplate "${style.gridTemplate}" on node "${n.name}" — falling back to flex`
          );
          delete style.gridTemplate;
          delete style.display; // let it default to flex
        }
      }

      // Ensure position is valid
      if (style.position && style.position !== "relative" && style.position !== "absolute") {
        delete style.position;
      }

      // Ensure display is valid
      if (style.display && style.display !== "flex" && style.display !== "grid") {
        delete style.display;
      }

      const effects = sanitizeEffects(style.effects);
      if (effects) style.effects = effects;
      else delete style.effects;

      n.style = style;
    }

    // Ensure style exists (DesignNode requires it)
    if (!n.style || typeof n.style !== "object") {
      n.style = {};
    }

    // Recursively normalize children
    if (Array.isArray(n.children)) {
      n.children = n.children
        .map((child: unknown) => normalizeNode(child))
        .filter(Boolean);
    }

    return n;
  }

  const normalized = normalizeNode(root);
  if (!normalized) {
    return { ok: false, reason: "root node failed validation" };
  }

  return { ok: true, tree: normalized as DesignNode };
}
