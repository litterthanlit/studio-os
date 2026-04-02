import { NextRequest, NextResponse } from "next/server";
import { scoreRealtimeFidelity } from "@/lib/canvas/taste-evaluator";
import { scoreDesignRealtimeFidelity } from "@/lib/canvas/design-taste-evaluator";
import type { PageNode } from "@/lib/canvas/compose";
import type { DesignNode } from "@/lib/canvas/design-node";
import type { TasteProfile } from "@/types/taste-profile";

/**
 * POST /api/benchmark/score
 *
 * Scores a PageNode or DesignNode tree against a TasteProfile using the
 * appropriate real-time fidelity scorer.
 *
 * Detection: DesignNode trees have a `type` field on the root that is one of
 * the 5 universal types ("frame", "text", "image", "button", "divider").
 * PageNode trees have `type: "page"` or other legacy types.
 *
 * Used by the benchmark harness to score RAW (no-taste) outputs
 * against the reference taste profile for comparison.
 */

const DESIGN_NODE_TYPES = new Set(["frame", "text", "image", "button", "divider"]);

function isDesignNode(tree: Record<string, unknown>): boolean {
  return typeof tree.type === "string" && DESIGN_NODE_TYPES.has(tree.type) && tree.type !== "page";
}

export async function POST(req: NextRequest) {
  try {
    const { pageTree, tasteProfile } = (await req.json()) as {
      pageTree: Record<string, unknown>;
      tasteProfile: TasteProfile;
    };

    if (!pageTree || !tasteProfile) {
      return NextResponse.json(
        { error: "pageTree and tasteProfile are required" },
        { status: 400 }
      );
    }

    const designNode = isDesignNode(pageTree);
    console.log(`[BENCHMARK SCORE] Tree type: ${designNode ? "DesignNode" : "PageNode"}`);

    const score = designNode
      ? await scoreDesignRealtimeFidelity(pageTree as unknown as DesignNode, tasteProfile)
      : await scoreRealtimeFidelity(pageTree as unknown as PageNode, tasteProfile);

    return NextResponse.json(score);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    console.error("[BENCHMARK SCORE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
