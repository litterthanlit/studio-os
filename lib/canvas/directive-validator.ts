import type { PageNode, PageNodeStyle } from "./compose";
import type { CompiledDirectives, Directive } from "./directive-compiler";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-1, percentage of hard constraints satisfied
  violations: Violation[];
  repairable: boolean; // true if all violations can be auto-fixed
}

export interface Violation {
  directive: Directive;
  found: string | number;
  expected: string | number;
  nodeId?: string;
  severity: "hard" | "soft";
}

// ─── Tree Helpers ───────────────────────────────────────────────────────────

function walkPageTree(
  node: PageNode,
  callback: (node: PageNode) => void
): void {
  callback(node);
  if (node.children) {
    for (const child of node.children) {
      walkPageTree(child, callback);
    }
  }
}

function collectColors(node: PageNode): Map<string, string[]> {
  // Map: normalized hex color -> array of nodeIds where it appears
  const colors = new Map<string, string[]>();
  walkPageTree(node, (n) => {
    const colorProps: (keyof PageNodeStyle)[] = [
      "background",
      "foreground",
      "accent",
      "muted",
      "borderColor",
    ];
    for (const prop of colorProps) {
      const val = n.style?.[prop];
      if (typeof val === "string" && val.startsWith("#")) {
        const normalized = normalizeHex(val);
        const existing = colors.get(normalized) || [];
        existing.push(n.id);
        colors.set(normalized, existing);
      }
    }
  });
  return colors;
}

