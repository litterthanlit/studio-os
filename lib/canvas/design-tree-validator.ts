// lib/canvas/design-tree-validator.ts
// Validates and normalizes AI-generated DesignNode JSON.
// Structural validation, ID deduplication, grid constraint enforcement.

import type { DesignNode, DesignNodeStyle, EffectEntry } from "./design-node";

const VALID_TYPES: Set<string> = new Set([
  "frame",
  "text",
  "image",
  "button",
  "divider",
]);

const VALID_BREAKPOINTS = new Set<string>(["desktop", "mobile"]);

/**
 * Expanded grid validation — accepts valid CSS grid notation.
 * Allows: fr, px, %, auto, repeat(), minmax(), auto-fit, auto-fill.
 * Rejects: nonsense strings, script injection, > 12 columns.
 */
function isValidGrid(template: string): boolean {
  const t = template.trim();
  if (t.length === 0 || t.length > 200) return false;

  // Accept repeat() patterns (including auto-fill/auto-fit with minmax)
  const repeatPattern = /^repeat\(\s*(?:auto-fill|auto-fit|\d+)\s*,\s*.+\)$/;
  if (repeatPattern.test(t)) {
    const countMatch = t.match(/^repeat\(\s*(\d+)/);
    if (countMatch && parseInt(countMatch[1], 10) > 12) return false;
    return true;
  }

  // Accept space-separated track values
  const parts = t.split(/\s+/);
  if (parts.length > 12) return false;

  const validTrack = /^(?:\d+(?:\.\d+)?(?:fr|px|%|rem|em|vw|vh)|auto|min-content|max-content|minmax\([^)]+\))$/;
  return parts.every((p) => validTrack.test(p));
}

