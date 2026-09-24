// lib/intent/measure/image.ts
// Decode any image input (URL, data URL, buffer) to raw RGB pixels with sharp,
// optionally downsampled. Server-only.

import sharp from "sharp";

export type RawImage = { data: Uint8Array; width: number; height: number; channels: 3 };
export type ImageInput = Buffer | Uint8Array | string | RawImage;

async function toBuffer(input: Buffer | Uint8Array | string): Promise<Buffer> {
  if (typeof input !== "string") return Buffer.from(input);
  if (input.startsWith("data:")) {
    const base64 = input.slice(input.indexOf(",") + 1);
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(input);
  if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Decode to RGB. `maxWidth` downsamples, preserving aspect ratio. `kernel:
 * "nearest"` keeps only colors present in the source (no resampling blends),
 * which is what palette measurement needs.
 */
export async function decodeImage(
  input: ImageInput,
  maxWidth?: number,
  kernel: "nearest" | "cubic" = "cubic",
): Promise<RawImage> {
  if (typeof input === "object" && "data" in input && "channels" in input) return input as RawImage;
  let pipeline = sharp(await toBuffer(input as Buffer | Uint8Array | string)).removeAlpha().toColourspace("srgb");
  if (maxWidth) pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true, kernel });
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height, channels: 3 };
}

/** Original pixel width of an input (for scaling downsampled measurements back). */
export async function imageWidth(input: ImageInput): Promise<number> {
  if (typeof input === "object" && "data" in input && "channels" in input) return (input as RawImage).width;
  const meta = await sharp(await toBuffer(input as Buffer | Uint8Array | string)).metadata();
  return meta.width ?? 0;
}
