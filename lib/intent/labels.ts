// lib/intent/labels.ts
// Every image in every model call is labelled with its id, weight and role
// (master plan 1.4), e.g. "Image 3 · ref-abc · primary · role: typography".

import type OpenAI from "openai";
import { imageUrlBlock } from "@/lib/ai/model-router";

export type LabeledImageRef = {
  id: string;
  url: string;
  weight?: "primary" | "default" | "muted";
  roles?: string[];
};

export function imageLabel(ref: Omit<LabeledImageRef, "url">, index: number): string {
  const roles = (ref.roles ?? []).filter((role) => role && role !== "ignore");
  return [
    `Image ${index + 1}`,
    ref.id,
    ref.weight ?? "default",
    ...(roles.length > 0 ? [`role: ${roles.join(", ")}`] : []),
  ].join(" · ");
}

/** Interleaved label + image content parts. */
export function labeledImageBlocks(
  refs: LabeledImageRef[],
  detail: (ref: LabeledImageRef) => "low" | "high" | "auto" = () => "low",
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  return refs.flatMap((ref, index) => [
    { type: "text" as const, text: imageLabel(ref, index) },
    imageUrlBlock(ref.url, detail(ref)),
  ]);
}

/**
 * Labelled blocks for a generation call's reference URLs. `references` runs in
 * the same order as `urls` (the engine sends both, primary first); a URL
 * without a matching entry is labelled by position only.
 */
export function labeledReferenceBlocks(
  urls: string[],
  references: Array<{ id?: string; weight?: LabeledImageRef["weight"]; roles?: string[] }> = [],
  detail: "low" | "high" | "auto" = "low",
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  return labeledImageBlocks(
    urls.map((url, index) => ({
      id: references[index]?.id ?? `reference-${index + 1}`,
      url,
      weight: references[index]?.weight,
      roles: references[index]?.roles,
    })),
    () => detail,
  );
}
