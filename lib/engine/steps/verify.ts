import { validateAndNormalizeDesignTree } from "@/lib/canvas/design-tree-validator";
import type { EngineStep } from "../types";

/**
 * Structural check of every generated tree plus the taste-gate warnings the
 * generator produced. Phase 2 (deterministic checks, judge) extends this step.
 */
export const verify: EngineStep<"verify"> = {
  key: "verify",
  async run({ checkpoints, progress }) {
    await progress("verifying");
    const generated = checkpoints.generate!;
    const trees =
      generated.kind === "screen"
        ? generated.result.variants.map((variant) => ({ name: variant.name, tree: variant.pageTree, warnings: variant.tasteGate?.warnings ?? [] }))
        : generated.result.screens.map((screen) => ({ name: screen.name, tree: screen.pageTree, warnings: screen.tasteGate?.warnings ?? [] }));
    const warnings: string[] = [];
    let valid = 0;
    for (const entry of trees) {
      if (validateAndNormalizeDesignTree(structuredClone(entry.tree)).ok) valid++;
      else warnings.push(`${entry.name}: tree failed validation`);
      warnings.push(...entry.warnings.map((warning) => `${entry.name}: ${warning}`));
    }
    if (valid === 0) throw new Error("Verification failed: no valid DesignNode tree");
    return { ok: true, treeCount: valid, warnings: warnings.slice(0, 40) };
  },
};
