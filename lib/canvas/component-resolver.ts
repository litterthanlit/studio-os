import {
  type DesignNode,
  type ComponentMaster,
  type NodeOverride,
  ALLOWED_STYLE_FIELDS,
  findDesignNodeById,
  cloneDesignNodeWithIdMap,
} from "./design-node";
import { getBuiltinMaster } from "./component-builtins";

// --- ID helpers ---

const COMPOSITE_SEPARATOR = "::";

export function isInstanceChild(nodeId: string): boolean {
  return nodeId.includes(COMPOSITE_SEPARATOR);
}

export function splitCompositeId(nodeId: string): [instanceId: string, masterNodeId: string] {
  const idx = nodeId.indexOf(COMPOSITE_SEPARATOR);
  if (idx === -1) throw new Error(`Not a composite ID: ${nodeId}`);
  return [nodeId.slice(0, idx), nodeId.slice(idx + COMPOSITE_SEPARATOR.length)];
}

export function makeCompositeId(instanceId: string, masterNodeId: string): string {
  return `${instanceId}${COMPOSITE_SEPARATOR}${masterNodeId}`;
}

// --- Override filtering ---

export function filterAllowedOverrides(override: NodeOverride): NodeOverride {
  const result: NodeOverride = {};
  if (override.style) {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(override.style)) {
      if (ALLOWED_STYLE_FIELDS.has(key)) {
        filtered[key] = value;
      } else {
        console.warn(`[Track3] Rejected override for forbidden field: ${key}`);
      }
    }
    if (Object.keys(filtered).length > 0) {
      result.style = filtered as NodeOverride["style"];
    }
  }
  if (override.content) result.content = override.content;
  if (override.hidden) result.hidden = override.hidden;
  return result;
}

// --- Master lookup ---

export function findMaster(
  components: ComponentMaster[],
  masterId: string
): ComponentMaster | null {
  return components.find((c) => c.id === masterId) ?? getBuiltinMaster(masterId);
}

/**
 * Base tree for an instance before composite IDs and overrides.
 * Preset trees are expected to use the same master node IDs as `master.tree`.
 */
export function getInstanceBaseTree(
  master: ComponentMaster,
  presetId: string | null | undefined
): DesignNode {
  if (!presetId) return master.tree;
  const preset = master.presets?.find((p) => p.id === presetId);
  return preset?.tree ?? master.tree;
}

/** Stable fingerprint for memoizing `resolveTree` when master data is logically unchanged. */
export function computeComponentsResolveEpoch(
  components: readonly ComponentMaster[]
): string {
  return components
    .map((c) => {
      const presetKeys = (c.presets ?? [])
        .map((p) => p.id)
        .sort()
        .join(",");
      return `${c.id}:${c.version}:${presetKeys}`;
    })
    .join("|");
}

// --- Resolution ---

export function resolveInstance(
  instanceNode: DesignNode,
  master: ComponentMaster
): DesignNode {
  const ref = instanceNode.componentRef!;
  const baseTree = getInstanceBaseTree(master, ref.presetId);
  const { tree: clone } = cloneDesignNodeWithIdMap(
    baseTree,
    (masterNodeId) => makeCompositeId(instanceNode.id, masterNodeId)
  );

  // Apply overrides
  for (const [masterNodeId, override] of Object.entries(ref.overrides)) {
    const resolvedId = makeCompositeId(instanceNode.id, masterNodeId);
    const target = findDesignNodeById(clone, resolvedId);
    if (!target) continue; // orphaned override — skip silently
    if (override.style) {
      target.style = { ...target.style, ...override.style };
    }
    if (override.content) {
      target.content = { ...(target.content ?? {}), ...override.content };
    }
    if (override.hidden) {
      target.hidden = { ...target.hidden, ...override.hidden };
    }
  }

  return clone;
}

/**
 * Walk a DesignNode tree and resolve all instance nodes.
 * Returns a NEW tree — does not mutate the source.
 * Non-instance nodes are shallow-cloned (children array is new, node objects are shared).
 */
export function resolveTree(
  tree: DesignNode,
  components: ComponentMaster[]
): DesignNode {
  if (tree.componentRef) {
    const master = findMaster(components, tree.componentRef.masterId);
    if (!master) {
      // Missing master — return a placeholder
      return { ...tree, name: `${tree.name} (missing component)` };
    }
    return resolveInstance(tree, master);
  }

  if (!tree.children || tree.children.length === 0) return tree;

  const resolvedChildren = tree.children.map((child) => resolveTree(child, components));
  // Only create a new node if children actually changed
  if (resolvedChildren.every((c, i) => c === tree.children![i])) return tree;
  return { ...tree, children: resolvedChildren };
}

/**
 * Resolve an instance and bake it into a regular DesignNode tree.
 * Fresh IDs (no composite IDs), no componentRef. Used for detach and delete-master.
 */
export function bakeInstance(
  instanceNode: DesignNode,
  master: ComponentMaster
): DesignNode {
  const resolved = resolveInstance(instanceNode, master);
  // Re-clone with fresh random IDs to strip composite IDs
  const { tree: baked } = cloneDesignNodeWithIdMap(resolved, () => {
    return `${resolved.type}-${Math.random().toString(36).slice(2, 10)}`;
  });
  // Ensure no componentRef leaks
  function stripComponentRef(node: DesignNode): DesignNode {
    if (node.componentRef) {
      const { componentRef: _, ...rest } = node;
      return { ...rest, children: rest.children?.map(stripComponentRef) } as DesignNode;
    }
    if (node.children) {
      return { ...node, children: node.children.map(stripComponentRef) };
    }
    return node;
  }
  return stripComponentRef(baked);
}
