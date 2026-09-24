import { writeCanvasWithRebase } from "@/lib/agent/canvas-write-rebase";
import { buildCanvasSummary } from "@/lib/agent/canvas-agent-ops";
import { BREAKPOINT_WIDTHS } from "@/lib/canvas/compose";
import type { UnifiedCanvasState } from "@/lib/canvas/unified-canvas-state";
import type { EngineStep } from "../types";

/**
 * Agents / benchmarks with a canvas: add the generated artboards server-side
 * (rebasing on revision conflicts). The editor applies outputs itself
 * (REPLACE_SITE), so for it this step only records the outputs.
 */
export const persist: EngineStep<"persist"> = {
  key: "persist",
  async run({ input, deps, checkpoints, progress }) {
    const generated = checkpoints.generate!;
    if (input.target === "editor" || !deps.canvas) return {};

    await progress("writing-canvas");
    const brief = checkpoints.buildBrief!;
    const breakpoint = brief.breakpoint;
    const canvas = deps.canvas;

    const buildOperations = (latest: UnifiedCanvasState) => {
      if (generated.kind === "screen") {
        const name = input.artboardName ?? generated.result.siteName ?? "Generated Screen";
        return [{ type: "add_artboard" as const, name, breakpoint, tree: generated.result.variants[0]!.pageTree }];
      }
      const siteId = `site-${input.projectId.slice(-6)}-${generated.result.plan.map((p) => p.id).join("-").slice(0, 24)}`;
      const artboardWidth = BREAKPOINT_WIDTHS[breakpoint] ?? 1440;
      const baseX = 120 + latest.items.filter((item) => item.kind === "artboard").length * 40;
      return generated.result.screens.map((screen, index) => ({
        type: "add_artboard" as const,
        name: screen.name,
        breakpoint,
        tree: screen.pageTree,
        siteId,
        screenRole: screen.screenRole,
        screenPurpose: screen.screenPurpose,
        x: baseX + index * (artboardWidth + 80),
        y: 100,
      }));
    };

    const write = await writeCanvasWithRebase({
      ...(canvas.initialDoc !== undefined ? { initialDoc: canvas.initialDoc } : {}),
      load: canvas.load,
      save: canvas.save,
      buildOperations,
      onRebase: (attempt) => progress("rebased", `revision conflict; retry ${attempt}`),
    });
    if (write.applied.length === 0 || !write.save) {
      throw new Error(`Failed to add generated artboards: ${write.errors.join("; ")}`);
    }
    const summary = buildCanvasSummary(write.state);
    const added = generated.kind === "screen" ? 1 : generated.result.screens.length;
    return {
      revision: write.save.revision,
      artboardIds: summary.artboards.slice(-added).map((artboard) => artboard.id),
      applied: write.applied,
      summary,
    };
  },
};
