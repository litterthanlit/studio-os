import type { ArtboardItem, CanvasItem, UnifiedCanvasState } from "./unified-canvas-state";
import type { DesignNode, DesignNodeStyle } from "./design-node";

/**
 * Migrate old two-artboard-per-site projects to single-artboard model.
 * Diffs mobile artboard styles into responsiveOverrides.mobile on the desktop artboard.
 * Runs once per project load — guarded by schemaVersion.
 *
 * NOTE: loadUnifiedCanvas() always normalizes schemaVersion to 4, so we cannot
 * use schemaVersion as a guard here. Instead we detect old structure by checking
 * whether any siteId has more than one artboard — that is the old two-artboard
 * model. Projects already on the single-artboard model will have at most one
 * artboard per siteId, so the loop is a no-op.
 */
export function migrateToSingleArtboard(state: UnifiedCanvasState): UnifiedCanvasState {
  // Group artboards by siteId
  const siteGroups = new Map<string, ArtboardItem[]>();
  for (const item of state.items) {
    if (item.kind !== "artboard") continue;
    const group = siteGroups.get(item.siteId) ?? [];
    group.push(item);
    siteGroups.set(item.siteId, group);
  }

  // Check whether any site has multiple artboards (old model)
  const hasMultiArtboardSites = Array.from(siteGroups.values()).some((g) => g.length > 1);
  if (!hasMultiArtboardSites) return state;

  // Find sites with multiple artboards and merge them
  const artboardIdsToRemove = new Set<string>();
  let items = [...state.items];

  for (const [siteId, artboards] of siteGroups) {
    if (artboards.length <= 1) continue;

    const desktop = artboards.find((a) => a.breakpoint === "desktop");
    const mobile = artboards.find((a) => a.breakpoint === "mobile");

    if (!desktop && mobile) {
      // Only mobile exists — promote to desktop
      items = items.map((item) =>
        item.id === mobile.id
          ? ({ ...mobile, breakpoint: "desktop" as const, name: "Desktop 1440", width: 1440 } as ArtboardItem)
          : item
      );
      console.log(`[migrate-responsive] Site ${siteId}: promoted mobile artboard to desktop`);
      continue;
    }

    if (!desktop || !mobile) continue;

    // Diff mobile tree into desktop's responsiveOverrides.mobile
    const desktopTree = desktop.pageTree as DesignNode;
    const mobileTree = mobile.pageTree as DesignNode;

    // Only attempt deep merge if both trees are V6 DesignNodes (have .type field)
    const isDesignNode = (n: unknown): n is DesignNode =>
      !!n && typeof n === "object" && "type" in (n as object) && "style" in (n as object);

    const mergedTree = isDesignNode(desktopTree) && isDesignNode(mobileTree)
      ? mergeOverrides(desktopTree, mobileTree)
      : desktopTree; // Legacy PageNode trees — keep desktop as-is

    items = items.map((item) =>
      item.id === desktop.id ? ({ ...desktop, pageTree: mergedTree } as ArtboardItem) : item
    );
    artboardIdsToRemove.add(mobile.id);

    console.log(`[migrate-responsive] Site ${siteId}: merged to single-artboard responsive model`);
  }

  // Remove redundant mobile artboards
  items = items.filter((item) => !artboardIdsToRemove.has(item.id));

  return {
    ...state,
    items,
    activeBreakpoint: state.activeBreakpoint ?? "desktop",
  };
}

/**
 * Walk two parallel DesignNode trees and merge style diffs into responsiveOverrides.mobile.
 * Existing overrides on the desktop tree are preserved (win over inferred diffs).
 */
function mergeOverrides(desktop: DesignNode, mobile: DesignNode): DesignNode {
  const styleKeys = Object.keys(mobile.style ?? {}) as (keyof DesignNodeStyle)[];
  const diffs: Partial<DesignNodeStyle> = {};

  for (const key of styleKeys) {
    const dVal = (desktop.style as Record<string, unknown>)?.[key];
    const mVal = (mobile.style as Record<string, unknown>)?.[key];
    if (JSON.stringify(dVal) !== JSON.stringify(mVal)) {
      (diffs as Record<string, unknown>)[key] = mVal;
    }
  }

  // Merge with existing overrides (existing overrides win)
  const existingOverrides = desktop.responsiveOverrides?.mobile ?? {};
  const mergedMobileOverrides =
    Object.keys(diffs).length > 0 || Object.keys(existingOverrides).length > 0
      ? { ...diffs, ...existingOverrides }
      : undefined;

  // Recurse children by matching ids
  const mergedChildren = desktop.children?.map((desktopChild) => {
    const mobileChild = mobile.children?.find((mc) => mc.id === desktopChild.id);
    if (!mobileChild) return desktopChild;
    return mergeOverrides(desktopChild, mobileChild);
  });

  // Mobile-only nodes (exist in mobile but not in desktop) — hidden on desktop
  const desktopIds = new Set(desktop.children?.map((c) => c.id) ?? []);
  const mobileOnly = (mobile.children ?? [])
    .filter((mc) => !desktopIds.has(mc.id))
    .map((mc) => ({
      ...mc,
      hidden: { ...mc.hidden, desktop: true },
    }));

  return {
    ...desktop,
    responsiveOverrides: mergedMobileOverrides
      ? { ...desktop.responsiveOverrides, mobile: mergedMobileOverrides }
      : desktop.responsiveOverrides,
    children: [...(mergedChildren ?? []), ...mobileOnly],
  };
}
