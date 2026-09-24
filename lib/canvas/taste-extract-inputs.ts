// lib/canvas/taste-extract-inputs.ts
// Inputs for /api/taste/extract: the reference list (identity, weight, role), the
// cache signature over everything that shapes the result, and labelled vision blocks.

import { imageLabel, labeledImageBlocks } from "@/lib/intent/labels";
import type { CompositionInput } from "@/lib/canvas/composition-blueprint";
import { inferReferenceRole, type IntentReferenceRole } from "@/types/intent-profile";

export type TasteReferenceWeight = "primary" | "default" | "muted";

export type TasteExtractReference = {
  id: string;
  url: string;
  weight: TasteReferenceWeight;
  role?: IntentReferenceRole;
};

export type TasteExtractReferenceInput = {
  id?: string;
  url?: string;
  weight?: string;
  role?: string;
  annotation?: string;
};

const ROLES: readonly IntentReferenceRole[] = [
  "layout", "palette", "typography", "mood", "imagery", "component", "interaction",
];

function toWeight(value: unknown): TasteReferenceWeight {
  return value === "primary" || value === "muted" ? value : "default";
}

/**
 * Normalize the request's references, preserving the given order.
 * `references` (ids, weights, roles/annotations) wins over the legacy
 * `referenceUrls` + `referenceWeights` (keyed by URL) pair.
 */
export function normalizeTasteReferences(args: {
  references?: TasteExtractReferenceInput[];
  referenceUrls?: string[];
  referenceWeights?: Record<string, string>;
  limit: number;
}): TasteExtractReference[] {
  if (Array.isArray(args.references) && args.references.length > 0) {
    return args.references
      .filter((ref): ref is TasteExtractReferenceInput & { url: string } =>
        Boolean(ref) && typeof ref.url === "string" && ref.url.trim().length > 0,
      )
      .slice(0, args.limit)
      .map((ref, index) => {
        const explicitRole = ROLES.find((role) => role === ref.role);
        const annotation = typeof ref.annotation === "string" ? ref.annotation.trim() : "";
        const role = explicitRole ?? (annotation ? inferReferenceRole(annotation) : undefined);
        return {
          id: typeof ref.id === "string" && ref.id ? ref.id.slice(0, 120) : `reference-${index + 1}`,
          url: ref.url.trim(),
          weight: toWeight(ref.weight),
          ...(role ? { role } : {}),
        };
      });
  }
  const weights = args.referenceWeights ?? {};
  return (args.referenceUrls ?? [])
    .filter((url) => typeof url === "string" && url.trim().length > 0)
    .slice(0, args.limit)
    .map((url, index) => ({ id: `reference-${index + 1}`, url, weight: toWeight(weights[url]) }));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

/**
 * Cache signature over every input that shapes the extracted profile. References
 * keep their given order (primary-first ordering and weights are meaningful), so
 * re-weighting, re-ordering or a new prompt invalidates the cache.
 */
export function buildTasteSignature(args: {
  contextVersion: number;
  prompt?: string;
  references: TasteExtractReference[];
  existingTokens?: unknown;
  compositionData?: CompositionInput[];
}): string {
  return stableStringify({
    contextVersion: args.contextVersion,
    prompt: args.prompt?.trim() || null,
    references: args.references.map((ref) => ({ url: ref.url, weight: ref.weight, role: ref.role ?? null })),
    existingTokens: args.existingTokens ?? null,
    compositionData: args.compositionData?.map((entry) => ({
      referenceIndex: entry.referenceIndex,
      weight: entry.weight,
      referenceType: entry.analysis.referenceType,
      spacingSystem: entry.analysis.spacingSystem,
      headingToBodyRatio: entry.analysis.headingToBodyRatio,
      density: entry.analysis.density,
    })) ?? null,
  });
}

export function tasteImageLabel(ref: TasteExtractReference, index: number): string {
  return imageLabel({ id: ref.id, weight: ref.weight, roles: ref.role ? [ref.role] : [] }, index);
}

/**
 * One text label + one image block per reference. Primary and role-bearing
 * references are sent at high detail; the rest at low detail.
 */
export function buildTasteImageContent(references: TasteExtractReference[]) {
  return labeledImageBlocks(
    references.map((ref) => ({ id: ref.id, url: ref.url, weight: ref.weight, roles: ref.role ? [ref.role] : [] })),
    (ref) => (ref.weight === "primary" || (ref.roles?.length ?? 0) > 0 ? "high" : "low"),
  );
}