/** Normalize shorthand grids: "1fr 1fr" → "repeat(2, 1fr)" */
function normalizeGrid(template: string): string {
  const t = template.trim();
  const parts = t.split(/\s+/);
  if (parts.every((p) => p === "1fr") && parts.length >= 2 && parts.length <= 12) {
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

function sanitizeEffects(rawEffects: unknown): EffectEntry[] | undefined {
  if (!Array.isArray(rawEffects)) return undefined;
  const sanitized: EffectEntry[] = rawEffects.flatMap((entry): EffectEntry[] => {
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

/**
 * Validates and normalizes a single style object in-place (mutates the copy).
 * Used for both base styles and responsive override styles.
 */
function normalizeStyle(
  rawStyle: Record<string, unknown>,
  nodeName: string
): Record<string, unknown> {
  const style = { ...rawStyle };

  // Validate and normalize grid template
  if (typeof style.gridTemplate === "string") {
    const normalized = normalizeGrid(style.gridTemplate as string);
    if (isValidGrid(normalized)) {
      style.gridTemplate = normalized;
    } else {
      console.warn(`[VALIDATOR] Stripped gridTemplate: "${style.gridTemplate}" from node ${nodeName}`);
      delete style.gridTemplate;
      delete style.display;
    }
  }

  if (style.gridTemplateRows) {
    const normalized = normalizeGrid(String(style.gridTemplateRows));
    if (isValidGrid(normalized)) {
      style.gridTemplateRows = normalized;
    } else {
      console.warn(`[VALIDATOR] Stripped gridTemplateRows: "${style.gridTemplateRows}" from node ${nodeName}`);
      delete style.gridTemplateRows;
    }
  }

  // Validate borderRadius — accept number or 4-value string
  const s = style;
  const n = { name: nodeName, id: nodeName };
  if (s.borderRadius != null) {
    if (typeof s.borderRadius === "string") {
      const str = s.borderRadius.trim();
      const fourValues = str.split(/\s+/);
      if (fourValues.length === 4) {
        const validValue = /^\d+(?:\.\d+)?(%|px)?$/;
        if (!fourValues.every((v) => validValue.test(v))) {
          console.warn(`[VALIDATOR] Stripped borderRadius: "${s.borderRadius}" from node ${n.name || n.id}`);
          delete s.borderRadius;
        }
      } else if (/^\d+(?:\.\d+)?(%|px)?$/.test(str)) {
        if (!str.endsWith("%")) {
          s.borderRadius = parseFloat(str);
        }
      } else {
        console.warn(`[VALIDATOR] Stripped borderRadius: "${s.borderRadius}" from node ${n.name || n.id}`);
        delete s.borderRadius;
      }
    }
  }

  // Validate gap — accept number or "rowGap colGap" string
  if (s.gap != null) {
    if (typeof s.gap === "string") {
      const parts = s.gap.trim().split(/\s+/);
      if (parts.length === 2) {
        if (isNaN(Number(parts[0])) || isNaN(Number(parts[1]))) {
          console.warn(`[VALIDATOR] Stripped gap: "${s.gap}" from node ${n.name || n.id}`);
          delete s.gap;
        }
      } else {
        const num = Number(s.gap);
        if (!isNaN(num)) {
          s.gap = num;
        } else {
          console.warn(`[VALIDATOR] Stripped gap: "${s.gap}" from node ${n.name || n.id}`);
          delete s.gap;
        }
      }
    }
  }

  // Validate overflow — enum validation
  if (s.overflow) {
    const validOverflow = new Set(["visible", "hidden", "auto", "scroll"]);
    if (!validOverflow.has(s.overflow as string)) {
      console.warn(`[VALIDATOR] Stripped overflow: "${s.overflow}" from node ${n.name || n.id}`);
      delete s.overflow;
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

  if (style.gradient) {
    const g = style.gradient as Record<string, unknown>;
    if (g.type !== "linear" && g.type !== "radial") {
      delete style.gradient;
    } else if (!Array.isArray(g.stops) || (g.stops as unknown[]).length < 2) {
      delete style.gradient;
    } else {
      g.stops = (g.stops as Array<Record<string, unknown>>).map((stop) => ({
        color: typeof stop.color === "string" ? stop.color : "#000000",
        position: Math.max(0, Math.min(100, typeof stop.position === "number" ? stop.position : 0)),
      }));
      if (g.interpolation && g.interpolation !== "srgb" && g.interpolation !== "oklch") {
        g.interpolation = "srgb";
      }
      if (g.type === "linear" && typeof g.angle === "number") {
        g.angle = ((g.angle % 360) + 360) % 360;
      }
      if (g.type === "radial" && g.position && typeof g.position === "object") {
        const pos = g.position as Record<string, unknown>;
        pos.x = Math.max(0, Math.min(100, typeof pos.x === "number" ? pos.x : 50));
        pos.y = Math.max(0, Math.min(100, typeof pos.y === "number" ? pos.y : 50));
      }
    }
  }

  if (style.transform) {
    const t = style.transform as Record<string, unknown>;
    if (t.rotate !== undefined && typeof t.rotate !== "number") {
      delete t.rotate;
    }
    if (typeof t.rotate === "number") {
      t.rotate = ((t.rotate % 360) + 360) % 360;
      if (t.rotate === 0) delete t.rotate;
    }
    if (t.scale) {
      const sc = t.scale as Record<string, unknown>;
      if (typeof sc.x !== "number" || typeof sc.y !== "number") {
        delete t.scale;
      } else {
        sc.x = Math.max(0.01, Math.min(10, sc.x as number));
        sc.y = Math.max(0.01, Math.min(10, sc.y as number));
      }
    }
    if (!t.rotate && !t.scale) {
      delete style.transform;
    }
  }

  if (style.transformOrigin) {
    const o = style.transformOrigin as Record<string, unknown>;
    if (typeof o.x !== "number" || typeof o.y !== "number") {
      delete style.transformOrigin;
    } else {
      o.x = Math.max(0, Math.min(100, o.x as number));
      o.y = Math.max(0, Math.min(100, o.y as number));
    }
  }

  if (style.blendMode) {
    const validModes = new Set([
      "normal", "multiply", "screen", "overlay", "darken", "lighten",
      "color-dodge", "color-burn", "hard-light", "soft-light",
      "difference", "exclusion", "hue", "saturation", "color", "luminosity",
    ]);
    if (!validModes.has(style.blendMode as string)) {
      delete style.blendMode;
    }
  }

  if (style.clipPath) {
    const cp = style.clipPath as Record<string, unknown>;
    const validTypes = new Set(["circle", "ellipse", "inset", "polygon"]);
    if (!validTypes.has(cp.type as string)) {
      delete style.clipPath;
    } else {
      const clamp = (v: unknown, min: number, max: number, def: number) =>
        typeof v === "number" ? Math.max(min, Math.min(max, v)) : def;

      if (cp.type === "circle" && cp.circle) {
        const c = cp.circle as Record<string, unknown>;
        c.radius = clamp(c.radius, 0, 100, 50);
        c.cx = clamp(c.cx, 0, 100, 50);
        c.cy = clamp(c.cy, 0, 100, 50);
      }
      if (cp.type === "ellipse" && cp.ellipse) {
        const e = cp.ellipse as Record<string, unknown>;
        e.rx = clamp(e.rx, 0, 100, 50);
        e.ry = clamp(e.ry, 0, 100, 50);
        e.cx = clamp(e.cx, 0, 100, 50);
        e.cy = clamp(e.cy, 0, 100, 50);
      }
      if (cp.type === "inset" && cp.inset) {
        const i = cp.inset as Record<string, unknown>;
        i.top = clamp(i.top, 0, 100, 0);
        i.right = clamp(i.right, 0, 100, 0);
        i.bottom = clamp(i.bottom, 0, 100, 0);
        i.left = clamp(i.left, 0, 100, 0);
        if (i.borderRadius !== undefined) {
          i.borderRadius = clamp(i.borderRadius, 0, 999, 0);
        }
      }
      if (cp.type === "polygon") {
        const pts = cp.polygon;
        if (!Array.isArray(pts) || pts.length < 3) {
          delete style.clipPath;
        } else {
          cp.polygon = pts.map((p: Record<string, unknown>) => ({
            x: clamp(p.x, 0, 100, 50),
            y: clamp(p.y, 0, 100, 50),
          }));
        }
      }
    }
  }

  return style;
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

    // Normalize base style
    if (n.style && typeof n.style === "object") {
      n.style = normalizeStyle(n.style as Record<string, unknown>, n.name as string);
    }

    // Ensure style exists (DesignNode requires it)
    if (!n.style || typeof n.style !== "object") {
      n.style = {};
    }

    // Validate and normalize responsiveOverrides
    if (n.responsiveOverrides !== undefined) {
      if (!n.responsiveOverrides || typeof n.responsiveOverrides !== "object" || Array.isArray(n.responsiveOverrides)) {
        // Not a valid object — drop entirely
        delete n.responsiveOverrides;
      } else {
        const overrides = n.responsiveOverrides as Record<string, unknown>;
        for (const bp of Object.keys(overrides)) {
          if (!VALID_BREAKPOINTS.has(bp)) {
            // Unknown breakpoint — drop it
            delete overrides[bp];
            continue;
          }
          const overrideVal = overrides[bp];
          if (!overrideVal || typeof overrideVal !== "object" || Array.isArray(overrideVal)) {
            // Not a valid style object — drop
            delete overrides[bp];
            continue;
          }
          // Normalize the override style with the same rules as the base
          let normalized = normalizeStyle(overrideVal as Record<string, unknown>, n.name as string);
          // Remove properties whose value is identical to the base style (keep overrides sparse)
          const baseStyle = n.style as Record<string, unknown>;
          for (const prop of Object.keys(normalized)) {
            if (JSON.stringify(normalized[prop]) === JSON.stringify(baseStyle[prop])) {
              const { [prop]: _removed, ...rest } = normalized;
              normalized = rest;
            }
          }
          if (Object.keys(normalized).length === 0) {
            // Override has nothing meaningful left — drop it
            delete overrides[bp];
          } else {
            overrides[bp] = normalized;
          }
        }
        // If no breakpoints remain, remove the field entirely
        if (Object.keys(overrides).length === 0) {
          delete n.responsiveOverrides;
        } else {
          n.responsiveOverrides = overrides;
        }
      }
    }

    // Validate hidden breakpoint keys
    if (n.hidden !== undefined) {
      if (!n.hidden || typeof n.hidden !== "object" || Array.isArray(n.hidden)) {
        delete n.hidden;
      } else {
        const hidden = n.hidden as Record<string, unknown>;
        for (const bp of Object.keys(hidden)) {
          if (!VALID_BREAKPOINTS.has(bp)) {
            delete hidden[bp];
          }
        }
        if (Object.keys(hidden).length === 0) {
          delete n.hidden;
        } else {
          n.hidden = hidden;
        }
      }
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

export function sanitizeUserStyle(style: Partial<DesignNodeStyle>): Partial<DesignNodeStyle> {
  const sanitized = { ...style };
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === "string" && /(?:url\(|expression\(|javascript:)/i.test(value)) {
      console.warn(`[VALIDATOR] Sanitized XSS attempt in ${key}`);
      delete (sanitized as Record<string, unknown>)[key];
    }
  }
  return sanitized;
}