function normalizeHex(hex: string): string {
  const h = hex.trim().toUpperCase();
  // Expand 3-char hex to 6-char
  if (/^#[0-9A-F]{3}$/i.test(h)) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h;
}

function countNodes(node: PageNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// Universal colors that are always valid regardless of palette
const UNIVERSAL_COLORS = new Set([
  "#FFFFFF",
  "#000000",
  "#FFF",
  "#000",
  "transparent",
]);

// ─── Hex Distance ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function findNearestPaletteColor(
  color: string,
  palette: string[]
): string {
  let nearest = palette[0];
  let minDist = Infinity;
  for (const p of palette) {
    const dist = colorDistance(color, p);
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  return nearest;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function validateDirectiveCompliance(
  pageTree: PageNode,
  directives: CompiledDirectives
): ValidationResult {
  const violations: Violation[] = [];

  // Merge hard + soft directives for checking — severity differs
  const allDirectives = [
    ...directives.hard.map((d) => ({ ...d, _severity: "hard" as const })),
    ...directives.soft.map((d) => ({ ...d, _severity: "soft" as const })),
    ...directives.avoid.map((d) => ({ ...d, _severity: "hard" as const })),
  ];

  // ── 1. PALETTE CHECK ──────────────────────────────────────────────
  const paletteDirective = allDirectives.find(
    (d) => d.dimension === "palette"
  );
  if (paletteDirective && Array.isArray(paletteDirective.value)) {
    const allowedColors = new Set(
      (paletteDirective.value as string[]).map((c) => normalizeHex(c))
    );
    // Add universals
    for (const u of UNIVERSAL_COLORS) {
      allowedColors.add(normalizeHex(u));
    }

    const usedColors = collectColors(pageTree);
    for (const [color, nodeIds] of usedColors) {
      if (!allowedColors.has(color)) {
        violations.push({
          directive: paletteDirective,
          found: color,
          expected: Array.from(allowedColors).join(", "),
          nodeId: nodeIds[0],
          severity: paletteDirective._severity,
        });
      }
    }
  }

  // ── 2. HEADING FONT CHECK ─────────────────────────────────────────
  const headingFontDirective = allDirectives.find(
    (d) => d.dimension === "headingFont"
  );
  if (headingFontDirective && typeof headingFontDirective.value === "string") {
    const expectedFont = headingFontDirective.value.toLowerCase();
    walkPageTree(pageTree, (n) => {
      if (n.type === "heading" && n.style?.fontFamily) {
        const actualFont = n.style.fontFamily.toLowerCase();
        if (
          !actualFont.includes(expectedFont) &&
          !expectedFont.includes(actualFont)
        ) {
          violations.push({
            directive: headingFontDirective,
            found: n.style.fontFamily,
            expected: headingFontDirective.value as string,
            nodeId: n.id,
            severity: headingFontDirective._severity,
          });
        }
      }
    });
  }

  // ── 3. BODY FONT CHECK ────────────────────────────────────────────
  const bodyFontDirective = allDirectives.find(
    (d) => d.dimension === "bodyFont"
  );
  if (bodyFontDirective && typeof bodyFontDirective.value === "string") {
    const expectedFont = bodyFontDirective.value.toLowerCase();
    const bodyTypes = new Set(["paragraph", "button"]);
    walkPageTree(pageTree, (n) => {
      if (bodyTypes.has(n.type) && n.style?.fontFamily) {
        const actualFont = n.style.fontFamily.toLowerCase();
        if (
          !actualFont.includes(expectedFont) &&
          !expectedFont.includes(actualFont)
        ) {
          violations.push({
            directive: bodyFontDirective,
            found: n.style.fontFamily,
            expected: bodyFontDirective.value as string,
            nodeId: n.id,
            severity: bodyFontDirective._severity,
          });
        }
      }
    });
  }

  // ── 4. DENSITY CHECK ──────────────────────────────────────────────
  const densityDirective = allDirectives.find(
    (d) => d.dimension === "density"
  );
  if (densityDirective && typeof densityDirective.value === "number") {
    const minPadding = densityDirective.value;
    walkPageTree(pageTree, (n) => {
      if (n.type === "section" && n.style?.paddingY !== undefined) {
        if (n.style.paddingY < minPadding) {
          violations.push({
            directive: densityDirective,
            found: n.style.paddingY,
            expected: minPadding,
            nodeId: n.id,
            severity: densityDirective._severity,
          });
        }
      }
    });
  }

  // ── 5. CORNER RADIUS CHECK ────────────────────────────────────────
  const cornerDirective = allDirectives.find(
    (d) => d.dimension === "cornerRadius"
  );
  if (cornerDirective && typeof cornerDirective.value === "string") {
    const rangeStr = cornerDirective.value; // e.g. "4-8", "0", "12-20", "999"
    let minR = 0;
    let maxR = Infinity;
    if (rangeStr.includes("-")) {
      const [lo, hi] = rangeStr.split("-").map(Number);
      minR = lo;
      maxR = hi;
    } else {
      const val = Number(rangeStr);
      // For "0" allow 0-2, for "999" allow 40+
      if (val === 0) {
        minR = 0;
        maxR = 2;
      } else if (val === 999) {
        minR = 40;
        maxR = 999;
      } else {
        minR = val;
        maxR = val;
      }
    }

    walkPageTree(pageTree, (n) => {
      if (n.style?.borderRadius !== undefined && n.type !== "page") {
        const r = n.style.borderRadius;
        if (r < minR || r > maxR) {
          violations.push({
            directive: cornerDirective,
            found: r,
            expected: rangeStr,
            nodeId: n.id,
            severity: cornerDirective._severity,
          });
        }
      }
    });
  }

  // ── 6. AVOID LIST CHECK ───────────────────────────────────────────
  for (const avoidDirective of directives.avoid) {
    const avoidValue =
      typeof avoidDirective.value === "string"
        ? avoidDirective.value.toLowerCase()
        : "";

    if (avoidValue.includes("gradient")) {
      // Check for gradient values in background
      walkPageTree(pageTree, (n) => {
        if (
          n.style?.background &&
          /gradient/i.test(n.style.background)
        ) {
          violations.push({
            directive: avoidDirective,
            found: n.style.background,
            expected: "no gradients",
            nodeId: n.id,
            severity: "hard",
          });
        }
      });
    }

    if (avoidValue.includes("pill button")) {
      walkPageTree(pageTree, (n) => {
        if (
          n.type === "button" &&
          n.style?.borderRadius !== undefined &&
          n.style.borderRadius > 20
        ) {
          violations.push({
            directive: avoidDirective,
            found: n.style.borderRadius,
            expected: "borderRadius <= 20",
            nodeId: n.id,
            severity: "hard",
          });
        }
      });
    }

    if (avoidValue.includes("centered body text")) {
      walkPageTree(pageTree, (n) => {
        if (n.type === "paragraph" && n.style?.align === "center") {
          violations.push({
            directive: avoidDirective,
            found: "center",
            expected: "left or right",
            nodeId: n.id,
            severity: "hard",
          });
        }
      });
    }

    if (avoidValue.includes("font weight")) {
      // "max 2 font weights" — count unique fontWeight values
      const weights = new Set<number>();
      walkPageTree(pageTree, (n) => {
        if (n.style?.fontWeight !== undefined) {
          weights.add(n.style.fontWeight);
        }
      });
      if (weights.size > 2) {
        violations.push({
          directive: avoidDirective,
          found: `${weights.size} weights: ${Array.from(weights).join(", ")}`,
          expected: "max 2 font weights",
          severity: "hard",
        });
      }
    }

    // ── Structural pattern detection ──────────────────────────────
    if (avoidValue.includes("card grid") || avoidValue.includes("feature grid")) {
      // Detect 3+ sibling containers at the same level (card grid pattern)
      walkPageTree(pageTree, (n) => {
        if (n.type === "section" && n.children) {
          for (const child of n.children) {
            if (child.type === "container" && child.children) {
              const containerChildren = child.children.filter(
                (c) => c.type === "container"
              );
              if (containerChildren.length >= 3) {
                // Check if they look uniform (same structure = card grid)
                const childTypes = containerChildren.map(
                  (c) => c.children?.map((gc) => gc.type).join(",") ?? ""
                );
                const uniquePatterns = new Set(childTypes);
                if (uniquePatterns.size <= 2) {
                  violations.push({
                    directive: avoidDirective,
                    found: `${containerChildren.length}-card grid in section`,
                    expected: "editorial layout, not card grid",
                    nodeId: child.id,
                    severity: "hard",
                  });
                }
              }
            }
          }
        }
      });
    }

    if (avoidValue.includes("stats") || avoidValue.includes("numbers")) {
      // Detect stats/numbers sections — sections with 3+ headings that are just numbers
      walkPageTree(pageTree, (n) => {
        if (n.type === "section" && n.children) {
          const numberHeadings: string[] = [];
          walkPageTree(n, (child) => {
            if (child.type === "heading" && child.text) {
              // Check if text is primarily a number (e.g., "48,000+", "200+", "12")
              const cleaned = child.text.replace(/[,+%$]/g, "").trim();
              if (/^\d+$/.test(cleaned)) {
                numberHeadings.push(child.text);
              }
            }
          });
          if (numberHeadings.length >= 3) {
            violations.push({
              directive: avoidDirective,
              found: `stats section with ${numberHeadings.length} number headings: ${numberHeadings.join(", ")}`,
              expected: "no stats/numbers sections",
              nodeId: n.id,
              severity: "hard",
            });
          }
        }
      });
    }

    if (avoidValue.includes("icon row") || avoidValue.includes("icon-feature")) {
      // Detect icon rows — sections where multiple containers start with an icon node
      walkPageTree(pageTree, (n) => {
        if (n.type === "section" && n.children) {
          let iconContainers = 0;
          walkPageTree(n, (child) => {
            if (child.type === "container" && child.children?.[0]?.type === "icon") {
              iconContainers++;
            }
          });
          if (iconContainers >= 3) {
            violations.push({
              directive: avoidDirective,
              found: `${iconContainers} icon-led containers`,
              expected: "no icon rows or icon-feature lists",
              nodeId: n.id,
              severity: "hard",
            });
          }
        }
      });
    }
  }

  // ── 7. BANNED NODE TYPES CHECK ──────────────────────────────────
  const bannedTypesDirective = directives.hard.find(
    (d) => d.dimension === "bannedNodeTypes"
  );
  if (bannedTypesDirective && Array.isArray(bannedTypesDirective.value)) {
    const bannedTypes = bannedTypesDirective.value as string[];
    walkPageTree(pageTree, (node) => {
      if (bannedTypes.includes(node.type)) {
        violations.push({
          directive: bannedTypesDirective,
          found: node.type,
          expected: "not " + node.type,
          nodeId: node.id,
          severity: "hard",
        });
      }
    });
  }

  // ── Calculate score ───────────────────────────────────────────────
  const hardViolations = violations.filter((v) => v.severity === "hard");
  const totalHardChecks = directives.hard.length + directives.avoid.length;
  const score =
    totalHardChecks > 0
      ? Math.max(
          0,
          1 - hardViolations.length / Math.max(totalHardChecks, hardViolations.length)
        )
      : 1;

  return {
    passed: hardViolations.length === 0,
    score: Math.round(score * 100) / 100,
    violations,
    repairable: violations.every((v) => isRepairable(v)),
  };
}

// ─── Repairability ──────────────────────────────────────────────────────────

function isRepairable(v: Violation): boolean {
  const dim = v.directive.dimension;
  // These dimensions have straightforward fixes
  return [
    "palette",
    "headingFont",
    "bodyFont",
    "density",
    "cornerRadius",
  ].includes(dim);
}

// ─── Repair ─────────────────────────────────────────────────────────────────

export function repairViolations(
  pageTree: PageNode,
  violations: Violation[],
  directives: CompiledDirectives
): { repairedTree: PageNode; repairCount: number } {
  // Deep clone
  const tree = JSON.parse(JSON.stringify(pageTree)) as PageNode;
  let repairCount = 0;

  // Build lookup maps from directives
  const paletteDirective = [
    ...directives.hard,
    ...directives.soft,
  ].find((d) => d.dimension === "palette");
  const paletteColors: string[] = Array.isArray(paletteDirective?.value)
    ? (paletteDirective.value as string[])
    : [];

  const headingFont = [
    ...directives.hard,
    ...directives.soft,
  ].find((d) => d.dimension === "headingFont");
  const bodyFont = [...directives.hard, ...directives.soft].find(
    (d) => d.dimension === "bodyFont"
  );
  const densityDirective = [
    ...directives.hard,
    ...directives.soft,
  ].find((d) => d.dimension === "density");
  const cornerDirective = [
    ...directives.hard,
    ...directives.soft,
  ].find((d) => d.dimension === "cornerRadius");

  // Group violations by nodeId for efficient repair
  const violationsByNode = new Map<string, Violation[]>();
  const globalViolations: Violation[] = [];

  for (const v of violations) {
    if (v.nodeId) {
      const existing = violationsByNode.get(v.nodeId) || [];
      existing.push(v);
      violationsByNode.set(v.nodeId, existing);
    } else {
      globalViolations.push(v);
    }
  }

  // Walk tree and apply repairs
  walkPageTree(tree, (n) => {
    const nodeViolations = violationsByNode.get(n.id);
    if (!nodeViolations) return;

    for (const v of nodeViolations) {
      if (!n.style) continue;

      switch (v.directive.dimension) {
        case "palette": {
          // Replace off-palette color with nearest palette color
          if (paletteColors.length === 0) break;
          const offColor =
            typeof v.found === "string" ? v.found : "";
          const nearest = findNearestPaletteColor(
            offColor,
            paletteColors
          );
          const colorProps: (keyof PageNodeStyle)[] = [
            "background",
            "foreground",
            "accent",
            "muted",
            "borderColor",
          ];
          for (const prop of colorProps) {
            const val = n.style[prop];
            if (
              typeof val === "string" &&
              normalizeHex(val) === normalizeHex(offColor)
            ) {
              (n.style as Record<string, unknown>)[prop] = nearest;
              repairCount++;
            }
          }
          break;
        }

        case "headingFont": {
          if (
            n.type === "heading" &&
            headingFont &&
            typeof headingFont.value === "string"
          ) {
            n.style.fontFamily = headingFont.value;
            repairCount++;
          }
          break;
        }

        case "bodyFont": {
          if (
            (n.type === "paragraph" || n.type === "button") &&
            bodyFont &&
            typeof bodyFont.value === "string"
          ) {
            n.style.fontFamily = bodyFont.value;
            repairCount++;
          }
          break;
        }

        case "density": {
          if (
            n.type === "section" &&
            densityDirective &&
            typeof densityDirective.value === "number"
          ) {
            n.style.paddingY = densityDirective.value;
            repairCount++;
          }
          break;
        }

        case "cornerRadius": {
          if (
            cornerDirective &&
            typeof cornerDirective.value === "string"
          ) {
            const rangeStr = cornerDirective.value;
            let target: number;
            if (rangeStr.includes("-")) {
              const [lo, hi] = rangeStr.split("-").map(Number);
              // Set to midpoint of range
              target = Math.round((lo + hi) / 2);
            } else {
              target = Number(rangeStr);
            }
            n.style.borderRadius = target;
            repairCount++;
          }
          break;
        }
      }
    }
  });

  return { repairedTree: tree, repairCount };
}

// ─── Exports for wiring ─────────────────────────────────────────────────────

export { countNodes };
