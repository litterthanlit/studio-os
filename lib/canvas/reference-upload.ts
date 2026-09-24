// lib/canvas/reference-upload.ts
// Canvas image uploads: downscale to a 2048px longest side, hash, and upload to
// Convex file storage so the canvas document holds a URL instead of a data URL.
// Browser-only helpers (canvas, crypto.subtle) with injectable transport.

export const MAX_UPLOAD_LONGEST_SIDE = 2048;

export type PreparedImage = {
  blob: Blob;
  contentType: string;
  width: number;
  height: number;
  contentHash: string;
};

export type UploadedCanvasAsset = {
  imageUrl: string;
  storageId?: string;
  contentHash: string;
  width: number;
  height: number;
};

export type CanvasAssetTransport = {
  generateUploadUrl: () => Promise<string>;
  register: (args: {
    storageId: string;
    contentHash: string;
    width: number;
    height: number;
  }) => Promise<{ url: string; storageId: string; contentHash: string }>;
  /** POST the bytes; defaults to fetch. */
  post?: (uploadUrl: string, blob: Blob, contentType: string) => Promise<{ storageId: string }>;
};

/** Scale so the longest side is at most `maxSide`; never upscale. */
export function fitWithin(width: number, height: number, maxSide = MAX_UPLOAD_LONGEST_SIDE) {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest <= 0) return { width, height, scaled: false };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scaled: true };
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match) throw new Error("Not a data URL");
  const contentType = match[1] || "application/octet-stream";
  const payload = match[3] ?? "";
  const bytes = match[2]
    ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  return new Blob([bytes], { type: contentType });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Failed to read image"));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

/** Decode, downscale to MAX_UPLOAD_LONGEST_SIDE, re-encode (GIF/SVG pass through), hash. */
export async function prepareImageForUpload(input: Blob): Promise<PreparedImage> {
  const type = input.type || "image/png";
  const passthrough = type === "image/gif" || type === "image/svg+xml";
  const bitmap = await createImageBitmap(input);
  try {
    const target = fitWithin(bitmap.width, bitmap.height);
    if (passthrough || !target.scaled) {
      return { blob: input, contentType: type, width: bitmap.width, height: bitmap.height, contentHash: await sha256Hex(input) };
    }
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D unavailable");
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    const outType = type === "image/png" || type === "image/webp" ? type : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), outType, 0.9),
    );
    return { blob, contentType: outType, width: target.width, height: target.height, contentHash: await sha256Hex(blob) };
  } finally {
    bitmap.close();
  }
}

async function defaultPost(uploadUrl: string, blob: Blob, contentType: string) {
  const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": contentType }, body: blob });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = (await res.json()) as { storageId?: string };
  if (!data.storageId) throw new Error("Upload returned no storageId");
  return { storageId: data.storageId };
}

/**
 * Upload a prepared image. Without a transport (signed out / local-only), fall
 * back to a downscaled data URL so the local canvas still works.
 */
export async function uploadPreparedImage(
  prepared: PreparedImage,
  transport: CanvasAssetTransport | null,
): Promise<UploadedCanvasAsset> {
  if (!transport) {
    return {
      imageUrl: await blobToDataUrl(prepared.blob),
      contentHash: prepared.contentHash,
      width: prepared.width,
      height: prepared.height,
    };
  }
  const uploadUrl = await transport.generateUploadUrl();
  const { storageId } = await (transport.post ?? defaultPost)(uploadUrl, prepared.blob, prepared.contentType);
  const registered = await transport.register({
    storageId,
    contentHash: prepared.contentHash,
    width: prepared.width,
    height: prepared.height,
  });
  return {
    imageUrl: registered.url,
    storageId: registered.storageId,
    contentHash: registered.contentHash,
    width: prepared.width,
    height: prepared.height,
  };
}

export async function uploadCanvasImage(
  input: Blob,
  transport: CanvasAssetTransport | null,
): Promise<UploadedCanvasAsset> {
  return uploadPreparedImage(await prepareImageForUpload(input), transport);
}

export function isDataUrl(value: string | undefined | null): value is string {
  return typeof value === "string" && value.startsWith("data:");
}
