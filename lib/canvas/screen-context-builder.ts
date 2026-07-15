import type { DesignNode } from "./design-node";

export type AppScreenPlanItem = {
  id: string;
  name: string;
  purpose: string;
  screenRole: string;
  keyElements: string[];
};

/**
 * Build sibling context for multi-screen app generation so nav/shell stays consistent.
 */
export function buildScreenSetContext(args: {
  plan: AppScreenPlanItem[];
  currentIndex: number;
  generatedSummaries: Array<{ name: string; summary: string }>;
}): string {
  const { plan, currentIndex, generatedSummaries } = args;
  const current = plan[currentIndex];
  const lines: string[] = [
    `## Multi-Screen App Context`,
    `Generating screen ${currentIndex + 1} of ${plan.length}: "${current.name}" (${current.screenRole})`,
    `Purpose: ${current.purpose}`,
    `Key elements: ${current.keyElements.join(", ")}`,
    "",
    `### Shared shell rules (MUST stay consistent across all screens)`,
    `- Same sidebar nav items and labels on every desktop screen (only active state changes)`,
    `- Same product name / logo treatment`,
    `- Same top bar height, padding, and action button style`,
    `- Same color palette, typography, and border radii`,
    `- Mobile: same tab bar items; only active tab changes per screen`,
    "",
  ];

  if (generatedSummaries.length > 0) {
    lines.push(`### Already generated screens (match their shell)`);
    for (const summary of generatedSummaries) {
      lines.push(`- **${summary.name}**: ${summary.summary}`);
    }
    lines.push("");
  }

  const remaining = plan.slice(currentIndex + 1);
  if (remaining.length > 0) {
    lines.push(`### Upcoming screens (leave nav slots for these)`);
    for (const screen of remaining) {
      lines.push(`- ${screen.name} (${screen.screenRole}): ${screen.purpose}`);
    }
  }

  return lines.join("\n");
}

export function summarizeScreenTree(tree: { name?: string; children?: Array<{ name?: string; type: string }> }): string {
  const sectionNames = (tree.children ?? [])
    .slice(0, 6)
    .map((child) => child.name || child.type)
    .join(", ");
  return `Root "${tree.name ?? "Screen"}" with sections: ${sectionNames || "none"}`;
}
