// lib/canvas/design-node-migration.ts
// One-time migration: "auto" → "hug" on width/height in stored DesignNode trees.
// Runs on app boot, version-gated to execute exactly once.

import type { DesignNode } from "./design-node";
import { isDesignNodeTree } from "./compose";

const MIGRATION_KEY = "studio-os:migration-v2-hug";
const CANVAS_V3_PREFIX = "studio-os:canvas-v3:";
const LEGACY_COMPOSE_PREFIX = "studio-os:compose-workspace:";
const LEGACY_SESSION_PREFIX = "studio-os:canvas-session:";
const PROJECT_STATE_PREFIX = "studio-os:project-state:";
const COMPONENT_LIBRARY_KEY = "studio-os:component-library";

/** Walk a DesignNode tree and replace "auto" with "hug" on width/height. Returns true if any changes were made. */
function migrateNodeAutoToHug(node: DesignNode): boolean {
  let changed = false;

  // Migrate base style
  if ((node.style.width as string) === "auto") {
    (node.style as Record<string, unknown>).width = "hug";
    changed = true;
  }
  if ((node.style.height as string) === "auto") {
    (node.style as Record<string, unknown>).height = "hug";
    changed = true;
  }

  // Migrate responsive overrides
  if (node.responsiveOverrides) {
    for (const bp of Object.keys(node.responsiveOverrides) as Array<keyof typeof node.responsiveOverrides>) {
      const overrides = node.responsiveOverrides[bp];
      if (overrides) {
        if ((overrides.width as string) === "auto") {
          (overrides as Record<string, unknown>).width = "hug";
          changed = true;
        }
        if ((overrides.height as string) === "auto") {
          (overrides as Record<string, unknown>).height = "hug";
          changed = true;
        }
      }
    }
  }

  // Recurse children
  if (node.children) {
    for (const child of node.children) {
      if (migrateNodeAutoToHug(child)) changed = true;
    }
  }

  return changed;
}

/** Run the auto→hug migration on all stored canvas states and the component library. */
export function runAutoToHugMigration(): void {
  // Version gate — only run once
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY)) return;

  let totalMigrated = 0;

  // 1. Migrate all canvas-v3 states
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(CANVAS_V3_PREFIX)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const state = JSON.parse(raw);
      let stateChanged = false;

      // Walk all items looking for artboards with DesignNode trees
      if (Array.isArray(state.items)) {
        for (const item of state.items) {
          if (item.kind === "artboard" && item.pageTree && isDesignNodeTree(item.pageTree)) {
            if (migrateNodeAutoToHug(item.pageTree)) {
              stateChanged = true;
              totalMigrated++;
            }
          }
        }
      }

      if (stateChanged) {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {
      // Skip corrupted entries
    }
  }

  // 2. Migrate legacy sources that migrateToV3() can still read.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const isLegacyCompose = key.startsWith(LEGACY_COMPOSE_PREFIX);
    const isLegacySession = key.startsWith(LEGACY_SESSION_PREFIX);
    const isProjectState = key.startsWith(PROJECT_STATE_PREFIX);
    if (!isLegacyCompose && !isLegacySession && !isProjectState) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      let changed = false;

      // Resolve artboards from the source-specific path:
      // compose-workspace: { artboards: [...] }
      // canvas-session:    { composeDocument: { artboards: [...] } }
      // project-state:     { canvas: { composeDocument: { artboards: [...] } } }
      const artboards: unknown[] =
        data?.artboards ??
        data?.composeDocument?.artboards ??
        data?.canvas?.composeDocument?.artboards ??
        [];

      for (const ab of artboards) {
        const artboard = ab as Record<string, unknown>;
        if (artboard.pageTree && isDesignNodeTree(artboard.pageTree as any)) {
          if (migrateNodeAutoToHug(artboard.pageTree as DesignNode)) {
            changed = true;
            totalMigrated++;
          }
        }
      }

      if (changed) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch {
      // Skip corrupted entries
    }
  }

  // 3. Migrate component library
  try {
    const raw = localStorage.getItem(COMPONENT_LIBRARY_KEY);
    if (raw) {
      const components = JSON.parse(raw);
      let libChanged = false;
      if (Array.isArray(components)) {
        for (const comp of components) {
          if (comp.node && migrateNodeAutoToHug(comp.node)) {
            libChanged = true;
            totalMigrated++;
          }
        }
      }
      if (libChanged) {
        localStorage.setItem(COMPONENT_LIBRARY_KEY, JSON.stringify(components));
      }
    }
  } catch {
    // Skip corrupted library
  }

  // Stamp version flag
  localStorage.setItem(MIGRATION_KEY, new Date().toISOString());

  if (totalMigrated > 0) {
    console.log(`[Track2 Migration] Migrated ${totalMigrated} trees: "auto" → "hug"`);
  }
}
