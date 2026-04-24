import type { DesignNode } from "./design-node";
import { countExternalImageReferences } from "./export-options";

export type ExportPreflightIssue = {
  id: string;
  severity: "error" | "warning" | "info";
  label: string;
  detail: string;
};

export type ExportPreflightResult = {
  ready: boolean;
  issues: ExportPreflightIssue[];
};

const SUPPORTED_EFFECT_TYPES = new Set([
  "dropShadow",
  "innerShadow",
  "layerBlur",
  "backgroundBlur",
]);

export function runExportPreflight(root: DesignNode | null): ExportPreflightResult {
  if (!root) {
    return {
      ready: false,
      issues: [
        {
          id: "no-export-root",
          severity: "error",
          label: "Nothing to export",
          detail: "Select a valid artboard or switch export scope to Full page.",
        },
      ],
    };
  }

  const issues: ExportPreflightIssue[] = [];
  const stats = collectExportStats(root);
  const externalImageCount = countExternalImageReferences(root);

  if (stats.missingImages > 0) {
    issues.push({
      id: "missing-images",
      severity: "error",
      label: `${stats.missingImages} missing image ${stats.missingImages === 1 ? "source" : "sources"}`,
      detail: "Add image sources before publishing so the page does not ship with empty media blocks.",
    });
  }

  if (externalImageCount > 0) {
    issues.push({
      id: "external-images",
      severity: "warning",
      label: `${externalImageCount} external ${externalImageCount === 1 ? "image" : "images"}`,
      detail: "Published pages need internet access to display external images. Use embedded assets for client-safe handoff.",
    });
  }

  if (stats.absoluteNodes > 0) {
    issues.push({
      id: "breakout-layers",
      severity: "warning",
      label: `${stats.absoluteNodes} breakout ${stats.absoluteNodes === 1 ? "layer" : "layers"}`,
      detail: "Breakout layers can be correct, but inspect mobile before publishing.",
    });
  }

  if (stats.unsupportedEffects > 0) {
    issues.push({
      id: "unsupported-effects",
      severity: "warning",
      label: `${stats.unsupportedEffects} unsupported ${stats.unsupportedEffects === 1 ? "effect" : "effects"}`,
      detail: "Some visual effects may not match the editor exactly in exported HTML.",
    });
  }

  if (stats.responsiveOverrides === 0) {
    issues.push({
      id: "no-responsive-overrides",
      severity: "info",
      label: "No mobile overrides detected",
      detail: "Preview mobile before sharing; this page may rely entirely on desktop flow behavior.",
    });
  }

  return {
    ready: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

function collectExportStats(root: DesignNode) {
  const stats = {
    missingImages: 0,
    absoluteNodes: 0,
    unsupportedEffects: 0,
    responsiveOverrides: 0,
  };

  function visit(node: DesignNode): void {
    if (node.type === "image" && !node.content?.src?.trim()) {
      stats.missingImages += 1;
    }

    if (node.style.position === "absolute") {
      stats.absoluteNodes += 1;
    }

    if (node.responsiveOverrides && Object.keys(node.responsiveOverrides).length > 0) {
      stats.responsiveOverrides += 1;
    }

    for (const effect of node.style.effects ?? []) {
      if (!SUPPORTED_EFFECT_TYPES.has(effect.type)) {
        stats.unsupportedEffects += 1;
      }
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  }

  visit(root);
  return stats;
}
