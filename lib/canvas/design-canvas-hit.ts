import { findDesignNodeById, findDesignNodeParent, type DesignNode } from "./design-node";
import { getNodeDepth } from "./multi-select-helpers";

function isValidDrawParent(node: DesignNode): boolean {
  return node.type === "frame" || node.isGroup === true;
}

/**
 * Among all nodes hit at a client point, pick the valid parent (frame/group)
 * with the greatest depth in the tree — the innermost container under the cursor.
 */
export function resolveDeepestValidParentUnderClientPoint(
  tree: DesignNode,
  clientX: number,
  clientY: number
): { nodeId: string; element: HTMLElement } | null {
  const seen = new Set<string>();
  let best: { nodeId: string; element: HTMLElement; depth: number } | null = null;

  const list = document.elementsFromPoint(clientX, clientY);
  for (const raw of list) {
    const wrap = (raw as HTMLElement).closest?.("[data-node-id]");
    if (!wrap) continue;
    const id = wrap.getAttribute("data-node-id");
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const node = findDesignNodeById(tree, id);
    if (!node || !isValidDrawParent(node)) continue;

    const depth = getNodeDepth(id, tree);
    if (depth < 0) continue;
    if (!best || depth > best.depth) {
      best = { nodeId: id, element: wrap as HTMLElement, depth };
    }
  }

  return best ? { nodeId: best.nodeId, element: best.element } : null;
}

/**
 * DOM matches `resolvedTree` (instances use composite IDs). Mutations use `rawTree`.
 * Walk from the deepest hit up until we find a node id that exists in `rawTree`, then
 * use that parent's DOM node for local coordinates.
 */
export function resolveInsertTargetForRawTree(
  rawTree: DesignNode,
  resolvedTree: DesignNode,
  clientX: number,
  clientY: number,
  containerEl: HTMLElement | null
): { parentId: string; offsetElement: HTMLElement } | null {
  const hit = resolveDeepestValidParentUnderClientPoint(
    resolvedTree,
    clientX,
    clientY
  );
  if (!hit) return null;

  let nodeId: string | null = hit.nodeId;
  for (let step = 0; step < 256 && nodeId; step++) {
    if (findDesignNodeById(rawTree, nodeId)) {
      const escaped = nodeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const offsetEl =
        (containerEl?.querySelector(`[data-node-id="${escaped}"]`) as HTMLElement | null) ??
        hit.element;
      return { parentId: nodeId, offsetElement: offsetEl };
    }
    const p = findDesignNodeParent(resolvedTree, nodeId);
    nodeId = p ? p.id : null;
  }

  const rootEscaped = rawTree.id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const offsetEl =
    (containerEl?.querySelector(`[data-node-id="${rootEscaped}"]`) as HTMLElement | null) ??
    hit.element;
  return { parentId: rawTree.id, offsetElement: offsetEl };
}
