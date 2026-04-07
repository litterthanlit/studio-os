// Track 9 — pure helpers for component instance overrides (inspector + layers).

import type {
  ComponentInstanceRef,
  ComponentMaster,
  ComponentOverrides,
  DesignNode,
  NodeOverride,
} from "./design-node";
import { findDesignNodeById } from "./design-node";
import { findMaster, isInstanceChild, splitCompositeId } from "./component-resolver";

export function isNonEmptyOverride(o: NodeOverride | undefined): boolean {
  if (!o) return false;
  const hasStyle = Boolean(o.style && Object.keys(o.style).length > 0);
  const hasContent = Boolean(o.content && Object.keys(o.content).length > 0);
  const hasHidden = Boolean(o.hidden && Object.keys(o.hidden).length > 0);
  return hasStyle || hasContent || hasHidden;
}

/** Number of master subtree nodes that have at least one non-empty override entry. */
export function countOverriddenMasterNodes(overrides: ComponentOverrides): number {
  return Object.values(overrides).filter(isNonEmptyOverride).length;
}

export function instanceRefHasAnyOverrides(ref: ComponentInstanceRef): boolean {
  return countOverriddenMasterNodes(ref.overrides) > 0;
}

/** Source instance root id whether the row id is composite (resolved) or raw. */
export function getInstanceRootSourceId(nodeId: string): string {
  if (!isInstanceChild(nodeId)) return nodeId;
  return splitCompositeId(nodeId)[0];
}

/**
 * Resolved-tree row is the visual root of an instance (composite id matching master's root node).
 */
export function isResolvedInstanceSubtreeRoot(
  nodeId: string,
  sourceTree: DesignNode,
  components: ComponentMaster[]
): boolean {
  if (!isInstanceChild(nodeId)) return false;
  const [instanceId, masterNodeId] = splitCompositeId(nodeId);
  const inst = findDesignNodeById(sourceTree, instanceId);
  if (!inst?.componentRef) return false;
  const master = findMaster(components, inst.componentRef.masterId);
  if (!master) return false;
  return master.tree.id === masterNodeId;
}

/** Layer row from resolved tree: this node has overrides on the instance. */
export function resolvedLayerNodeHasOverride(resolvedNodeId: string, sourceTree: DesignNode): boolean {
  if (!isInstanceChild(resolvedNodeId)) return false;
  const [instanceId, masterNodeId] = splitCompositeId(resolvedNodeId);
  const inst = findDesignNodeById(sourceTree, instanceId);
  if (!inst?.componentRef) return false;
  return isNonEmptyOverride(inst.componentRef.overrides[masterNodeId]);
}
