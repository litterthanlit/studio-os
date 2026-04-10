import { findDesignNodeById, findDesignNodeParent, type DesignNode } from "./design-node";

export type DesignPasteTarget = {
  parentNodeId?: string;
  insertAfterId?: string | null;
};

/**
 * Where Cmd+V should insert relative to the current selection (V6 DesignNode tree).
 * - Selected container → append after its last child inside that container.
 * - Selected non-container → sibling after selection under the same parent.
 * - Top-level selection → root children, after selected sibling.
 */
export function computeDesignPasteTarget(
  tree: DesignNode,
  selectedNodeId: string | null | undefined
): DesignPasteTarget {
  if (!selectedNodeId) return {};
  const node = findDesignNodeById(tree, selectedNodeId);
  if (!node) return {};

  const isContainer = node.type === "frame" || node.isGroup === true;
  if (isContainer) {
    const ch = node.children ?? [];
    if (ch.length === 0) return { parentNodeId: selectedNodeId };
    return { parentNodeId: selectedNodeId, insertAfterId: ch[ch.length - 1]!.id };
  }

  const parent = findDesignNodeParent(tree, selectedNodeId);
  if (!parent || parent.id === tree.id) {
    return { insertAfterId: selectedNodeId };
  }
  return { parentNodeId: parent.id, insertAfterId: selectedNodeId };
}
