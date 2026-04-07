"use client";

/**
 * Track 10 Phase A — ZIP matches Copy HTML byte-for-byte in index.html (spec §6).
 */

export async function buildExportZipBlob(html: string): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("index.html", html);
  zip.file(
    "README.md",
    "Open `index.html` in a web browser. External images load from the network.\n"
  );
  return zip.generateAsync({ type: "blob" });
}
