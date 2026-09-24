import { createHash } from "node:crypto";
import type { EngineStep, ResolvedAsset } from "../types";

/**
 * Normalize references into assets with a stable content key: the uploaded
 * bytes' SHA-256 when known, else a hash of the URL. Non-muted references come
 * first, primary before default (the order generation and taste extraction see).
 */
export const resolveAssets: EngineStep<"resolveAssets"> = {
  key: "resolveAssets",
  async run({ input, progress }) {
    await progress("loading-context", `${input.references.length} reference(s)`);
    const rank = (weight: string) => (weight === "primary" ? 0 : weight === "default" ? 1 : 2);
    const assets: ResolvedAsset[] = input.references
      .filter((ref) => typeof ref.url === "string" && ref.url.trim().length > 0)
      .map((ref, index) => ({ ref, index }))
      .sort((a, b) => rank(a.ref.weight) - rank(b.ref.weight) || a.index - b.index)
      .map(({ ref }) => ({
        ...ref,
        hash: ref.contentHash && /^[a-f0-9]{64}$/.test(ref.contentHash)
          ? ref.contentHash
          : createHash("sha256").update(ref.url).digest("hex"),
      }));
    return { assets };
  },
};
