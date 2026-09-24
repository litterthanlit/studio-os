// lib/engine/references.ts
// Canvas reference items → engine references. The editor (its reference
// selection) and agents (all canvas references) both go through this, so the
// same references produce the same brief and taste inputs.

import type { ReferenceItem } from "@/lib/canvas/unified-canvas-state";
import { getEffectiveReferenceWeight } from "@/lib/canvas/unified-canvas-state";
import type { EngineReference } from "./types";

export function engineReferencesFromItems(items: ReferenceItem[]): EngineReference[] {
  return items
    .filter((ref) => Boolean(ref.imageUrl))
    .map((ref) => ({
      id: ref.id,
      url: ref.imageUrl,
      weight: getEffectiveReferenceWeight(ref),
      ...(ref.annotation?.trim() ? { annotation: ref.annotation.trim() } : {}),
      ...(ref.contentHash ? { contentHash: ref.contentHash } : {}),
      ...(ref.roles && ref.roles.length > 0 ? { roles: ref.roles } : {}),
      ...(ref.regions && ref.regions.length > 0 ? { regions: ref.regions } : {}),
    }));
}
