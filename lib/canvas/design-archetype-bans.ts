// ─── Design Archetype Bans (Style-Pattern Based) ─────────────────────────────
// V6 replacement for archetype-bans.ts. PageNode type bans are meaningless for
// DesignNode because there are only 5 types (frame/text/image/button/divider).
// Instead, we detect structural PATTERNS from style properties at runtime.
//
// The old archetype-bans.ts remains for backward compatibility with the V5
// PageNode pipeline. This file is for V6 DesignNode trees only.

import { DesignNode, walkDesignTree } from "./design-node";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StylePatternBan = {
  id: string;
  description: string;
  detect: (tree: DesignNode) => { nodeId: string; detail: string }[];
};

// ─── Ban Detectors ────────────────────────────────────────────────────────────

/**
 * Detects display:grid frames with 3+ children that share a uniform child type
 * pattern — the classic "feature grid" structure.
 */
const uniformCardGrid: StylePatternBan = {
  id: "uniform-card-grid",
  description: "3+ uniform children in a grid (feature-grid pattern)",
  detect(tree) {
    const hits: { nodeId: string; detail: string }[] = [];

    walkDesignTree(tree, (node) => {
      if (node.style.display !== "grid") return;
      const children = node.children ?? [];
      if (children.length < 3) return;

      // Build the type sequence for each child (its own children's types joined)
      const childSignatures = children.map((child) => {
        const subTypes = (child.children ?? []).map((c) => c.type).join(",");
        return subTypes || child.type;
      });

      // Uniform = all signatures identical
      const allSame = childSignatures.every((sig) => sig === childSignatures[0]);
      if (allSame) {
        hits.push({
          nodeId: node.id,
          detail: `Grid node "${node.name}" has ${children.length} structurally uniform children (signature: "${childSignatures[0]}")`,
        });
      }
    });

    return hits;
  },
};

/**
 * Detects flex-row frames with 3+ text children whose text content is primarily
 * numeric — the classic "stats / metrics" strip.
 */
const statsMetricsRow: StylePatternBan = {
  id: "stats-metrics-row",
  description: "3+ short numeric text nodes in a row (stats/metrics pattern)",
  detect(tree) {
    const hits: { nodeId: string; detail: string }[] = [];
    const numericRe = /^\d[\d,+%$]*$/;

    walkDesignTree(tree, (node) => {
      if (node.style.display !== "flex") return;
      if (node.style.flexDirection !== "row") return;

      const children = node.children ?? [];
      const numericTextChildren = children.filter(
        (child) =>
          child.type === "text" &&
          child.content?.text != null &&
          numericRe.test(child.content.text.trim())
      );

      if (numericTextChildren.length >= 3) {
        hits.push({
          nodeId: node.id,
          detail: `Flex-row node "${node.name}" has ${numericTextChildren.length} numeric text children`,
        });
      }
    });

    return hits;
  },
};

/**
 * Detects flex-row frames with 4+ image children — the classic "logo bar".
 */
const logoBar: StylePatternBan = {
  id: "logo-bar",
  description: "4+ small image children in a row (logo bar pattern)",
  detect(tree) {
    const hits: { nodeId: string; detail: string }[] = [];

    walkDesignTree(tree, (node) => {
      if (node.style.display !== "flex") return;
      if (node.style.flexDirection !== "row") return;

      const children = node.children ?? [];
      const imageChildren = children.filter((child) => child.type === "image");

      if (imageChildren.length >= 4) {
        hits.push({
          nodeId: node.id,
          detail: `Flex-row node "${node.name}" has ${imageChildren.length} image children`,
        });
      }
    });

    return hits;
  },
};

/**
 * Detects grid frames with 2+ children whose subtrees contain price-like text
 * ($, /mo, /yr, /month, /year, free) — the classic "pricing table".
 */
const pricingPattern: StylePatternBan = {
  id: "pricing-pattern",
  description: "Grid with children containing price-like text (pricing table)",
  detect(tree) {
    const hits: { nodeId: string; detail: string }[] = [];
    const priceRe = /(\$|\/mo\b|\/yr\b|\/month\b|\/year\b|\bfree\b)/i;

    function subtreeHasPrice(node: DesignNode): boolean {
      let found = false;
      walkDesignTree(node, (n) => {
        if (found) return;
        const text = n.content?.text ?? "";
        if (priceRe.test(text)) found = true;
      });
      return found;
    }

    walkDesignTree(tree, (node) => {
      if (node.style.display !== "grid") return;
      const children = node.children ?? [];
      if (children.length < 2) return;

      const childrenWithPrice = children.filter(subtreeHasPrice);
      if (childrenWithPrice.length >= 2) {
        hits.push({
          nodeId: node.id,
          detail: `Grid node "${node.name}" has ${childrenWithPrice.length} children containing price-like text`,
        });
      }
    });

    return hits;
  },
};

// ─── All Bans Registry ────────────────────────────────────────────────────────

const ALL_BANS: StylePatternBan[] = [
  uniformCardGrid,
  statsMetricsRow,
  logoBar,
  pricingPattern,
];

// ─── Archetype → Ban Mapping ──────────────────────────────────────────────────

const ARCHETYPE_BAN_MAP: Record<string, StylePatternBan[]> = {
  "editorial-brand": [uniformCardGrid, statsMetricsRow, logoBar, pricingPattern],
  "creative-portfolio": [uniformCardGrid, logoBar, pricingPattern],
  "minimal-tech": [uniformCardGrid, logoBar],
  "culture-brand": [pricingPattern, statsMetricsRow],
  "experimental": [uniformCardGrid, pricingPattern, logoBar],
  "premium-saas": [],
};

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Returns the list of StylePatternBan rules active for the given archetype.
 * Defaults to premium-saas (no bans) when archetype is undefined or unrecognised.
 */
export function getArchetypeStyleBans(archetype: string | undefined): StylePatternBan[] {
  if (!archetype) return ARCHETYPE_BAN_MAP["premium-saas"];
  return ARCHETYPE_BAN_MAP[archetype] ?? ARCHETYPE_BAN_MAP["premium-saas"];
}

/**
 * Returns human-readable ban descriptions for the given archetype.
 * Suitable for direct injection into a generation prompt.
 */
export function getArchetypeBanDescriptions(archetype: string | undefined): string[] {
  return getArchetypeStyleBans(archetype).map((ban) => ban.description);
}

/**
 * Runs all active ban detectors against a DesignNode tree and returns every
 * violation found, tagged with the ban ID, offending node ID, and detail string.
 */
export function detectBannedPatterns(
  tree: DesignNode,
  archetype: string | undefined
): { banId: string; nodeId: string; detail: string }[] {
  const bans = getArchetypeStyleBans(archetype);
  const violations: { banId: string; nodeId: string; detail: string }[] = [];

  for (const ban of bans) {
    const hits = ban.detect(tree);
    for (const hit of hits) {
      violations.push({ banId: ban.id, ...hit });
    }
  }

  return violations;
}
