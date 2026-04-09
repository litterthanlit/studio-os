import type { DesignNode } from "./design-node";

/**
 * Build a summary of sibling sections for section-level regeneration.
 * Tells the AI what comes before/after the section being regenerated.
 */
export function buildSectionContext(
  rootChildren: DesignNode[],
  targetNodeId: string,
): { above: string; below: string; targetName: string } {
  const targetIndex = rootChildren.findIndex((c) => c.id === targetNodeId);
  if (targetIndex === -1) {
    return { above: "None (first section)", below: "None (last section)", targetName: "Section" };
  }

  const target = rootChildren[targetIndex];
  const above = targetIndex > 0 ? summarizeSection(rootChildren[targetIndex - 1]) : "None (first section)";
  const below = targetIndex < rootChildren.length - 1 ? summarizeSection(rootChildren[targetIndex + 1]) : "None (last section)";

  return { above, below, targetName: target.name || "Section" };
}

function summarizeSection(node: DesignNode): string {
  const parts: string[] = [];
  parts.push(`Name: "${node.name || "Untitled"}"`);

  if (node.style.display) parts.push(`Layout: ${node.style.display}`);
  if (node.style.gridTemplate) parts.push(`Grid: ${node.style.gridTemplate}`);
  if (node.style.background) parts.push(`Background: ${node.style.background}`);
  if (node.style.coverImage) parts.push(`Has cover image`);

  const childTypes = (node.children || []).map((c) => c.type);
  const typeCounts: Record<string, number> = {};
  childTypes.forEach((t) => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
  const typesSummary = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");
  if (typesSummary) parts.push(`Contains: ${typesSummary}`);

  const firstText = (node.children || []).find((c) => c.type === "text");
  if (firstText?.content?.text) {
    const preview = firstText.content.text.slice(0, 60);
    parts.push(`First text: "${preview}${firstText.content.text.length > 60 ? "..." : ""}"`);
  }

  return parts.join(". ");
}
